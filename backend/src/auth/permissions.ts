import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';

export type PermissionUser = {
  role: UserRole;
  permissions: string[];
};

export function assertPermission(user: PermissionUser, permission: string): void {
  if (user.role === UserRole.MASTER || user.permissions.includes(permission)) {
    return;
  }

  throw new ForbiddenException('Missing permission');
}

