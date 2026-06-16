import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { assertPermission } from './permissions';
import { AuthenticatedRequest } from './types';

export const PERMISSION_KEY = 'permission';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const permission = this.reflector.get<string | undefined>(PERMISSION_KEY, context.getHandler());
    if (!permission) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    assertPermission(request.user, permission);
    return true;
  }
}

