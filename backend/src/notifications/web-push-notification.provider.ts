import { Injectable } from '@nestjs/common';
import webpush from 'web-push';
import { AppConfig } from '../config/app-config';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationProvider } from './notification-provider';

@Injectable()
export class WebPushNotificationProvider implements NotificationProvider {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfig
  ) {
    if (this.config.vapidPublicKey && this.config.vapidPrivateKey && this.config.vapidSubject) {
      webpush.setVapidDetails(this.config.vapidSubject, this.config.vapidPublicKey, this.config.vapidPrivateKey);
    }
  }

  async send(userId: string, event: string, payload: unknown): Promise<void> {
    if (!this.config.vapidPublicKey || !this.config.vapidPrivateKey || !this.config.vapidSubject) {
      return;
    }

    const subscriptions = await this.prisma.notificationSubscription.findMany({
      where: { userId, provider: 'web-push', revokedAt: null }
    });
    await Promise.allSettled(
      subscriptions
        .filter((subscription) => subscription.p256dh && subscription.auth)
        .map((subscription) =>
          webpush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: {
                p256dh: subscription.p256dh!,
                auth: subscription.auth!
              }
            },
            JSON.stringify({ event, ...(payload as object) }),
            { TTL: 300, urgency: 'normal' }
          )
        )
    );
  }
}
