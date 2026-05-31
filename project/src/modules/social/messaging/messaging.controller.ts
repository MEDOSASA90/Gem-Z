/**
 * =============================================================================
 * MessagingController - Controller للـ Messaging Module
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
import { MessagingService } from './messaging.service';
import {
  CreateConversationDto,
  SendMessageDto,
  UpdateStatusDto,
  MessageReactionDto,
  MessageQueryDto,
} from './messaging.dto';
import { ParticipantRole } from './conversation-participant.entity';

/** Guard مبسط */
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class MessagingAuthGuard implements CanActivate {
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

@Controller('social/messaging')
@UseGuards(MessagingAuthGuard)
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  // ============================================================================
  // Conversation Endpoints
  // ============================================================================

  /** إنشاء محادثة جديدة */
  @Post('conversations')
  @HttpCode(HttpStatus.CREATED)
  async createConversation(@Request() req: any, @Body() dto: CreateConversationDto) {
    const conversation = await this.messagingService.createConversation(req.user.id, dto);
    return { success: true, data: conversation };
  }

  /** الحصول على محادثات المستخدم */
  @Get('conversations')
  async getConversations(@Request() req: any) {
    const conversations = await this.messagingService.getConversations(req.user.id);
    return { success: true, data: conversations };
  }

  /** الحصول على محادثة بمعرفها */
  @Get('conversations/:conversationId')
  async getConversation(
    @Request() req: any,
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
  ) {
    const conversation = await this.messagingService.getConversation(conversationId, req.user.id);
    return { success: true, data: conversation };
  }

  // ============================================================================
  // Message Endpoints
  // ============================================================================

  /** إرسال رسالة */
  @Post('conversations/:conversationId/messages')
  @HttpCode(HttpStatus.CREATED)
  async sendMessage(
    @Request() req: any,
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
    @Body() dto: SendMessageDto,
  ) {
    const message = await this.messagingService.sendMessage(req.user.id, conversationId, dto);
    return { success: true, data: message };
  }

  /** الحصول على رسائل محادثة */
  @Get('conversations/:conversationId/messages')
  async getMessages(
    @Request() req: any,
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    const [messages, total] = await this.messagingService.getMessages(
      req.user.id,
      conversationId,
      page,
      limit,
    );
    return { success: true, data: messages, total, page, limit };
  }

  // ============================================================================
  // Status Endpoints
  // ============================================================================

  /** تحديث حالة رسالة */
  @Put('messages/:messageId/status')
  async updateStatus(
    @Request() req: any,
    @Param('messageId', ParseUUIDPipe) messageId: string,
    @Body() dto: UpdateStatusDto,
  ) {
    const status = await this.messagingService.updateStatus(req.user.id, messageId, dto.status);
    return { success: true, data: status };
  }

  /** تعليم محادثة كمقروءة */
  @Post('conversations/:conversationId/read')
  @HttpCode(HttpStatus.OK)
  async markConversationAsRead(
    @Request() req: any,
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
  ) {
    await this.messagingService.markConversationAsRead(req.user.id, conversationId);
    return { success: true, message: 'Conversation marked as read' };
  }

  // ============================================================================
  // Reaction Endpoints
  // ============================================================================

  /** إضافة تفاعل على رسالة */
  @Post('messages/:messageId/reactions')
  @HttpCode(HttpStatus.CREATED)
  async addReaction(
    @Request() req: any,
    @Param('messageId', ParseUUIDPipe) messageId: string,
    @Body() dto: MessageReactionDto,
  ) {
    const reaction = await this.messagingService.addReaction(req.user.id, messageId, dto);
    return { success: true, data: reaction };
  }

  /** حذف تفاعل */
  @Delete('messages/:messageId/reactions')
  @HttpCode(HttpStatus.OK)
  async removeReaction(
    @Request() req: any,
    @Param('messageId', ParseUUIDPipe) messageId: string,
  ) {
    await this.messagingService.removeReaction(req.user.id, messageId);
    return { success: true, message: 'Reaction removed' };
  }

  // ============================================================================
  // Participant Endpoints
  // ============================================================================

  /** إضافة مشارك */
  @Post('conversations/:conversationId/participants')
  @HttpCode(HttpStatus.CREATED)
  async addParticipant(
    @Request() req: any,
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
    @Body('userId', ParseUUIDPipe) userId: string,
  ) {
    const participant = await this.messagingService.addParticipant(
      req.user.id,
      conversationId,
      userId,
      ParticipantRole.MEMBER,
    );
    return { success: true, data: participant };
  }

  /** مغادرة محادثة */
  @Post('conversations/:conversationId/leave')
  @HttpCode(HttpStatus.OK)
  async leaveConversation(
    @Request() req: any,
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
  ) {
    await this.messagingService.leaveConversation(req.user.id, conversationId);
    return { success: true, message: 'Left conversation' };
  }
}
