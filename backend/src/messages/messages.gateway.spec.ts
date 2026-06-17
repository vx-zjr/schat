import { WsException } from '@nestjs/websockets';
import { MessagesGateway } from './messages.gateway';

function createClient(userId = 'user-1') {
  const emit = jest.fn();
  return {
    data: { user: { id: userId } },
    join: jest.fn(),
    leave: jest.fn(),
    to: jest.fn(() => ({ emit }))
  };
}

describe('MessagesGateway', () => {
  it('binds the websocket notification provider to the socket server', () => {
    const websocketNotifications = { bind: jest.fn() };
    const gateway = new (MessagesGateway as any)({}, {}, websocketNotifications, { socketIoRedisEnabled: false });
    const server = { adapter: jest.fn() };

    gateway.afterInit(server);

    expect(websocketNotifications.bind).toHaveBeenCalledWith(server);
    expect(server.adapter).not.toHaveBeenCalled();
  });

  it('rejects joining a room when the socket user is not a conversation member', async () => {
    const conversations = { isMember: jest.fn(() => false) };
    const gateway = new (MessagesGateway as any)({});
    gateway.conversations = conversations;
    const client = createClient();

    await expect(
      Promise.resolve().then(() => gateway.joinConversation(client, { conversationId: 'conversation-1' }))
    ).rejects.toBeInstanceOf(WsException);

    expect(conversations.isMember).toHaveBeenCalledWith('conversation-1', 'user-1');
    expect(client.join).not.toHaveBeenCalled();
  });

  it('allows a member socket to join its conversation room', async () => {
    const conversations = { isMember: jest.fn(() => true) };
    const gateway = new (MessagesGateway as any)({});
    gateway.conversations = conversations;
    const client = createClient();

    await expect(gateway.joinConversation(client, { conversationId: 'conversation-1' })).resolves.toEqual({ status: 'ok' });

    expect(client.join).toHaveBeenCalledWith('conversation-1');
  });

  it('rejects typing broadcasts when the socket user is not a conversation member', async () => {
    const conversations = { isMember: jest.fn(() => false) };
    const gateway = new (MessagesGateway as any)({});
    gateway.conversations = conversations;
    const client = createClient();

    await expect(
      Promise.resolve().then(() => gateway.typing(client, { conversationId: 'conversation-1', typing: true }))
    ).rejects.toBeInstanceOf(WsException);

    expect(conversations.isMember).toHaveBeenCalledWith('conversation-1', 'user-1');
    expect(client.to).not.toHaveBeenCalled();
  });
});
