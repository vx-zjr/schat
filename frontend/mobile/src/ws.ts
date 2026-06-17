import { io, Socket } from 'socket.io-client';
import { Message } from './types';

export class SchatMobileWsClient {
  private socket: Socket | null = null;

  constructor(private readonly url: string) {}

  connect(accessToken: string) {
    this.disconnect();
    this.socket = io(this.url, {
      auth: { token: `Bearer ${accessToken}` },
      transports: ['websocket', 'polling']
    });
    return this.socket;
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }

  joinConversation(conversationId: string) {
    this.socket?.emit('conversation.join', { conversationId });
  }

  leaveConversation(conversationId: string) {
    this.socket?.emit('conversation.leave', { conversationId });
  }

  sendMessage(conversationId: string, body: string, attachmentIds?: string[]) {
    this.socket?.emit('message.send', { conversationId, body, attachmentIds });
  }

  onMessageCreated(cb: (message: Message) => void) {
    this.socket?.on('message.created', cb);
    return () => this.socket?.off('message.created', cb);
  }

  onUserBanned(cb: (data: { userId?: string }) => void) {
    this.socket?.on('user.banned', cb);
    return () => this.socket?.off('user.banned', cb);
  }
}
