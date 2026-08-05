import { AuditAction, UserRole, UserStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { UsersService } from './users.service';

describe('UsersService', () => {
  it('always provisions a USER and its MASTER conversation atomically', async () => {
    const tx = {
      user: {
        findMany: jest.fn().mockResolvedValue([{ id: 'master-1' }]),
        create: jest.fn(({ data }) => Promise.resolve({ id: 'user-1', ...data }))
      },
      conversation: {
        create: jest.fn(({ data }) => Promise.resolve({ id: 'direct-1', ...data }))
      },
      auditLog: { create: jest.fn().mockResolvedValue({ id: 'audit-1' }) }
    };
    const prisma: any = { $transaction: jest.fn((work) => work(tx)) };
    const audit: any = { record: jest.fn().mockResolvedValue(undefined) };
    const service = new UsersService(prisma, audit);

    const user = await service.createUser('delegated-operator', {
      username: 'alice',
      password: 'secret'
    });

    expect(user.role).toBe(UserRole.USER);
    expect(tx.conversation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          directUserId: 'user-1',
          members: { create: [{ userId: 'master-1' }, { userId: 'user-1' }] }
        })
      })
    );
    expect(audit.record).toHaveBeenNthCalledWith(
      1,
      'delegated-operator',
      AuditAction.USER_CREATED,
      'user-1',
      { username: 'alice' },
      tx
    );
    expect(audit.record).toHaveBeenNthCalledWith(
      2,
      'delegated-operator',
      AuditAction.CONVERSATION_CREATED,
      'direct-1',
      { memberIds: ['master-1', 'user-1'], kind: 'direct' },
      tx
    );
  });

  it.each([[[]], [[{ id: 'm1' }, { id: 'm2' }]]])(
    'rejects provisioning when the MASTER set is invalid',
    async (masters) => {
      const tx: any = { user: { findMany: jest.fn().mockResolvedValue(masters) } };
      const prisma: any = { $transaction: jest.fn((work) => work(tx)) };
      const service = new UsersService(prisma, { record: jest.fn() } as any);

      await expect(
        service.createUser('actor-1', {
          username: 'alice',
          password: 'secret'
        })
      ).rejects.toThrow('exactly one MASTER');
    }
  );

  it('writes audit records through the transaction client', async () => {
    const tx: any = {
      auditLog: { create: jest.fn().mockResolvedValue({ id: 'audit-1' }) }
    };
    const prisma: any = {
      auditLog: { create: jest.fn() }
    };
    const service = new AuditService(prisma);

    await service.record('actor-1', AuditAction.USER_CREATED, 'user-1', { username: 'alice' }, tx);

    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: {
        actorId: 'actor-1',
        action: AuditAction.USER_CREATED,
        targetId: 'user-1',
        metadata: { username: 'alice' }
      }
    });
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
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
