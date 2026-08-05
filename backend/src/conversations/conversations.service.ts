import { ConflictException, Injectable } from '@nestjs/common';
import { AuditAction, UserRole } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';

export type CreateConversationInput = {
  title?: string;
  memberIds: string[];
};

export type DirectConversationResponse = {
  id: string;
  title: string | null;
  createdAt: Date;
  updatedAt: Date;
  peer: { id: string; username: string };
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

  async getDirectConversation(userId: string): Promise<DirectConversationResponse> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { directUserId: userId },
      include: {
        members: {
          select: {
            userId: true,
            user: { select: { id: true, username: true, role: true } }
          }
        }
      }
    });

    if (!conversation || !conversation.members.some((member) => member.userId === userId)) {
      throw new ConflictException('Direct conversation invariant violated');
    }

    const masterPeers = conversation.members.filter((member) => member.user.role === UserRole.MASTER);
    if (masterPeers.length !== 1) {
      throw new ConflictException('Direct conversation invariant violated');
    }

    const peer = masterPeers[0].user;
    return {
      id: conversation.id,
      title: conversation.title,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      peer: { id: peer.id, username: peer.username }
    };
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

