/**
 * =============================================================================
 * CommunitiesController - Controller للـ Communities Module
 * =============================================================================
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  DefaultValuePipe,
  ParseUUIDPipe,
} from '@nestjs/common';
import { CommunitiesService } from './communities.service';
import {
  CreateCommunityDto,
  UpdateCommunityDto,
  MemberFiltersDto,
  PinPostDto,
  FeaturePostDto,
  CommunityQueryDto,
} from './communities.dto';
import { CommunityMemberRole } from './community-member.entity';

/** Guard مبسط */
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class CommunitiesAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const req = context.switchToHttp().getRequest();
    if (!req.user) {
      const userId = req.headers['x-user-id'];
      if (userId) {
        req.user = { id: userId };
        return true;
      }
      return false;
    }
    return true;
  }
}

@Controller('social/communities')
@UseGuards(CommunitiesAuthGuard)
export class CommunitiesController {
  constructor(private readonly communitiesService: CommunitiesService) {}

  // ============================================================================
  // Community CRUD
  // ============================================================================

  /** إنشاء مجتمع */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createCommunity(@Request() req: any, @Body() dto: CreateCommunityDto) {
    const community = await this.communitiesService.createCommunity(req.user.id, dto);
    return { success: true, data: community };
  }

  /** البحث في المجتمعات */
  @Get()
  async searchCommunities(
    @Query('search') search?: string,
    @Query('type') type?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    const [communities, total] = await this.communitiesService.searchCommunities(
      search || '',
      type as any,
      page,
      limit,
    );
    return { success: true, data: communities, total, page, limit };
  }

  /** الحصول على مجتمع بمعرفه */
  @Get(':communityId')
  async getCommunity(
    @Request() req: any,
    @Param('communityId', ParseUUIDPipe) communityId: string,
  ) {
    const community = await this.communitiesService.getCommunityById(communityId, req.user.id);
    return { success: true, data: community };
  }

  /** تحديث مجتمع */
  @Put(':communityId')
  async updateCommunity(
    @Request() req: any,
    @Param('communityId', ParseUUIDPipe) communityId: string,
    @Body() dto: UpdateCommunityDto,
  ) {
    const community = await this.communitiesService.updateCommunity(req.user.id, communityId, dto);
    return { success: true, data: community };
  }

  /** حذف مجتمع */
  @Delete(':communityId')
  async deleteCommunity(
    @Request() req: any,
    @Param('communityId', ParseUUIDPipe) communityId: string,
  ) {
    await this.communitiesService.deleteCommunity(req.user.id, communityId);
    return { success: true, message: 'Community deleted successfully' };
  }

  // ============================================================================
  // Membership
  // ============================================================================

  /** الانضمام لمجتمع */
  @Post(':communityId/join')
  @HttpCode(HttpStatus.OK)
  async joinCommunity(
    @Request() req: any,
    @Param('communityId', ParseUUIDPipe) communityId: string,
  ) {
    const membership = await this.communitiesService.joinCommunity(req.user.id, communityId);
    return { success: true, data: membership };
  }

  /** مغادرة مجتمع */
  @Post(':communityId/leave')
  @HttpCode(HttpStatus.OK)
  async leaveCommunity(
    @Request() req: any,
    @Param('communityId', ParseUUIDPipe) communityId: string,
  ) {
    await this.communitiesService.leaveCommunity(req.user.id, communityId);
    return { success: true, message: 'Left community successfully' };
  }

  /** الموافقة على انضمام */
  @Post(':communityId/members/:userId/approve')
  @HttpCode(HttpStatus.OK)
  async approveMembership(
    @Request() req: any,
    @Param('communityId', ParseUUIDPipe) communityId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    const member = await this.communitiesService.approveMembership(
      req.user.id,
      communityId,
      userId,
    );
    return { success: true, data: member };
  }

  /** رفض انضمام */
  @Post(':communityId/members/:userId/reject')
  @HttpCode(HttpStatus.OK)
  async rejectMembership(
    @Request() req: any,
    @Param('communityId', ParseUUIDPipe) communityId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    await this.communitiesService.rejectMembership(req.user.id, communityId, userId);
    return { success: true, message: 'Membership rejected' };
  }

  // ============================================================================
  // Members
  // ============================================================================

  /** أعضاء مجتمع */
  @Get(':communityId/members')
  async getCommunityMembers(
    @Param('communityId', ParseUUIDPipe) communityId: string,
    @Query() filters: MemberFiltersDto,
  ) {
    const [members, total] = await this.communitiesService.getCommunityMembers(
      communityId,
      filters,
    );
    return { success: true, data: members, total };
  }

  /** تحديث دور عضو */
  @Put(':communityId/members/:userId/role')
  async updateMemberRole(
    @Request() req: any,
    @Param('communityId', ParseUUIDPipe) communityId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body('role') role: CommunityMemberRole,
  ) {
    const member = await this.communitiesService.updateMemberRole(
      req.user.id,
      communityId,
      userId,
      role,
    );
    return { success: true, data: member };
  }

  /** حظر عضو */
  @Post(':communityId/members/:userId/ban')
  async banMember(
    @Request() req: any,
    @Param('communityId', ParseUUIDPipe) communityId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    await this.communitiesService.banMember(req.user.id, communityId, userId);
    return { success: true, message: 'Member banned successfully' };
  }

  // ============================================================================
  // Posts
  // ============================================================================

  /** منشورات مجتمع */
  @Get(':communityId/posts')
  async getCommunityFeed(
    @Param('communityId', ParseUUIDPipe) communityId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    const posts = await this.communitiesService.getCommunityFeed(communityId, page, limit);
    return { success: true, data: posts, page, limit };
  }

  /** تثبيت منشور */
  @Post(':communityId/posts/:postId/pin')
  async pinPost(
    @Request() req: any,
    @Param('communityId', ParseUUIDPipe) communityId: string,
    @Param('postId', ParseUUIDPipe) postId: string,
    @Body() dto: PinPostDto,
  ) {
    const post = await this.communitiesService.pinPost(req.user.id, communityId, postId, dto);
    return { success: true, data: post };
  }

  /** تمييز منشور */
  @Post(':communityId/posts/:postId/feature')
  async featurePost(
    @Request() req: any,
    @Param('communityId', ParseUUIDPipe) communityId: string,
    @Param('postId', ParseUUIDPipe) postId: string,
    @Body() dto: FeaturePostDto,
  ) {
    const post = await this.communitiesService.featurePost(
      req.user.id,
      communityId,
      postId,
      dto.featured,
    );
    return { success: true, data: post };
  }

  // ============================================================================
  // User Communities
  // ============================================================================

  /** مجتمعات المستخدم */
  @Get('user/my')
  async getMyCommunities(@Request() req: any) {
    const communities = await this.communitiesService.getUserCommunities(req.user.id);
    return { success: true, data: communities };
  }
}
