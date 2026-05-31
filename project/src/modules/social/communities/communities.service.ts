/**
 * =============================================================================
 * CommunitiesService - خدمة المجتمعات
 * =============================================================================
 * توفر إنشاء وإدارة المجتمعات (عامة، خاصة، جيم، creator، تحديات).
 * تنشر أحداثاً عبر EventBus عند الانضمام والمغادرة.
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Like, DataSource, IsNull } from 'typeorm';
import { Community, CommunityType, CommunityStatus } from './community.entity';
import {
  CommunityMember,
  CommunityMemberRole,
  MembershipStatus,
} from './community-member.entity';
import { CommunityPost } from './community-post.entity';
import { EventBusService } from '../../../core/event-bus/event-bus.service';
import { AuditService } from '../../../core/audit/audit.service';
import {
  CreateCommunityDto,
  UpdateCommunityDto,
  MemberFiltersDto,
  PinPostDto,
} from './communities.dto';

@Injectable()
export class CommunitiesService {
  private readonly logger = new Logger(CommunitiesService.name);
  private readonly MODULE_NAME = 'social.communities';

  constructor(
    @InjectRepository(Community)
    private readonly communityRepo: Repository<Community>,
    @InjectRepository(CommunityMember)
    private readonly memberRepo: Repository<CommunityMember>,
    @InjectRepository(CommunityPost)
    private readonly communityPostRepo: Repository<CommunityPost>,
    private readonly eventBus: EventBusService,
    private readonly auditService: AuditService,
    private readonly dataSource: DataSource,
  ) {}

  // ============================================================================
  // CRUD Operations
  // ============================================================================

  /** إنشاء مجتمع جديد */
  async createCommunity(userId: string, dto: CreateCommunityDto): Promise<Community> {
    // التحقق من عدم وجود slug مكرر
    const existing = await this.communityRepo.findOne({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new ConflictException('Community with this slug already exists');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // ─── إنشاء المجتمع ───
      const community = this.communityRepo.create({
        name: dto.name,
        slug: dto.slug,
        description: dto.description || null,
        type: dto.type,
        cover_image: dto.coverImage || null,
        rules: dto.rules || null,
        settings: dto.settings || null,
        status: CommunityStatus.ACTIVE,
        created_by: userId,
        member_count: 1,
        post_count: 0,
      });

      const saved = await queryRunner.manager.save(community);

      // ─── إضافة المنشئ كـ ADMIN ───
      const member = this.memberRepo.create({
        community_id: saved.id,
        user_id: userId,
        role: CommunityMemberRole.ADMIN,
        membership_status: MembershipStatus.APPROVED,
      });
      await queryRunner.manager.save(member);

      await queryRunner.commitTransaction();

      // ─── نشر حدث ───
      await this.eventBus.publishSimple(
        'COMMUNITY_CREATED' as any,
        {
          community_id: saved.id,
          user_id: userId,
          type: saved.type,
          name: saved.name,
        },
        userId,
        this.MODULE_NAME,
      );

      // ─── Audit Log ───
      await this.auditService.logSimple('COMMUNITY_CREATED', userId, 'COMMUNITY', saved.id);

      return saved;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /** تحديث مجتمع */
  async updateCommunity(
    userId: string,
    communityId: string,
    dto: UpdateCommunityDto,
  ): Promise<Community> {
    const community = await this.getCommunityOrFail(communityId);

    // التحقق من الصلاحيات (ADMIN فقط)
    await this.requireAdmin(userId, communityId);

    const updateData: Partial<Community> = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.coverImage !== undefined) updateData.cover_image = dto.coverImage;
    if (dto.rules !== undefined) updateData.rules = dto.rules;
    if (dto.settings !== undefined) updateData.settings = dto.settings;

    await this.communityRepo.update(communityId, updateData as any);

    return this.getCommunityOrFail(communityId);
  }

  /** حذف مجتمع (soft delete) */
  async deleteCommunity(userId: string, communityId: string): Promise<void> {
    const community = await this.getCommunityOrFail(communityId);

    if (community.created_by !== userId) {
      throw new ForbiddenException('Only the creator can delete the community');
    }

    await this.communityRepo.softDelete(communityId);

    await this.auditService.logSimple('COMMUNITY_DELETED', userId, 'COMMUNITY', communityId);
  }

  /** الحصول على مجتمع بمعرفه */
  async getCommunityById(communityId: string, userId?: string): Promise<Community> {
    const community = await this.getCommunityOrFail(communityId);

    // إضافة معلومات العضوية إذا طلبها مستخدم مسجل
    if (userId) {
      const member = await this.memberRepo.findOne({
        where: { community_id: communityId, user_id: userId },
      });
      (community as any).isMember = !!member;
      (community as any).userRole = member?.role || null;
    }

    return community;
  }

  /** البحث في المجتمعات */
  async searchCommunities(
    query: string,
    type?: CommunityType,
    page = 1,
    limit = 20,
  ): Promise<[Community[], number]> {
    const where: any = { status: CommunityStatus.ACTIVE };

    if (type) where.type = type;
    if (query) {
      where.name = Like(`%${query}%`);
    }

    return this.communityRepo.findAndCount({
      where,
      order: { member_count: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  // ============================================================================
  // Membership Operations
  // ============================================================================

  /** الانضمام لمجتمع */
  async joinCommunity(userId: string, communityId: string): Promise<CommunityMember> {
    const community = await this.getCommunityOrFail(communityId);

    if (community.status !== CommunityStatus.ACTIVE) {
      throw new BadRequestException('Community is not active');
    }

    // التحقق من عدم وجود عضوية سابقة
    const existing = await this.memberRepo.findOne({
      where: { community_id: communityId, user_id: userId },
    });

    if (existing) {
      if (existing.membership_status === MembershipStatus.APPROVED) {
        throw new ConflictException('You are already a member of this community');
      }
      if (existing.membership_status === MembershipStatus.BANNED) {
        throw new ForbiddenException('You have been banned from this community');
      }
      // إذا كانت معلقة، نعيدها
      existing.membership_status = MembershipStatus.PENDING;
      return this.memberRepo.save(existing);
    }

    // تحديد حالة العضوية حسب نوع المجتمع
    const membershipStatus =
      community.type === CommunityType.PUBLIC
        ? MembershipStatus.APPROVED
        : MembershipStatus.PENDING;

    // ─── إنشاء العضوية ───
    const member = this.memberRepo.create({
      community_id: communityId,
      user_id: userId,
      role: CommunityMemberRole.MEMBER,
      membership_status: membershipStatus,
    });

    const saved = await this.memberRepo.save(member);

    // زيادة عدد الأعضاء للمجتمعات العامة مباشرة
    if (community.type === CommunityType.PUBLIC) {
      await this.communityRepo.increment({ id: communityId }, 'member_count', 1);

      // ─── نشر حدث ───
      await this.eventBus.publishSimple(
        'COMMUNITY_JOINED' as any,
        {
          community_id: communityId,
          user_id: userId,
          type: community.type,
        },
        userId,
        this.MODULE_NAME,
      );
    }

    await this.auditService.logSimple('COMMUNITY_JOIN_REQUESTED', userId, 'COMMUNITY', communityId);

    return saved;
  }

  /** مغادرة مجتمع */
  async leaveCommunity(userId: string, communityId: string): Promise<void> {
    const community = await this.getCommunityOrFail(communityId);

    const member = await this.memberRepo.findOne({
      where: { community_id: communityId, user_id: userId },
    });

    if (!member || member.membership_status !== MembershipStatus.APPROVED) {
      throw new BadRequestException('You are not a member of this community');
    }

    // منع مغادرة المنشئ إذا لم يكن هناك admin آخر
    if (member.role === CommunityMemberRole.ADMIN) {
      const otherAdmins = await this.memberRepo.count({
        where: {
          community_id: communityId,
          role: CommunityMemberRole.ADMIN,
          user_id: In([userId]),
          membership_status: MembershipStatus.APPROVED,
        },
      });
      // Check if this is the only admin
      const allAdmins = await this.memberRepo.count({
        where: {
          community_id: communityId,
          role: CommunityMemberRole.ADMIN,
          membership_status: MembershipStatus.APPROVED,
        },
      });
      if (allAdmins <= 1) {
        throw new BadRequestException('You must assign another admin before leaving');
      }
    }

    await this.memberRepo.delete(member.id);

    // إنقاص عدد الأعضاء
    await this.communityRepo.decrement({ id: communityId }, 'member_count', 1);

    // ─── نشر حدث ───
    await this.eventBus.publishSimple(
      'COMMUNITY_LEFT' as any,
      {
        community_id: communityId,
        user_id: userId,
        type: community.type,
      },
      userId,
      this.MODULE_NAME,
    );

    await this.auditService.logSimple('COMMUNITY_LEFT', userId, 'COMMUNITY', communityId);
  }

  /** الموافقة على طلب انضمام (ADMIN/MODERATOR) */
  async approveMembership(
    adminId: string,
    communityId: string,
    userId: string,
  ): Promise<CommunityMember> {
    await this.requireAdminOrModerator(adminId, communityId);

    const member = await this.memberRepo.findOne({
      where: { community_id: communityId, user_id: userId },
    });

    if (!member) {
      throw new NotFoundException('Membership request not found');
    }

    if (member.membership_status !== MembershipStatus.PENDING) {
      throw new BadRequestException('Membership is not pending');
    }

    member.membership_status = MembershipStatus.APPROVED;
    const saved = await this.memberRepo.save(member);

    // زيادة عدد الأعضاء
    await this.communityRepo.increment({ id: communityId }, 'member_count', 1);

    // نشر حدث
    await this.eventBus.publishSimple(
      'COMMUNITY_JOINED' as any,
      {
        community_id: communityId,
        user_id: userId,
        approved_by: adminId,
      },
      adminId,
      this.MODULE_NAME,
    );

    return saved;
  }

  /** رفض طلب انضمام */
  async rejectMembership(
    adminId: string,
    communityId: string,
    userId: string,
  ): Promise<void> {
    await this.requireAdminOrModerator(adminId, communityId);

    await this.memberRepo.update(
      { community_id: communityId, user_id: userId },
      { membership_status: MembershipStatus.REJECTED },
    );
  }

  // ============================================================================
  // Member Management
  // ============================================================================

  /** الحصول على أعضاء مجتمع */
  async getCommunityMembers(
    communityId: string,
    filters: MemberFiltersDto,
  ): Promise<[CommunityMember[], number]> {
    const where: any = { community_id: communityId };

    if (filters.role) where.role = filters.role;
    if (filters.status) where.membership_status = filters.status;

    return this.memberRepo.findAndCount({
      where,
      order: { joined_at: 'DESC' },
      skip: ((filters.page || 1) - 1) * (filters.limit || 20),
      take: filters.limit || 20,
    });
  }

  /** تحديث دور عضو */
  async updateMemberRole(
    adminId: string,
    communityId: string,
    userId: string,
    role: CommunityMemberRole,
  ): Promise<CommunityMember> {
    await this.requireAdmin(adminId, communityId);

    const member = await this.memberRepo.findOne({
      where: { community_id: communityId, user_id: userId },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    member.role = role;
    return this.memberRepo.save(member);
  }

  /** حظر عضو */
  async banMember(
    adminId: string,
    communityId: string,
    userId: string,
  ): Promise<void> {
    await this.requireAdminOrModerator(adminId, communityId);

    // لا يمكن حظر المنشئ
    const community = await this.getCommunityOrFail(communityId);
    if (community.created_by === userId) {
      throw new ForbiddenException('Cannot ban the community creator');
    }

    await this.memberRepo.update(
      { community_id: communityId, user_id: userId },
      { membership_status: MembershipStatus.BANNED },
    );

    await this.communityRepo.decrement({ id: communityId }, 'member_count', 1);
  }

  // ============================================================================
  // Community Posts
  // ============================================================================

  /** الحصول على منشورات مجتمع */
  async getCommunityFeed(
    communityId: string,
    page = 1,
    limit = 20,
  ): Promise<CommunityPost[]> {
    await this.getCommunityOrFail(communityId);

    return this.communityPostRepo.find({
      where: { community_id: communityId },
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  /** تثبيت منشور (ADMIN/MODERATOR) */
  async pinPost(
    adminId: string,
    communityId: string,
    postId: string,
    dto: PinPostDto,
  ): Promise<CommunityPost> {
    await this.requireAdminOrModerator(adminId, communityId);

    let communityPost = await this.communityPostRepo.findOne({
      where: { community_id: communityId, post_id: postId },
    });

    if (!communityPost) {
      // إنشاء رابط جديد
      communityPost = this.communityPostRepo.create({
        community_id: communityId,
        post_id: postId,
        pinned: dto.pinned,
        featured: false,
      });
    } else {
      communityPost.pinned = dto.pinned;
    }

    return this.communityPostRepo.save(communityPost);
  }

  /** تمييز منشور (ADMIN/MODERATOR) */
  async featurePost(
    adminId: string,
    communityId: string,
    postId: string,
    featured: boolean,
  ): Promise<CommunityPost> {
    await this.requireAdminOrModerator(adminId, communityId);

    let communityPost = await this.communityPostRepo.findOne({
      where: { community_id: communityId, post_id: postId },
    });

    if (!communityPost) {
      communityPost = this.communityPostRepo.create({
        community_id: communityId,
        post_id: postId,
        pinned: false,
        featured,
      });
    } else {
      communityPost.featured = featured;
    }

    return this.communityPostRepo.save(communityPost);
  }

  /** إضافة منشور لمجتمع */
  async addPostToCommunity(
    userId: string,
    communityId: string,
    postId: string,
  ): Promise<CommunityPost> {
    // التحقق من العضوية
    const member = await this.memberRepo.findOne({
      where: {
        community_id: communityId,
        user_id: userId,
        membership_status: MembershipStatus.APPROVED,
      },
    });

    if (!member) {
      throw new ForbiddenException('You must be a member to post in this community');
    }

    const communityPost = this.communityPostRepo.create({
      community_id: communityId,
      post_id: postId,
    });

    const saved = await this.communityPostRepo.save(communityPost);

    // زيادة عدد المنشورات
    await this.communityRepo.increment({ id: communityId }, 'post_count', 1);

    return saved;
  }

  // ============================================================================
  // User Communities
  // ============================================================================

  /** الحصول على مجتمعات المستخدم */
  async getUserCommunities(userId: string): Promise<Community[]> {
    const memberships = await this.memberRepo.find({
      where: {
        user_id: userId,
        membership_status: MembershipStatus.APPROVED,
      },
    });

    if (memberships.length === 0) return [];

    const communityIds = memberships.map((m) => m.community_id);

    return this.communityRepo.find({
      where: { id: In(communityIds), status: CommunityStatus.ACTIVE },
      order: { updated_at: 'DESC' },
    });
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  /** الحصول على مجتمع أو رمي خطأ */
  private async getCommunityOrFail(communityId: string): Promise<Community> {
    const community = await this.communityRepo.findOne({
      where: { id: communityId, deleted_at: IsNull() },
    });

    if (!community) {
      throw new NotFoundException('Community not found');
    }

    return community;
  }

  /** التحقق من أن المستخدم ADMIN */
  private async requireAdmin(userId: string, communityId: string): Promise<void> {
    const member = await this.memberRepo.findOne({
      where: {
        community_id: communityId,
        user_id: userId,
        role: CommunityMemberRole.ADMIN,
        membership_status: MembershipStatus.APPROVED,
      },
    });

    if (!member) {
      throw new ForbiddenException('This action requires admin privileges');
    }
  }

  /** التحقق من أن المستخدم ADMIN أو MODERATOR */
  private async requireAdminOrModerator(
    userId: string,
    communityId: string,
  ): Promise<void> {
    const member = await this.memberRepo.findOne({
      where: {
        community_id: communityId,
        user_id: userId,
        role: In([CommunityMemberRole.ADMIN, CommunityMemberRole.MODERATOR]),
        membership_status: MembershipStatus.APPROVED,
      },
    });

    if (!member) {
      throw new ForbiddenException('This action requires admin or moderator privileges');
    }
  }
}
