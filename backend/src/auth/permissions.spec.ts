import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { assertPermission } from './permissions';

describe('assertPermission', () => {
  it('allows the master role', () => {
    expect(() => assertPermission({ role: UserRole.MASTER, permissions: [] }, 'messages.edit')).not.toThrow();
  });

  it('allows a matching user permission', () => {
    expect(() => assertPermission({ role: UserRole.USER, permissions: ['messages.edit'] }, 'messages.edit')).not.toThrow();
  });

  it('rejects a user without the permission', () => {
    expect(() => assertPermission({ role: UserRole.USER, permissions: [] }, 'messages.edit')).toThrow(ForbiddenException);
  });
});

