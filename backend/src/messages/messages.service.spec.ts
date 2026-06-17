import { AuditAction, MessageKind } from '@prisma/client';
import { MessagesService } from './messages.service';

describe('MessagesService', () => {
  it('sends a text message after checking bans', async () => {
    const prisma: any = {
      message: {
        create: jest.fn(({ data }) => ({ id: 'message-1', kind: MessageKind.TEXT, ...data }))
      },
      conversationMember: {
        findMany: jest.fn(() => [])
      }
    };
    const bans: any = { assertNotBanned: jest.fn() };
    const conversations: any = { isMember: jest.fn(() => true) };
    const service = new MessagesService(prisma, bans, { record: jest.fn() } as any, conversations, { notifyNewMessage: jest.fn() } as any);

    const message = await service.sendTextMessage('user-1', { conversationId: 'conversation-1', body: 'hello' });

    expect(message.body).toBe('hello');
    expect(bans.assertNotBanned).toHaveBeenCalledWith('user-1', undefined);
    expect(conversations.isMember).toHaveBeenCalledWith('conversation-1', 'user-1');
  });

  it('links attachments when sending a message with attachment ids', async () => {
    const prisma: any = {
      message: {
        create: jest.fn(({ data }) => ({ id: 'message-1', kind: MessageKind.TEXT, attachments: data.attachments, ...data }))
      },
      conversationMember: {
        findMany: jest.fn(() => [])
      }
    };
    const bans: any = { assertNotBanned: jest.fn() };
    const conversations: any = { isMember: jest.fn(() => true) };
    const service = new MessagesService(prisma, bans, { record: jest.fn() } as any, conversations, { notifyNewMessage: jest.fn() } as any);

    await service.sendTextMessage('user-1', {
      conversationId: 'conversation-1',
      body: 'file attached',
      attachmentIds: ['attachment-1']
    });

    expect(prisma.message.create).toHaveBeenCalledWith({
      data: {
        conversationId: 'conversation-1',
        senderId: 'user-1',
        kind: MessageKind.TEXT,
        body: 'file attached',
        attachments: { connect: [{ id: 'attachment-1' }] }
      },
      include: { attachments: true }
    });
  });

  it('rejects sending to a conversation the user has not joined', async () => {
    const prisma: any = { message: { create: jest.fn() } };
    const bans: any = { assertNotBanned: jest.fn() };
    const conversations: any = { isMember: jest.fn(() => false) };
    const service = new MessagesService(prisma, bans, { record: jest.fn() } as any, conversations, { notifyNewMessage: jest.fn() } as any);

    await expect(
      service.sendTextMessage('user-1', { conversationId: 'conversation-1', body: 'hello' })
    ).rejects.toThrow('Not a conversation member');

    expect(prisma.message.create).not.toHaveBeenCalled();
  });

  it('notifies other conversation members without notifying the sender', async () => {
    const prisma: any = {
      message: {
        create: jest.fn(({ data }) => ({ id: 'message-1', kind: MessageKind.TEXT, ...data }))
      },
      conversationMember: {
        findMany: jest.fn(() => [{ userId: 'user-1' }, { userId: 'user-2' }, { userId: 'user-3' }])
      }
    };
    const notifications: any = { notifyNewMessage: jest.fn() };
    const service = new MessagesService(
      prisma,
      { assertNotBanned: jest.fn() } as any,
      { record: jest.fn() } as any,
      { isMember: jest.fn(() => true) } as any,
      notifications
    );

    const message = await service.sendTextMessage('user-1', { conversationId: 'conversation-1', body: 'hello' });

    expect(prisma.conversationMember.findMany).toHaveBeenCalledWith({
      where: { conversationId: 'conversation-1' },
      select: { userId: true }
    });
    expect(notifications.notifyNewMessage).toHaveBeenCalledWith('user-2', message);
    expect(notifications.notifyNewMessage).toHaveBeenCalledWith('user-3', message);
    expect(notifications.notifyNewMessage).not.toHaveBeenCalledWith('user-1', message);
  });

  it('edits a message and records audit', async () => {
    const prisma: any = {
      message: {
        update: jest.fn(({ data }) => ({ id: 'message-1', ...data }))
      }
    };
    const audit: any = { record: jest.fn() };
    const service = new MessagesService(prisma, { assertNotBanned: jest.fn() } as any, audit, { isMember: jest.fn() } as any, { notifyNewMessage: jest.fn() } as any);

    const message = await service.editMessage('admin-1', 'message-1', 'updated');

    expect(message.body).toBe('updated');
    expect(message.editedAt).toBeInstanceOf(Date);
    expect(audit.record).toHaveBeenCalledWith('admin-1', AuditAction.MESSAGE_EDITED, 'message-1', { body: 'updated' });
  });

  it('soft deletes a message and records audit', async () => {
    const prisma: any = {
      message: {
        update: jest.fn(({ data }) => ({ id: 'message-1', ...data }))
      }
    };
    const audit: any = { record: jest.fn() };
    const service = new MessagesService(prisma, { assertNotBanned: jest.fn() } as any, audit, { isMember: jest.fn() } as any, { notifyNewMessage: jest.fn() } as any);

    const message = await service.deleteMessage('admin-1', 'message-1');

    expect(message.deletedAt).toBeInstanceOf(Date);
    expect(audit.record).toHaveBeenCalledWith('admin-1', AuditAction.MESSAGE_DELETED, 'message-1');
  });
});
