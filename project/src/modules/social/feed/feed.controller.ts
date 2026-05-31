/**
 * =============================================================================
 * FeedController - Controller للـ Feed Module
 * =============================================================================
 * يعالج طلبات HTTP المتعلقة بالمنشورات والتفاعلات.
 * كل endpoints محمية ويتطلبون مصادقة.
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
  Ip,
} from '@nestjs/common';
import { FeedService } from './feed.service';
import {
  CreatePostDto,
  CreateCommentDto,
  SharePostDto,
  ReportPostDto,
  FeedQueryDto,
} from './feed.dto';

/** Guard مبسط - يفترض وجود AuthGuard في Identity Module */
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class FeedAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const req = context.switchToHttp().getRequest();
    // يفترض أن الـ AuthGuard السابق ضبط req.user
    if (!req.user) {
      // For development: extract from header
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

@Controller('social/feed')
@UseGuards(FeedAuthGuard)
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  // ============================================================================
  // Feed Endpoints
  // ============================================================================

  /** الـ Feed الشخصي */
  @Get('personalized')
  async getPersonalizedFeed(
    @Request() req: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    const posts = await this.feedService.getPersonalizedFeed(req.user.id, page, limit);
    return { success: true, data: posts, page, limit };
  }

  /** منشورات المتابعين */
  @Get('following')
  async getFollowingFeed(
    @Request() req: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    const posts = await this.feedService.getFollowingFeed(req.user.id, page, limit);
    return { success: true, data: posts, page, limit };
  }

  /** المنشورات الرائجة */
  @Get('trending')
  async getTrendingFeed(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    const posts = await this.feedService.getTrendingFeed(page, limit);
    return { success: true, data: posts, page, limit };
  }

  /** المحتوى الإقليمي */
  @Get('regional/:region')
  async getRegionalFeed(
    @Request() req: any,
    @Param('region') region: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    const posts = await this.feedService.getRegionalFeed(req.user.id, region, page, limit);
    return { success: true, data: posts, page, limit, region };
  }

  // ============================================================================
  // Post Endpoints
  // ============================================================================

  /** إنشاء منشور جديد */
  @Post('posts')
  @HttpCode(HttpStatus.CREATED)
  async createPost(@Request() req: any, @Body() dto: CreatePostDto) {
    const post = await this.feedService.createPost(req.user.id, dto);
    return { success: true, data: post };
  }

  /** حذف منشور */
  @Delete('posts/:postId')
  @HttpCode(HttpStatus.OK)
  async deletePost(
    @Request() req: any,
    @Param('postId', ParseUUIDPipe) postId: string,
  ) {
    await this.feedService.deletePost(req.user.id, postId);
    return { success: true, message: 'Post deleted successfully' };
  }

  /** إعجاب / إلغاء إعجاب */
  @Post('posts/:postId/like')
  async likePost(
    @Request() req: any,
    @Param('postId', ParseUUIDPipe) postId: string,
  ) {
    const result = await this.feedService.likePost(req.user.id, postId);
    return { success: true, data: result };
  }

  /** إضافة تعليق */
  @Post('posts/:postId/comments')
  @HttpCode(HttpStatus.CREATED)
  async commentOnPost(
    @Request() req: any,
    @Param('postId', ParseUUIDPipe) postId: string,
    @Body() dto: CreateCommentDto,
  ) {
    const comment = await this.feedService.commentOnPost(req.user.id, postId, dto);
    return { success: true, data: comment };
  }

  /** مشاركة منشور */
  @Post('posts/:postId/share')
  @HttpCode(HttpStatus.CREATED)
  async sharePost(
    @Request() req: any,
    @Param('postId', ParseUUIDPipe) postId: string,
    @Body() dto: SharePostDto,
  ) {
    const share = await this.feedService.sharePost(req.user.id, postId, dto);
    return { success: true, data: share };
  }

  /** الإبلاغ عن منشور */
  @Post('posts/:postId/report')
  @HttpCode(HttpStatus.CREATED)
  async reportPost(
    @Request() req: any,
    @Param('postId', ParseUUIDPipe) postId: string,
    @Body() dto: ReportPostDto,
  ) {
    const report = await this.feedService.reportPost(req.user.id, postId, dto);
    return { success: true, data: report, message: 'Report submitted successfully' };
  }

  /** تسجيل مشاهدة */
  @Post('posts/:postId/view')
  @HttpCode(HttpStatus.OK)
  async recordView(
    @Request() req: any,
    @Param('postId', ParseUUIDPipe) postId: string,
    @Ip() ip: string,
  ) {
    await this.feedService.recordPostView(req.user.id, postId, ip);
    return { success: true };
  }
}
