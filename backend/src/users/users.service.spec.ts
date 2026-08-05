import { AuditAction, UserRole, UserStatus } from '@prisma/client';
import { UsersService } from './users.service';

describe('UsersService', () => {
  it('creates a user and records audit', async () => {
    const prisma: any = {
      user: {
        create: jest.fn(({ data }) => ({ id: 'user-1', ...data }))
      }
    };
    const audit: any = { record: jest.fn() };
    const service = new UsersService(prisma, audit);

    const user = await service.createUser('admin-1', { username: 'alice', password: 'secret' });

    expect(user.username).toBe('alice');
    expect(user.passwordHash).not.toBe('secret');
    expect(audit.record).toHaveBeenCalledWith('admin-1', AuditAction.USER_CREATED, 'user-1', { username: 'alice' });
  });

  it('updates permissions and records audit', async () => {
    const prisma: any = {
      user: {
        update: jest.fn(({ data }) => ({ id: 'user-1', role: UserRole.USER, status: UserStatus.ACTIVE, ...data }))
      }
    };
    const audit: any = { record: jest.fn() };
    const service = new UsersService(prisma, audit);

    const user = await service.updatePermissions('admin-1', 'user-1', ['messages.edit']);

    expect(user.permissions).toEqual(['messages.edit']);
    expect(audit.record).toHaveBeenCalledWith('admin-1', AuditAction.USER_PERMISSION_UPDATED, 'user-1', {
      permissions: ['messages.edit']
    });
  });

  it('exposes only MASTER and USER roles', () => {
    expect(Object.values(UserRole)).toEqual([UserRole.MASTER, UserRole.USER]);
  });
});
