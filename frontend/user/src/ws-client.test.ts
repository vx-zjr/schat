import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SchatWsClient } from 'shared';

const mocks = vi.hoisted(() => ({
  io: vi.fn()
}));

vi.mock('socket.io-client', () => ({ io: mocks.io }));

type Listener = (...args: any[]) => void;

class FakeSocket {
  connected = true;
  private listeners = new Map<string, Set<Listener>>();

  on(event: string, callback: Listener) {
    const callbacks = this.listeners.get(event) ?? new Set<Listener>();
    callbacks.add(callback);
    this.listeners.set(event, callbacks);
    return this;
  }

  off(event: string, callback?: Listener) {
    if (!callback) {
      this.listeners.delete(event);
      return this;
    }
    this.listeners.get(event)?.delete(callback);
    return this;
  }

  disconnect() {
    this.connected = false;
    return this;
  }

  emit() {
    return this;
  }

  receive(event: string, payload: unknown) {
    this.listeners.get(event)?.forEach((callback) => callback(payload));
  }
}

describe('SchatWsClient reconnects', () => {
  beforeEach(() => {
    mocks.io.mockReset();
  });

  it('preserves message and ban subscriptions when token refresh replaces the socket', () => {
    const firstSocket = new FakeSocket();
    const refreshedSocket = new FakeSocket();
    mocks.io
      .mockReturnValueOnce(firstSocket)
      .mockReturnValueOnce(refreshedSocket);
    const client = new SchatWsClient({ url: 'https://chat.example.test' });
    const messageIds: string[] = [];
    const bannedUserIds: string[] = [];

    client.connect('access-token-1');
    client.onMessageCreated((message: { id: string }) => messageIds.push(message.id));
    client.onUserBanned((event: { userId: string }) => bannedUserIds.push(event.userId));
    firstSocket.receive('message.created', { id: 'before-refresh' });

    client.connect('access-token-2');
    refreshedSocket.receive('message.created', { id: 'after-refresh' });
    refreshedSocket.receive('user.banned', { userId: 'user-1' });

    expect(messageIds).toEqual(['before-refresh', 'after-refresh']);
    expect(bannedUserIds).toEqual(['user-1']);
  });
});
