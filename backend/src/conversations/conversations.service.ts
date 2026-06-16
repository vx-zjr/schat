import { Injectable } from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';

export type CreateConversationInput = {
  title?: string;
  memberIds: string[];
};

@Injectable()
export class ConversationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  listAdminConversations() {
    return this.prisma.conversation.findMany({ include: { members: true }, orderBy: { updatedAt: 'desc' } });
  }

  listUserConversations(userId: string) {
    return this.prisma.conversation.findMany({
      where: { members: { some: { userId } } },
      include: { members: true },
      orderBy: { updatedAt: 'desc' }
    });
  }

  async createConversation(actorId: string, input: CreateConversationInput) {
    const conversation = await this.prisma.conversation.create({
      data: {
        title: input.title,
        members: { create: input.memberIds.map((userId) => ({ userId })) }
      },
      include: { members: true }
    });
    await this.audit.record(actorId, AuditAction.CONVERSATION_CREATED, conversation.id, { memberIds: input.memberIds });
    return conversation;
  }

  async isMember(conversationId: string, userId: string): Promise<boolean> {
    const membership = await this.prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId } }
    });
    return Boolean(membership);
  }
}

