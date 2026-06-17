import { Inject, Injectable } from '@nestjs/common';
import { AppConfig } from '../config/app-config';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterNotificationSubscriptionDto } from './dto';
import { NotificationProvider } from './notification-provider';

export const NOTIFICATION_PROVIDERS = 'NOTIFICATION_PROVIDERS';

@Injectable()
export class NotificationsService {
  constructor(
    @Inject(NOTIFICATION_PROVIDERS) private readonly providers: NotificationProvider[],
    private readonly prisma: PrismaService,
    private readonly config: AppConfig
  ) {}

  getVapidPublicKey() {
    return { publicKey: this.config.vapidPublicKey ?? null };
  }

  registerSubscription(userId: string, input: RegisterNotificationSubscriptionDto) {
    const now = new Date();
    return this.prisma.notificationSubscription.upsert({
      where: {
        userId_provider_endpoint: {
          userId,
          provider: input.provider,
          endpoint: input.endpoint
        }
      },
      create: {
        userId,
        provider: input.provider,
        endpoint: input.endpoint,
        p256dh: input.keys?.p256dh,
        auth: input.keys?.auth,
        platform: input.platform,
        deviceId: input.deviceId,
        lastSeenAt: now
      },
      update: {
        p256dh: input.keys?.p256dh,
        auth: input.keys?.auth,
        platform: input.platform,
        deviceId: input.deviceId,
        revokedAt: null,
        lastSeenAt: now
      }
    });
  }

  deleteSubscription(userId: string, id: string) {
    return this.prisma.notificationSubscription.updateMany({
      where: { id, userId },
      data: { revokedAt: new Date() }
    });
  }

  async notifyNewMessage(userId: string, message: unknown) {
    const payload = this.createNewMessagePayload(message);
    await Promise.allSettled(
      this.providers.map((provider) => provider.send(userId, 'notification.created', payload))
    );
  }

  private createNewMessagePayload(message: unknown) {
    const record = message as { id?: string; conversationId?: string };
    return {
      type: 'new_message',
      messageId: record.id,
      conversationId: record.conversationId
    };
  }
}

