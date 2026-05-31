/**
 * =============================================================================
 * Profile Controller - متحكم ملف تعريف صانع المحتوى
 * =============================================================================
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { ProfileService } from './profile.service';
import {
  CreateCreatorProfileDto,
  UpdateCreatorProfileDto,
  SearchCreatorProfilesDto,
  FollowCreatorDto,
  CreatorProfileResponseDto,
} from './profile.dto';
import { CreatorProfile } from './creator-profile.entity';

@ApiTags('Creator Profiles')
@Controller('creator/profiles')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  // ── إنشاء ملف تعريف ────────────────────────────────────────────

  @Post()
  @ApiOperation({
    summary: 'Create creator profile',
    description: 'إنشاء ملف تعريف صانع محتوى جديد',
  })
  @ApiResponse({
    status: 201,
    description: 'Profile created successfully',
    type: CreatorProfileResponseDto,
  })
  @ApiResponse({ status: 409, description: 'Profile already exists for user' })
  async create(
    @Body() dto: CreateCreatorProfileDto,
  ): Promise<CreatorProfile> {
    return this.profileService.create(dto);
  }

  // ── جلب الملفات ────────────────────────────────────────────────

  @Get('search')
  @ApiOperation({
    summary: 'Search creator profiles',
    description: 'البحث في ملفات صناع المحتوى مع دعم الفلترة والترتيب',
  })
  @ApiResponse({
    status: 200,
    description: 'List of creator profiles',
  })
  async search(@Query() query: SearchCreatorProfilesDto): Promise<{
    items: CreatorProfile[];
    total: number;
    page: number;
    limit: number;
  }> {
    return this.profileService.search(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get creator profile by ID',
    description: 'جلب ملف تعريف صانع محتوى بواسطة المعرف',
  })
  @ApiParam({ name: 'id', description: 'Creator profile ID' })
  @ApiResponse({
    status: 200,
    description: 'Creator profile found',
    type: CreatorProfileResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  async getById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CreatorProfile> {
    return this.profileService.getById(id);
  }

  @Get('user/:userId')
  @ApiOperation({
    summary: 'Get creator profile by user ID',
    description: 'جلب ملف تعريف صانع محتوى بواسطة معرف المستخدم',
  })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'Creator profile found',
    type: CreatorProfileResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  async getByUserId(
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<CreatorProfile | null> {
    return this.profileService.getByUserId(userId);
  }

  // ── تحديث الملف ────────────────────────────────────────────────

  @Patch(':id')
  @ApiOperation({
    summary: 'Update creator profile',
    description: 'تحديث ملف تعريف صانع محتوى',
  })
  @ApiParam({ name: 'id', description: 'Creator profile ID' })
  @ApiBody({ type: UpdateCreatorProfileDto })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
    type: CreatorProfileResponseDto,
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCreatorProfileDto,
  ): Promise<CreatorProfile> {
    return this.profileService.update(id, dto);
  }

  // ── متابعة / إلغاء متابعة ──────────────────────────────────────

  @Post(':id/follow')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Follow a creator',
    description: 'متابعة صانع محتوى',
  })
  @ApiParam({ name: 'id', description: 'Creator profile ID' })
  @ApiBody({ type: FollowCreatorDto })
  @ApiResponse({ status: 200, description: 'Followed successfully' })
  async follow(
    @Param('id', ParseUUIDPipe) creatorId: string,
    @Body('follower_id', ParseUUIDPipe) followerId: string,
  ): Promise<{ following: boolean }> {
    return this.profileService.follow(followerId, creatorId);
  }

  @Post(':id/unfollow')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Unfollow a creator',
    description: 'إلغاء متابعة صانع محتوى',
  })
  @ApiParam({ name: 'id', description: 'Creator profile ID' })
  @ApiResponse({ status: 200, description: 'Unfollowed successfully' })
  async unfollow(
    @Param('id', ParseUUIDPipe) creatorId: string,
    @Body('follower_id', ParseUUIDPipe) followerId: string,
  ): Promise<{ following: boolean }> {
    return this.profileService.unfollow(followerId, creatorId);
  }

  // ── حذف ─────────────────────────────────────────────────────────

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Soft delete creator profile',
    description: 'حذف ناعم لملف تعريف صانع محتوى',
  })
  @ApiParam({ name: 'id', description: 'Creator profile ID' })
  @ApiResponse({ status: 204, description: 'Profile deleted' })
  async softDelete(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.profileService.softDelete(id);
  }
}
