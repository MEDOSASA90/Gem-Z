/**
 * =============================================================================
 * ReelsController - Controller للـ Reels Module
 * =============================================================================
 */

import {
  Controller,
  Get,
  Post,
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
import { ReelsService } from './reels.service';
import { UploadReelDto, RecordViewDto, EngagementDto, ReelQueryDto } from './reels.dto';
import { ReelEngagementType } from './reel-engagement.entity';

/** Guard مبسط */
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class ReelsAuthGuard implements CanActivate {
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

@Controller('social/reels')
@UseGuards(ReelsAuthGuard)
export class ReelsController {
  constructor(private readonly reelsService: ReelsService) {}

  /** رفع ريل جديد */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async uploadReel(@Request() req: any, @Body() dto: UploadReelDto) {
    const reel = await this.reelsService.uploadReel(req.user.id, dto);
    return { success: true, data: reel };
  }

  /** الحصول على feed الريلز */
  @Get('feed')
  async getReelFeed(
    @Request() req: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    const reels = await this.reelsService.getReelFeed(req.user.id, page, limit);
    return { success: true, data: reels, page, limit };
  }

  /** الحصول على ريل بمعرفه */
  @Get(':reelId')
  async getReel(@Param('reelId', ParseUUIDPipe) reelId: string) {
    const reel = await this.reelsService.getReelById(reelId);
    if (!reel) {
      return { success: false, message: 'Reel not found' };
    }
    return { success: true, data: reel };
  }

  /** تسجيل مشاهدة */
  @Post(':reelId/view')
  @HttpCode(HttpStatus.OK)
  async recordView(
    @Request() req: any,
    @Param('reelId', ParseUUIDPipe) reelId: string,
    @Body() dto: RecordViewDto,
  ) {
    const view = await this.reelsService.recordView(
      req.user.id,
      reelId,
      dto.watchDuration || 0,
      dto.completed || false,
    );
    return { success: true, data: view };
  }

  /** إضافة تفاعل */
  @Post(':reelId/engagements')
  @HttpCode(HttpStatus.CREATED)
  async addEngagement(
    @Request() req: any,
    @Param('reelId', ParseUUIDPipe) reelId: string,
    @Body() dto: EngagementDto,
  ) {
    const engagement = await this.reelsService.addEngagement(req.user.id, reelId, dto);
    return { success: true, data: engagement };
  }

  /** إزالة تفاعل (إلغاء إعجاب) */
  @Delete(':reelId/engagements/:type')
  @HttpCode(HttpStatus.OK)
  async removeEngagement(
    @Request() req: any,
    @Param('reelId', ParseUUIDPipe) reelId: string,
    @Param('type') type: ReelEngagementType,
  ) {
    await this.reelsService.removeEngagement(req.user.id, reelId, type);
    return { success: true, message: 'Engagement removed' };
  }

  /** إحصائيات تفاعل */
  @Get(':reelId/stats')
  async getEngagementStats(@Param('reelId', ParseUUIDPipe) reelId: string) {
    const stats = await this.reelsService.getEngagementStats(reelId);
    return { success: true, data: stats };
  }

  /** حذف ريل */
  @Delete(':reelId')
  async deleteReel(
    @Request() req: any,
    @Param('reelId', ParseUUIDPipe) reelId: string,
  ) {
    await this.reelsService.deleteReel(req.user.id, reelId);
    return { success: true, message: 'Reel deleted successfully' };
  }
}
