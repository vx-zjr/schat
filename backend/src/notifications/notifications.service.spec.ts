import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  it('uses the websocket provider for foreground notifications', async () => {
    const provider: any = { send: jest.fn() };
    const service = new NotificationsService([provider]);

    await service.notifyNewMessage('user-1', { id: 'message-1' });

    expect(provider.send).toHaveBeenCalledWith('user-1', 'notification.created', { type: 'new_message', message: { id: 'message-1' } });
  });
});

