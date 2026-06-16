import { Injectable } from '@nestjs/common';
import { AuditAction, UserRole, UserStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { hashPassword } from '../auth/passwords';
import { PrismaService } from '../prisma/prisma.service';

export type CreateUserInput = {
  username: string;
  password: string;
  role?: UserRole;
};

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  listUsers() {
    return this.prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async createUser(actorId: string, input: CreateUserInput) {
    const user = await this.prisma.user.create({
      data: {
        username: input.username,
        passwordHash: await hashPassword(input.password),
        role: input.role ?? UserRole.USER,
        status: UserStatus.ACTIVE,
        permissions: []
      }
    });
    await this.audit.record(actorId, AuditAction.USER_CREATED, user.id, { username: user.username });
    return user;
  }

  async updateUser(actorId: string, id: string, input: { status?: UserStatus; role?: UserRole }) {
    const user = await this.prisma.user.update({ where: { id }, data: input });
    await this.audit.record(actorId, AuditAction.USER_UPDATED, id, input);
    return user;
  }

  async updatePermissions(actorId: string, id: string, permissions: string[]) {
    const user = await this.prisma.user.update({ where: { id }, data: { permissions } });
    await this.audit.record(actorId, AuditAction.USER_PERMISSION_UPDATED, id, { permissions });
    return user;
  }
}
