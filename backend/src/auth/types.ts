import { Request } from 'express';
import { UserRole } from '@prisma/client';

export type AuthUser = {
  id: string;
  username: string;
  role: UserRole;
  permissions: string[];
};

export type AuthenticatedRequest = Request & { user: AuthUser };

