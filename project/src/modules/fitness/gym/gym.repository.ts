/**
 * Gym Repository - طبقة الوصول لبيانات الأندية
 */
import { Repository, DataSource } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { Gym } from './gym.entity';
import { GymBranch } from './branch.entity';
import { MembershipPlan } from './membership-plan.entity';
import { Membership } from './membership.entity';
import { GymStatus, MembershipStatus } from '../../../common/enums/gym.enum';

@Injectable()
export class GymRepository extends Repository<Gym> {
  constructor(private dataSource: DataSource) {
    super(Gym, dataSource.createEntityManager());
  }

  /** جلب جيم مع فروعه */
  async findByIdWithBranches(id: string): Promise<Gym | null> {
    return this.findOne({
      where: { id },
      relations: ['branches'],
    });
  }

  /** جلب جيمات مالك معين */
  async findByOwner(ownerId: string, page: number, limit: number): Promise<[Gym[], number]> {
    return this.findAndCount({
      where: { owner_id: ownerId },
      skip: (page - 1) * limit,
      take: limit,
      order: { created_at: 'DESC' },
    });
  }

  /** جلب جيم بالـ slug */
  async findBySlug(slug: string): Promise<Gym | null> {
    return this.findOne({ where: { slug } });
  }

  /** فلترة الجيمات */
  async findWithFilters(
    status?: GymStatus,
    page = 1,
    limit = 20,
  ): Promise<[Gym[], number]> {
    const qb = this.createQueryBuilder('gym')
      .leftJoinAndSelect('gym.branches', 'branch')
      .orderBy('gym.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (status) {
      qb.andWhere('gym.status = :status', { status });
    }

    // استثناء المحذوفة ناعماً
    qb.andWhere('gym.deleted_at IS NULL');

    return qb.getManyAndCount();
  }

  /** تحديث حالة الجيم */
  async updateStatus(id: string, status: GymStatus): Promise<void> {
    await this.update({ id }, { status });
  }
}

@Injectable()
export class GymBranchRepository extends Repository<GymBranch> {
  constructor(private dataSource: DataSource) {
    super(GymBranch, dataSource.createEntityManager());
  }

  /** جلب فروع جيم معين */
  async findByGym(gymId: string): Promise<GymBranch[]> {
    return this.find({
      where: { gym_id: gymId },
      order: { created_at: 'DESC' },
    });
  }
}

@Injectable()
export class MembershipPlanRepository extends Repository<MembershipPlan> {
  constructor(private dataSource: DataSource) {
    super(MembershipPlan, dataSource.createEntityManager());
  }

  /** جلب خطط جيم معين */
  async findByGym(gymId: string): Promise<MembershipPlan[]> {
    return this.find({
      where: { gym_id: gymId, is_active: true },
      order: { price: 'ASC' },
    });
  }
}

@Injectable()
export class MembershipRepository extends Repository<Membership> {
  constructor(private dataSource: DataSource) {
    super(Membership, dataSource.createEntityManager());
  }

  /** جلب العضويات النشطة لمستخدم */
  async findActiveByUser(userId: string): Promise<Membership[]> {
    return this.find({
      where: {
        user_id: userId,
        status: MembershipStatus.ACTIVE,
      },
      order: { end_date: 'ASC' },
    });
  }

  /** التحقق من وجود عضوية نشطة */
  async hasActiveMembership(userId: string, gymId: string): Promise<boolean> {
    const count = await this.count({
      where: {
        user_id: userId,
        gym_id: gymId,
        status: MembershipStatus.ACTIVE,
      },
    });
    return count > 0;
  }

  /** جلب العضويات التي انتهت صلاحيتها */
  async findExpiredMemberships(asOf: Date): Promise<Membership[]> {
    return this.createQueryBuilder('m')
      .where('m.end_date < :asOf', { asOf })
      .andWhere('m.status = :status', { status: MembershipStatus.ACTIVE })
      .getMany();
  }

  /** إلغاء عضوية */
  async cancelMembership(id: string): Promise<void> {
    await this.update({ id }, { status: MembershipStatus.CANCELLED, auto_renew: false });
  }
}
