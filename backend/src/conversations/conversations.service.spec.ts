import { ConflictException } from '@nestjs/common';
import { AuditAction, UserRole } from '@prisma/client';
import { ConversationsService } from './conversations.service';

describe('ConversationsService', () => {
  it('creates a conversation with members and records audit', async () => {
    const prisma: any = {
      conversation: {
        create: jest.fn(({ data }) => ({ id: 'conversation-1', ...data }))
      }
    };
    const audit: any = { record: jest.fn() };
    const service = new ConversationsService(prisma, audit);

    const conversation = await service.createConversation('admin-1', { title: 'Room', memberIds: ['user-1', 'user-2'] });

    expect(conversation.id).toBe('conversation-1');
    expect(prisma.conversation.create).toHaveBeenCalledWith({
      data: {
        title: 'Room',
        members: { create: [{ userId: 'user-1' }, { userId: 'user-2' }] }
      },
      include: { members: true }
    });
    expect(audit.record).toHaveBeenCalledWith('admin-1', AuditAction.CONVERSATION_CREATED, 'conversation-1', {
      memberIds: ['user-1', 'user-2']
    });
  });

  it('lists conversations for a user membership', async () => {
    const prisma: any = {
      conversation: {
        findMany: jest.fn(() => [{ id: 'conversation-1' }])
      }
    };
    const service = new ConversationsService(prisma, { record: jest.fn() } as any);

    const conversations = await service.listUserConversations('user-1');

    expect(conversations).toEqual([{ id: 'conversation-1' }]);
    expect(prisma.conversation.findMany).toHaveBeenCalledWith({
      where: { members: { some: { userId: 'user-1' } } },
      include: { members: true },
      orderBy: { updatedAt: 'desc' }
    });
  });

  it('returns only the direct conversation and MASTER peer', async () => {
    const prisma: any = {
      conversation: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'direct-1',
          title: null,
          createdAt: new Date('2026-08-05T00:00:00Z'),
          updatedAt: new Date('2026-08-05T00:00:00Z'),
          members: [
            { userId: 'user-1', user: { id: 'user-1', username: 'alice', role: UserRole.USER } },
            { userId: 'master-1', user: { id: 'master-1', username: 'master', role: UserRole.MASTER } }
          ]
        })
      }
    };
    const service = new ConversationsService(prisma, { record: jest.fn() } as any);

    await expect((service as any).getDirectConversation('user-1')).resolves.toEqual({
      id: 'direct-1',
      title: null,
      createdAt: new Date('2026-08-05T00:00:00Z'),
      updatedAt: new Date('2026-08-05T00:00:00Z'),
      peer: { id: 'master-1', username: 'master' }
    });
    expect(prisma.conversation.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { directUserId: 'user-1' } })
    );
  });

  it('rejects when the direct conversation is missing', async () => {
    const prisma: any = { conversation: { findUnique: jest.fn().mockResolvedValue(null) } };
    const service = new ConversationsService(prisma, { record: jest.fn() } as any);

    await expect((service as any).getDirectConversation('user-1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects when the direct conversation is missing the requesting membership', async () => {
    const prisma: any = {
      conversation: {
        findUnique: jest.fn().mockResolvedValue({
          members: [{ userId: 'master-1', user: { id: 'master-1', username: 'master', role: UserRole.MASTER } }]
        })
      }
    };
    const service = new ConversationsService(prisma, { record: jest.fn() } as any);

    await expect((service as any).getDirectConversation('user-1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects when the direct conversation has no MASTER peer', async () => {
    const prisma: any = {
      conversation: {
        findUnique: jest.fn().mockResolvedValue({
          members: [{ userId: 'user-1', user: { id: 'user-1', username: 'alice', role: UserRole.USER } }]
        })
      }
    };
    const service = new ConversationsService(prisma, { record: jest.fn() } as any);

    await expect((service as any).getDirectConversation('user-1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects when the direct conversation has two MASTER peers', async () => {
    const prisma: any = {
      conversation: {
        findUnique: jest.fn().mockResolvedValue({
          members: [
            { userId: 'user-1', user: { id: 'user-1', username: 'alice', role: UserRole.USER } },
            { userId: 'master-1', user: { id: 'master-1', username: 'master', role: UserRole.MASTER } },
            { userId: 'master-2', user: { id: 'master-2', username: 'master-two', role: UserRole.MASTER } }
          ]
        })
      }
    };
    const service = new ConversationsService(prisma, { record: jest.fn() } as any);

    await expect((service as any).getDirectConversation('user-1')).rejects.toBeInstanceOf(ConflictException);
  });
});

