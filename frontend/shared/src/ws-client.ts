import { io, Socket } from 'socket.io-client';

export interface WsClientConfig {
  url: string;
}

type EventListener = (...args: any[]) => void;

export class SchatWsClient {
  private socket: Socket | null = null;
  private url: string;
  private listeners = new Map<string, Set<EventListener>>();

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

    this.listeners.forEach((callbacks, event) => {
      callbacks.forEach((callback) => this.socket?.on(event, callback));
    });

    return this.socket;
  }

  public disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  public off(event: string, cb?: EventListener) {
    if (cb) {
      const callbacks = this.listeners.get(event);
      callbacks?.delete(cb);
      if (callbacks?.size === 0) {
        this.listeners.delete(event);
      }
      this.socket?.off(event, cb);
      return;
    }
    this.listeners.delete(event);
    this.socket?.off(event);
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

  private subscribe(event: string, cb: EventListener) {
    const callbacks = this.listeners.get(event) ?? new Set<EventListener>();
    if (!callbacks.has(cb)) {
      callbacks.add(cb);
      this.listeners.set(event, callbacks);
      this.socket?.on(event, cb);
    }
    return () => this.off(event, cb);
  }

  // Event Subscription methods
  public onConnect(cb: () => void) {
    return this.subscribe('connect', cb);
  }

  public onDisconnect(cb: (reason: string) => void) {
    return this.subscribe('disconnect', cb);
  }

  public onConnectError(cb: (err: any) => void) {
    return this.subscribe('connect_error', cb);
  }

  public onMessageCreated(cb: (message: any) => void) {
    return this.subscribe('message.created', cb);
  }

  public onMessageEdited(cb: (message: any) => void) {
    return this.subscribe('message.edited', cb);
  }

  public onMessageDeleted(cb: (message: any) => void) {
    return this.subscribe('message.deleted', cb);
  }

  public onPresenceUpdated(cb: (presence: any) => void) {
    return this.subscribe('presence.updated', cb);
  }

  public onNotificationCreated(cb: (notification: any) => void) {
    return this.subscribe('notification.created', cb);
  }

  public onUserBanned(cb: (data: any) => void) {
    return this.subscribe('user.banned', cb);
  }
}
