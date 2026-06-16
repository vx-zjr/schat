import { AuditAction } from '@prisma/client';
import { AuditService } from './audit.service';

describe('AuditService', () => {
  it('appends an audit log', async () => {
    const prisma: any = {
      auditLog: {
        create: jest.fn(({ data }) => ({ id: 'audit-1', ...data }))
      }
    };
    const service = new AuditService(prisma);

    const log = await service.record('actor-1', AuditAction.USER_UPDATED, 'user-1', { field: 'status' });

    expect(log.action).toBe(AuditAction.USER_UPDATED);
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        actorId: 'actor-1',
        action: AuditAction.USER_UPDATED,
        targetId: 'user-1',
        metadata: { field: 'status' }
      }
    });
  });
});

