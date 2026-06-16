import { Module } from '@nestjs/common';
import { NOTIFICATION_PROVIDERS, NotificationsService } from './notifications.service';
import { WebsocketNotificationProvider } from './websocket-notification.provider';

@Module({
  providers: [
    WebsocketNotificationProvider,
    { provide: NOTIFICATION_PROVIDERS, useFactory: (ws: WebsocketNotificationProvider) => [ws], inject: [WebsocketNotificationProvider] },
    NotificationsService
  ],
  exports: [NotificationsService, WebsocketNotificationProvider]
})
export class NotificationsModule {}

