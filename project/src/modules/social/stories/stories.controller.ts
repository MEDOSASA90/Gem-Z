/**
 * =============================================================================
 * StoriesController - Controller للـ Stories Module
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
  ParseUUIDPipe,
} from '@nestjs/common';
import { StoriesService } from './stories.service';
import { CreateStoryDto, ViewStoryDto, AddReactionDto } from './stories.dto';

/** Guard مبسط */
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class StoriesAuthGuard implements CanActivate {
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

@Controller('social/stories')
@UseGuards(StoriesAuthGuard)
export class StoriesController {
  constructor(private readonly storiesService: StoriesService) {}

  /** إنشاء ستوري جديد */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createStory(@Request() req: any, @Body() dto: CreateStoryDto) {
    const story = await this.storiesService.createStory(req.user.id, dto);
    return { success: true, data: story };
  }

  /** الحصول على الستوريز النشطة من المستخدمين المتابعين */
  @Get()
  async getActiveStories(@Request() req: any) {
    const stories = await this.storiesService.getActiveStories(req.user.id);
    return { success: true, data: stories };
  }

  /** الحصول على ستوري بمعرفه */
  @Get(':storyId')
  async getStory(@Param('storyId', ParseUUIDPipe) storyId: string) {
    const story = await this.storiesService.getStoryById(storyId);
    if (!story) {
      return { success: false, message: 'Story not found or expired' };
    }
    return { success: true, data: story };
  }

  /** الحصول على ستوريز مستخدم معين */
  @Get('user/:userId')
  async getUserStories(
    @Request() req: any,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    const stories = await this.storiesService.getUserStories(userId, req.user.id);
    return { success: true, data: stories };
  }

  /** تسجيل مشاهدة ستوري */
  @Post(':storyId/view')
  @HttpCode(HttpStatus.OK)
  async viewStory(
    @Request() req: any,
    @Param('storyId', ParseUUIDPipe) storyId: string,
  ) {
    const view = await this.storiesService.viewStory(storyId, req.user.id);
    return { success: true, data: view };
  }

  /** إضافة تفاعل */
  @Post(':storyId/reactions')
  @HttpCode(HttpStatus.CREATED)
  async addReaction(
    @Request() req: any,
    @Param('storyId', ParseUUIDPipe) storyId: string,
    @Body() dto: AddReactionDto,
  ) {
    const reaction = await this.storiesService.addReaction(storyId, req.user.id, dto);
    return { success: true, data: reaction };
  }

  /** الحصول على مشاهدي ستوري */
  @Get(':storyId/viewers')
  async getStoryViewers(
    @Request() req: any,
    @Param('storyId', ParseUUIDPipe) storyId: string,
  ) {
    const viewers = await this.storiesService.getStoryViewers(storyId, req.user.id);
    return { success: true, data: viewers };
  }

  /** حذف ستوري */
  @Delete(':storyId')
  async deleteStory(
    @Request() req: any,
    @Param('storyId', ParseUUIDPipe) storyId: string,
  ) {
    await this.storiesService.deleteStory(req.user.id, storyId);
    return { success: true, message: 'Story deleted successfully' };
  }
}
