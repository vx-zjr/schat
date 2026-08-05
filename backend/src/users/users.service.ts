import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { AuditAction, UserRole, UserStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { hashPassword } from '../auth/passwords';
import { PrismaService } from '../prisma/prisma.service';

export type CreateUserInput = {
  username: string;
  password: string;
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
    const passwordHash = await hashPassword(input.password);
    return this.prisma.$transaction(async (tx) => {
      const masters = await tx.user.findMany({
        where: { role: UserRole.MASTER },
        select: { id: true },
        take: 2
      });
      if (masters.length !== 1) {
        throw new ServiceUnavailableException('User provisioning requires exactly one MASTER');
      }

      const user = await tx.user.create({
        data: {
          username: input.username,
          passwordHash,
          role: UserRole.USER,
          status: UserStatus.ACTIVE,
          permissions: []
        }
      });
      const conversation = await tx.conversation.create({
        data: {
          directUserId: user.id,
          members: { create: [{ userId: masters[0].id }, { userId: user.id }] }
        }
      });
      await this.audit.record(actorId, AuditAction.USER_CREATED, user.id, { username: user.username }, tx);
      await this.audit.record(
        actorId,
        AuditAction.CONVERSATION_CREATED,
        conversation.id,
        { memberIds: [masters[0].id, user.id], kind: 'direct' },
        tx
      );
      return user;
    });
  }

  async updateUser(actorId: string, id: string, input: { status?: UserStatus }) {
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
