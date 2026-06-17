import { ForbiddenException, Injectable } from '@nestjs/common';
import { AuditAction, MessageKind } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { BansService } from '../bans/bans.service';
import { ConversationsService } from '../conversations/conversations.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';

export type SendMessageInput = {
  conversationId: string;
  body: string;
  attachmentIds?: string[];
  ip?: string;
};

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bans: BansService,
    private readonly audit: AuditService,
    private readonly conversations: ConversationsService,
    private readonly notifications: NotificationsService
  ) {}

  listAdminMessages() {
    return this.prisma.message.findMany({ orderBy: { createdAt: 'desc' }, take: 100 });
  }

  listUserMessages(userId: string) {
    return this.prisma.message.findMany({
      where: { conversation: { members: { some: { userId } } }, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 100
    });
  }

  async sendTextMessage(senderId: string, input: SendMessageInput) {
    await this.bans.assertNotBanned(senderId, input.ip);
    if (!(await this.conversations.isMember(input.conversationId, senderId))) {
      throw new ForbiddenException('Not a conversation member');
    }
    const message = await this.prisma.message.create({
      data: {
        conversationId: input.conversationId,
        senderId,
        kind: MessageKind.TEXT,
        body: input.body,
        attachments: input.attachmentIds?.length
          ? { connect: input.attachmentIds.map((id) => ({ id })) }
          : undefined
      },
      include: { attachments: true }
    });
    const members = await this.prisma.conversationMember.findMany({
      where: { conversationId: input.conversationId },
      select: { userId: true }
    });
    await Promise.all(
      members
        .filter((member) => member.userId !== senderId)
        .map((member) => this.notifications.notifyNewMessage(member.userId, message))
    );
    return message;
  }

  async editMessage(actorId: string, id: string, body: string) {
    const message = await this.prisma.message.update({ where: { id }, data: { body, editedAt: new Date() } });
    await this.audit.record(actorId, AuditAction.MESSAGE_EDITED, id, { body });
    return message;
  }

  async deleteMessage(actorId: string, id: string) {
    const message = await this.prisma.message.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit.record(actorId, AuditAction.MESSAGE_DELETED, id);
    return message;
  }
}
