import { AuditAction } from '@prisma/client';
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
});

