import { SetMetadata } from '@nestjs/common';
import { PERMISSION_KEY } from './permissions.guard';

export function RequirePermission(permission: string) {
  return SetMetadata(PERMISSION_KEY, permission);
}

