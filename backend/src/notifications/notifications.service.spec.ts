import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  it('uses the websocket provider for foreground notifications', async () => {
    const provider: any = { send: jest.fn() };
    const service = new NotificationsService([provider], {} as any, { vapidPublicKey: 'public' } as any);

    await service.notifyNewMessage('user-1', { id: 'message-1', conversationId: 'conversation-1', body: 'secret text' });

    expect(provider.send).toHaveBeenCalledWith('user-1', 'notification.created', {
      type: 'new_message',
      messageId: 'message-1',
      conversationId: 'conversation-1'
    });
  });

  it('returns the configured VAPID public key', () => {
    const service = new NotificationsService([], {} as any, { vapidPublicKey: 'public' } as any);

    expect(service.getVapidPublicKey()).toEqual({ publicKey: 'public' });
  });

  it('registers a notification subscription for the current user', async () => {
    const prisma: any = {
      notificationSubscription: {
        upsert: jest.fn(({ create }) => ({ id: 'subscription-1', ...create }))
      }
    };
    const service = new NotificationsService([], prisma, { vapidPublicKey: 'public' } as any);

    const subscription = await service.registerSubscription('user-1', {
      provider: 'web-push',
      endpoint: 'https://push.example/subscription',
      keys: { p256dh: 'p256dh', auth: 'auth' },
      platform: 'web',
      deviceId: 'browser-1'
    });

    expect(subscription.id).toBe('subscription-1');
    expect(prisma.notificationSubscription.upsert).toHaveBeenCalledWith({
      where: {
        userId_provider_endpoint: {
          userId: 'user-1',
          provider: 'web-push',
          endpoint: 'https://push.example/subscription'
        }
      },
      create: {
        userId: 'user-1',
        provider: 'web-push',
        endpoint: 'https://push.example/subscription',
        p256dh: 'p256dh',
        auth: 'auth',
        platform: 'web',
        deviceId: 'browser-1',
        lastSeenAt: expect.any(Date)
      },
      update: {
        p256dh: 'p256dh',
        auth: 'auth',
        platform: 'web',
        deviceId: 'browser-1',
        revokedAt: null,
        lastSeenAt: expect.any(Date)
      }
    });
  });

  it('revokes only the current user notification subscription', async () => {
    const prisma: any = {
      notificationSubscription: {
        updateMany: jest.fn(() => ({ count: 1 }))
      }
    };
    const service = new NotificationsService([], prisma, { vapidPublicKey: 'public' } as any);

    await service.deleteSubscription('user-1', 'subscription-1');

    expect(prisma.notificationSubscription.updateMany).toHaveBeenCalledWith({
      where: { id: 'subscription-1', userId: 'user-1' },
      data: { revokedAt: expect.any(Date) }
    });
  });
});

