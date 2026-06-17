import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ApnsNotificationProvider } from './apns-notification.provider';
import { FcmNotificationProvider } from './fcm-notification.provider';
import { NotificationsController } from './notifications.controller';
import { NOTIFICATION_PROVIDERS, NotificationsService } from './notifications.service';
import { WebPushNotificationProvider } from './web-push-notification.provider';
import { WebsocketNotificationProvider } from './websocket-notification.provider';

@Module({
  imports: [AuthModule],
  controllers: [NotificationsController],
  providers: [
    WebsocketNotificationProvider,
    WebPushNotificationProvider,
    FcmNotificationProvider,
    ApnsNotificationProvider,
    {
      provide: NOTIFICATION_PROVIDERS,
      useFactory: (
        ws: WebsocketNotificationProvider,
        webPush: WebPushNotificationProvider,
        fcm: FcmNotificationProvider,
        apns: ApnsNotificationProvider
      ) => [ws, webPush, fcm, apns],
      inject: [WebsocketNotificationProvider, WebPushNotificationProvider, FcmNotificationProvider, ApnsNotificationProvider]
    },
    NotificationsService
  ],
  exports: [NotificationsService, WebsocketNotificationProvider]
})
export class NotificationsModule {}

