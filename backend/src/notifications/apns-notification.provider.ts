import { Injectable } from '@nestjs/common';
import apn from '@parse/node-apn';
import { AppConfig } from '../config/app-config';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationProvider } from './notification-provider';

@Injectable()
export class ApnsNotificationProvider implements NotificationProvider {
  private readonly provider?: apn.Provider;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfig
  ) {
    if (this.config.apnsKeyPath && this.config.apnsKeyId && this.config.apnsTeamId) {
      this.provider = new apn.Provider({
        token: {
          key: this.config.apnsKeyPath,
          keyId: this.config.apnsKeyId,
          teamId: this.config.apnsTeamId
        },
        production: this.config.apnsProduction
      });
    }
  }

  async send(userId: string, event: string, payload: unknown): Promise<void> {
    if (!this.provider) {
      return;
    }

    const subscriptions = await this.prisma.notificationSubscription.findMany({
      where: { userId, provider: 'apns', revokedAt: null }
    });
    await Promise.allSettled(
      subscriptions.map((subscription) => {
        const notification = new apn.Notification({
          topic: this.config.apnsBundleId,
          alert: 'New message',
          payload: { event, ...(payload as object) },
          pushType: 'alert'
        });
        return this.provider!.send(notification, subscription.endpoint);
      })
    );
  }
}
