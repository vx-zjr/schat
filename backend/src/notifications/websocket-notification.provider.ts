import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';
import { NotificationProvider } from './notification-provider';

@Injectable()
export class WebsocketNotificationProvider implements NotificationProvider {
  private server?: Server;

  bind(server: Server) {
    this.server = server;
  }

  async send(userId: string, event: string, payload: unknown): Promise<void> {
    this.server?.to(`user:${userId}`).emit(event, payload);
  }
}

