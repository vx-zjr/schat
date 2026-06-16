import { Inject, Injectable } from '@nestjs/common';
import { NotificationProvider } from './notification-provider';

export const NOTIFICATION_PROVIDERS = 'NOTIFICATION_PROVIDERS';

@Injectable()
export class NotificationsService {
  constructor(@Inject(NOTIFICATION_PROVIDERS) private readonly providers: NotificationProvider[]) {}

  async notifyNewMessage(userId: string, message: unknown) {
    await Promise.all(
      this.providers.map((provider) => provider.send(userId, 'notification.created', { type: 'new_message', message }))
    );
  }
}

