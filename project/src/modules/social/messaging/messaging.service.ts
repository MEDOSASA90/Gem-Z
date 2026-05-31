/**
 * =============================================================================
 * MessagingService - خدمة الرسائل
 * =============================================================================
 * توفر إنشاء المحادثات وإرسال الرسائل وتتبع حالة التسليم (SENT/DELIVERED/SEEN).
 * تنشر أحداثاً عبر EventBus لكل تغيير في الحالة.
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In, IsNull } from 'typeorm';
import { Conversation, ConversationType } from './conversation.entity';
import { ConversationParticipant, ParticipantRole } from './conversation-participant.entity';
import { Message, MessageType } from './message.entity';
import { MessageStatus, MessageStatusEnum } from './message-status.entity';
import { MessageReaction } from './message-reaction.entity';
import { EventBusService } from '../../../core/event-bus/event-bus.service';
import { AuditService } from '../../../core/audit/audit.service';
import {
  CreateConversationDto,
  SendMessageDto,
  MessageReactionDto,
} from './messaging.dto';

@Injectable()
export class MessagingService {
  private readonly logger = new Logger(MessagingService.name);
  private readonly MODULE_NAME = 'social.messaging';

  constructor(
    @InjectRepository(Conversation)
    private readonly convRepo: Repository<Conversation>,
    @InjectRepository(ConversationParticipant)
    private readonly participantRepo: Repository<ConversationParticipant>,
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
    @InjectRepository(MessageStatus)
    private readonly statusRepo: Repository<MessageStatus>,
    @InjectRepository(MessageReaction)
    private readonly reactionRepo: Repository<MessageReaction>,
    private readonly eventBus: EventBusService,
    private readonly auditService: AuditService,
    private readonly dataSource: DataSource,
  ) {}

  // ============================================================================
  // Conversation CRUD
  // ============================================================================

  /** إنشاء محادثة جديدة (فردية أو جماعية) */
  async createConversation(userId: string, dto: CreateConversationDto): Promise<Conversation> {
    // التحقق من وجود مشاركين
    if (!dto.participantIds || dto.participantIds.length === 0) {
      throw new BadRequestException('Conversation must have at least one participant');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // ─── إنشاء المحادثة ───
      const conversation = this.convRepo.create({
        type: dto.type,
        title: dto.type === ConversationType.GROUP ? (dto.title || 'Group Chat') : null,
        avatar: dto.avatar || null,
        participants_count: dto.participantIds.length + 1, // +1 for creator
      });

      const saved = await queryRunner.manager.save(conversation);

      // ─── إضافة المنشئ كـ ADMIN ───
      const creatorParticipant = this.participantRepo.create({
        conversation_id: saved.id,
        user_id: userId,
        role: ParticipantRole.ADMIN,
      });
      await queryRunner.manager.save(creatorParticipant);

      // ─── إضافة المشاركين الآخرين ───
      for (const participantId of dto.participantIds) {
        // منع إضافة نفس المستخدم مرتين
        if (participantId === userId) continue;

        const participant = this.participantRepo.create({
          conversation_id: saved.id,
          user_id: participantId,
          role: ParticipantRole.MEMBER,
        });
        await queryRunner.manager.save(participant);
      }

      await queryRunner.commitTransaction();

      // ─── Audit Log ───
      await this.auditService.logSimple('CONVERSATION_CREATED', userId, 'CONVERSATION', saved.id);

      return saved;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /** الحصول على محادثات المستخدم */
  async getConversations(userId: string): Promise<Conversation[]> {
    // البحث عن المحادثات التي يشارك فيها المستخدم
    const participants = await this.participantRepo.find({
      where: { user_id: userId },
      order: { joined_at: 'DESC' },
    });

    if (participants.length === 0) {
      return [];
    }

    const conversationIds = participants.map((p) => p.conversation_id);

    const conversations = await this.convRepo.find({
      where: { id: In(conversationIds) },
      order: { last_message_at: 'DESC' },
    });

    // إضافة عدد الرسائل غير المقروءة لكل محادثة
    for (const conv of conversations) {
      const participant = participants.find((p) => p.conversation_id === conv.id);
      if (participant) {
        const unreadCount = await this.getUnreadCount(conv.id, userId, participant.last_read_message_id);
        (conv as any).unreadCount = unreadCount;
      }
    }

    return conversations;
  }

  /** الحصول على محادثة بمعرفها مع التحقق من الصلاحية */
  async getConversation(conversationId: string, userId: string): Promise<Conversation> {
    // التحقق من أن المستخدم مشارك في المحادثة
    const participant = await this.participantRepo.findOne({
      where: { conversation_id: conversationId, user_id: userId },
    });

    if (!participant) {
      throw new ForbiddenException('You are not a participant in this conversation');
    }

    const conversation = await this.convRepo.findOne({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return conversation;
  }

  // ============================================================================
  // Message Operations
  // ============================================================================

  /** إرسال رسالة في محادثة */
  async sendMessage(
    userId: string,
    conversationId: string,
    dto: SendMessageDto,
  ): Promise<Message> {
    // التحقق من أن المستخدم مشارك في المحادثة
    await this.getConversation(conversationId, userId);

    // بناء metadata
    const metadata: Record<string, unknown> = {};
    if (dto.metadata) {
      Object.assign(metadata, dto.metadata);
    }
    if (dto.fileName) metadata.fileName = dto.fileName;
    if (dto.fileSize) metadata.fileSize = dto.fileSize;

    // ─── إنشاء الرسالة ───
    const message = this.messageRepo.create({
      conversation_id: conversationId,
      sender_id: userId,
      type: dto.type,
      content: dto.content || null,
      media_url: dto.mediaUrl || null,
      metadata: Object.keys(metadata).length > 0 ? metadata : null,
      reply_to_id: dto.replyToId || null,
    });

    const saved = await this.messageRepo.save(message);

    // ─── تحديث آخر رسالة في المحادثة ───
    await this.convRepo.update(conversationId, {
      last_message_id: saved.id,
      last_message_at: new Date(),
    });

    // ─── إنشاء حالة الرسالة لكل مشارك ───
    const participants = await this.participantRepo.find({
      where: { conversation_id: conversationId },
    });

    for (const participant of participants) {
      const status = participant.user_id === userId
        ? MessageStatusEnum.SEEN // المرسل شاف الرسالة تلقائياً
        : MessageStatusEnum.SENT;

      const messageStatus = this.statusRepo.create({
        message_id: saved.id,
        user_id: participant.user_id,
        status,
      });
      await this.statusRepo.save(messageStatus);
    }

    // ─── نشر حدث ───
    await this.eventBus.publishSimple(
      'MESSAGE_SENT' as any,
      {
        message_id: saved.id,
        conversation_id: conversationId,
        sender_id: userId,
        type: saved.type,
      },
      userId,
      this.MODULE_NAME,
    );

    // ─── Audit Log ───
    await this.auditService.logSimple('MESSAGE_SENT', userId, 'MESSAGE', saved.id);

    return saved;
  }

  /** الحصول على رسائل محادثة */
  async getMessages(
    userId: string,
    conversationId: string,
    page = 1,
    limit = 50,
  ): Promise<[Message[], number]> {
    // التحقق من أن المستخدم مشارك في المحادثة
    await this.getConversation(conversationId, userId);

    return this.messageRepo.findAndCount({
      where: { conversation_id: conversationId, deleted_at: IsNull() },
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  // ============================================================================
  // Status Tracking
  // ============================================================================

  /** تحديث حالة رسالة */
  async updateStatus(
    userId: string,
    messageId: string,
    status: MessageStatusEnum,
  ): Promise<MessageStatus> {
    const messageStatus = await this.statusRepo.findOne({
      where: { message_id: messageId, user_id: userId },
    });

    if (!messageStatus) {
      // إنشاء حالة جديدة إذا لم تكن موجودة
      const newStatus = this.statusRepo.create({
        message_id: messageId,
        user_id: userId,
        status,
      });
      const saved = await this.statusRepo.save(newStatus);

      await this.publishStatusEvent(messageId, userId, status);
      return saved;
    }

    // تحديث فقط إذا كانت الحالة أعلى (SENT < DELIVERED < SEEN)
    const statusOrder = [MessageStatusEnum.SENT, MessageStatusEnum.DELIVERED, MessageStatusEnum.SEEN];
    const currentIndex = statusOrder.indexOf(messageStatus.status);
    const newIndex = statusOrder.indexOf(status);

    if (newIndex > currentIndex) {
      messageStatus.status = status;
      const saved = await this.statusRepo.save(messageStatus);

      await this.publishStatusEvent(messageId, userId, status);
      return saved;
    }

    return messageStatus;
  }

  /** نشر حدث تغيير الحالة */
  private async publishStatusEvent(
    messageId: string,
    userId: string,
    status: MessageStatusEnum,
  ): Promise<void> {
    const eventType = status === MessageStatusEnum.DELIVERED ? 'MESSAGE_DELIVERED' as any : 'MESSAGE_SEEN' as any;
    await this.eventBus.publishSimple(
      eventType,
      { message_id: messageId, user_id: userId, status },
      userId,
      this.MODULE_NAME,
    );
  }

  /** تعليم محادثة كمقروءة */
  async markConversationAsRead(userId: string, conversationId: string): Promise<void> {
    // التحقق من المشاركة
    const participant = await this.participantRepo.findOne({
      where: { conversation_id: conversationId, user_id: userId },
    });

    if (!participant) {
      throw new ForbiddenException('You are not a participant in this conversation');
    }

    // الحصول على آخر رسالة في المحادثة
    const conversation = await this.convRepo.findOne({
      where: { id: conversationId },
    });

    if (!conversation || !conversation.last_message_id) {
      return;
    }

    // تحديث آخر رسالة مقروءة
    await this.participantRepo.update(
      { conversation_id: conversationId, user_id: userId },
      { last_read_message_id: conversation.last_message_id },
    );

    // تحديث حالة كل رسائل المستخدم إلى SEEN
    await this.statusRepo
      .createQueryBuilder()
      .update(MessageStatus)
      .set({ status: MessageStatusEnum.SEEN })
      .where('message_id IN (SELECT id FROM messages WHERE conversation_id = :convId)', {
        convId: conversationId,
      })
      .andWhere('user_id = :userId', { userId })
      .andWhere('status != :seen', { seen: MessageStatusEnum.SEEN })
      .execute();
  }

  /** حساب عدد الرسائل غير المقروءة */
  private async getUnreadCount(
    conversationId: string,
    userId: string,
    lastReadMessageId: string | null,
  ): Promise<number> {
    const query = this.messageRepo
      .createQueryBuilder('msg')
      .where('msg.conversation_id = :convId', { convId: conversationId })
      .andWhere('msg.sender_id != :userId', { userId })
      .andWhere('msg.deleted_at IS NULL');

    if (lastReadMessageId) {
      // استخدام subquery للحصول على تاريخ آخر رسالة مقروءة
      query.andWhere(
        'msg.created_at > (SELECT created_at FROM messages WHERE id = :lastReadId)',
        { lastReadId: lastReadMessageId },
      );
    }

    return query.getCount();
  }

  // ============================================================================
  // Reaction Operations
  // ============================================================================

  /** إضافة تفاعل على رسالة */
  async addReaction(
    userId: string,
    messageId: string,
    dto: MessageReactionDto,
  ): Promise<MessageReaction> {
    // التحقق من وجود الرسالة
    const message = await this.messageRepo.findOne({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // التحقق من أن المستخدم مشارك في المحادثة
    await this.getConversation(message.conversation_id, userId);

    // التحقق من عدم وجود تفاعل سابق
    const existing = await this.reactionRepo.findOne({
      where: { message_id: messageId, user_id: userId },
    });

    if (existing) {
      // تحديث التفاعل
      existing.reaction = dto.reaction;
      return this.reactionRepo.save(existing);
    }

    // ─── إنشاء تفاعل جديد ───
    const reaction = this.reactionRepo.create({
      message_id: messageId,
      user_id: userId,
      reaction: dto.reaction,
    });

    return this.reactionRepo.save(reaction);
  }

  /** حذف تفاعل */
  async removeReaction(userId: string, messageId: string): Promise<void> {
    await this.reactionRepo.delete({ message_id: messageId, user_id: userId });
  }

  // ============================================================================
  // Participant Management
  // ============================================================================

  /** إضافة مشارك لمحادثة جماعية */
  async addParticipant(
    adminId: string,
    conversationId: string,
    userId: string,
    role: ParticipantRole = ParticipantRole.MEMBER,
  ): Promise<ConversationParticipant> {
    // التحقق من أن المحادثة جماعية
    const conversation = await this.convRepo.findOne({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (conversation.type !== ConversationType.GROUP) {
      throw new BadRequestException('Cannot add participants to direct conversation');
    }

    // التحقق من أن المستخدم ADMIN
    const adminParticipant = await this.participantRepo.findOne({
      where: { conversation_id: conversationId, user_id: adminId },
    });

    if (!adminParticipant || adminParticipant.role !== ParticipantRole.ADMIN) {
      throw new ForbiddenException('Only admins can add participants');
    }

    // التحقق من عدم وجود المشارك مسبقاً
    const existing = await this.participantRepo.findOne({
      where: { conversation_id: conversationId, user_id: userId },
    });

    if (existing) {
      throw new BadRequestException('User is already a participant');
    }

    // ─── إضافة المشارك ───
    const participant = this.participantRepo.create({
      conversation_id: conversationId,
      user_id: userId,
      role,
    });

    const saved = await this.participantRepo.save(participant);

    // تحديث عدد المشاركين
    await this.convRepo.increment({ id: conversationId }, 'participants_count', 1);

    return saved;
  }

  /** مغادرة محادثة */
  async leaveConversation(userId: string, conversationId: string): Promise<void> {
    const participant = await this.participantRepo.findOne({
      where: { conversation_id: conversationId, user_id: userId },
    });

    if (!participant) {
      throw new BadRequestException('You are not a participant in this conversation');
    }

    await this.participantRepo.delete(participant.id);

    // تحديث عدد المشاركين
    await this.convRepo.decrement({ id: conversationId }, 'participants_count', 1);
  }
}
