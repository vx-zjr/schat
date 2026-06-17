import { Injectable } from '@nestjs/common';
import { App, applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { AppConfig } from '../config/app-config';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationProvider } from './notification-provider';

@Injectable()
export class FcmNotificationProvider implements NotificationProvider {
  private readonly app?: App;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfig
  ) {
    if (this.config.fcmProjectId && this.config.googleApplicationCredentials) {
      this.app =
        getApps().find((app) => app.name === 'schat-fcm') ??
        initializeApp(
          {
            credential: applicationDefault(),
            projectId: this.config.fcmProjectId
          },
          'schat-fcm'
        );
    }
  }

  async send(userId: string, event: string, payload: unknown): Promise<void> {
    if (!this.app) {
      return;
    }

    const subscriptions = await this.prisma.notificationSubscription.findMany({
      where: { userId, provider: 'fcm', revokedAt: null }
    });
    const data = this.toStringData({ event, ...(payload as object) });
    await Promise.allSettled(
      subscriptions.map((subscription) =>
        getMessaging(this.app).send({
          token: subscription.endpoint,
          notification: { title: 'schat', body: 'New message' },
          data
        })
      )
    );
  }

  private toStringData(payload: Record<string, unknown>): Record<string, string> {
    return Object.fromEntries(
      Object.entries(payload)
        .filter(([, value]) => value !== undefined && value !== null)
        .map(([key, value]) => [key, String(value)])
    );
  }
}
