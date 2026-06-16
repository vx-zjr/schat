import { io, Socket } from 'socket.io-client';

export interface WsClientConfig {
  url: string;
}

export class SchatWsClient {
  private socket: Socket | null = null;
  private url: string;

  constructor(config: WsClientConfig) {
    this.url = config.url;
  }

  public connect(token: string) {
    if (this.socket) {
      this.socket.disconnect();
    }

    // Connect with token in handshake auth
    this.socket = io(this.url, {
      auth: {
        token: `Bearer ${token}`
      },
      autoConnect: true,
      transports: ['websocket', 'polling']
    });

    return this.socket;
  }

  public disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  public off(event: string, cb?: (...args: any[]) => void) {
    if (!this.socket) return;
    if (cb) {
      this.socket.off(event, cb);
      return;
    }
    this.socket.off(event);
  }

  public isConnected() {
    return this.socket ? this.socket.connected : false;
  }

  // Client to Server emitters
  public joinConversation(conversationId: string) {
    if (!this.socket) return;
    this.socket.emit('conversation.join', { conversationId });
  }

  public leaveConversation(conversationId: string) {
    if (!this.socket) return;
    this.socket.emit('conversation.leave', { conversationId });
  }

  public sendMessage(conversationId: string, body: string, attachmentIds?: string[]) {
    if (!this.socket) return;
    this.socket.emit('message.send', { conversationId, body, attachmentIds });
  }

  public sendTyping(conversationId: string, typing: boolean) {
    if (!this.socket) return;
    this.socket.emit('typing.update', { conversationId, typing });
  }

  // Event Subscription methods
  public onConnect(cb: () => void) {
    this.socket?.on('connect', cb);
    return () => this.off('connect', cb);
  }

  public onDisconnect(cb: (reason: string) => void) {
    this.socket?.on('disconnect', cb);
    return () => this.off('disconnect', cb);
  }

  public onConnectError(cb: (err: any) => void) {
    this.socket?.on('connect_error', cb);
    return () => this.off('connect_error', cb);
  }

  public onMessageCreated(cb: (message: any) => void) {
    this.socket?.on('message.created', cb);
    return () => this.off('message.created', cb);
  }

  public onMessageEdited(cb: (message: any) => void) {
    this.socket?.on('message.edited', cb);
    return () => this.off('message.edited', cb);
  }

  public onMessageDeleted(cb: (message: any) => void) {
    this.socket?.on('message.deleted', cb);
    return () => this.off('message.deleted', cb);
  }

  public onPresenceUpdated(cb: (presence: any) => void) {
    this.socket?.on('presence.updated', cb);
    return () => this.off('presence.updated', cb);
  }

  public onNotificationCreated(cb: (notification: any) => void) {
    this.socket?.on('notification.created', cb);
    return () => this.off('notification.created', cb);
  }

  public onUserBanned(cb: (data: any) => void) {
    this.socket?.on('user.banned', cb);
    return () => this.off('user.banned', cb);
  }
}
