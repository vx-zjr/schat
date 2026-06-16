import { AuditAction } from '@prisma/client';
import { BansService } from './bans.service';

describe('BansService', () => {
  it('creates a ban and records audit', async () => {
    const prisma: any = {
      ban: {
        create: jest.fn(({ data }) => ({ id: 'ban-1', ...data }))
      }
    };
    const audit: any = { record: jest.fn() };
    const service = new BansService(prisma, audit);

    const ban = await service.createBan('admin-1', { userId: 'user-1', reason: 'spam' });

    expect(ban.userId).toBe('user-1');
    expect(audit.record).toHaveBeenCalledWith('admin-1', AuditAction.USER_BANNED, 'ban-1', {
      userId: 'user-1',
      ip: undefined,
      reason: 'spam'
    });
  });

  it('detects an active user ban', async () => {
    const prisma: any = {
      ban: {
        findFirst: jest.fn(() => ({ id: 'ban-1', userId: 'user-1', liftedAt: null }))
      }
    };
    const service = new BansService(prisma, { record: jest.fn() } as any);

    await expect(service.assertNotBanned('user-1')).rejects.toThrow('Banned');
  });
});

