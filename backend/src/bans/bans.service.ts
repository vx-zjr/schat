import { ForbiddenException, Injectable } from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';

export type CreateBanInput = {
  userId?: string;
  ip?: string;
  reason?: string;
};

@Injectable()
export class BansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  listBans() {
    return this.prisma.ban.findMany({ where: { liftedAt: null }, orderBy: { createdAt: 'desc' } });
  }

  async createBan(actorId: string, input: CreateBanInput) {
    const ban = await this.prisma.ban.create({ data: { ...input, createdBy: actorId } });
    await this.audit.record(actorId, AuditAction.USER_BANNED, ban.id, {
      userId: input.userId,
      ip: input.ip,
      reason: input.reason
    });
    return ban;
  }

  async liftBan(actorId: string, id: string) {
    const ban = await this.prisma.ban.update({ where: { id }, data: { liftedAt: new Date() } });
    await this.audit.record(actorId, AuditAction.USER_UNBANNED, id, { userId: ban.userId, ip: ban.ip });
    return ban;
  }

  async assertNotBanned(userId?: string, ip?: string) {
    const ban = await this.prisma.ban.findFirst({
      where: {
        liftedAt: null,
        OR: [{ userId: userId ?? undefined }, { ip: ip ?? undefined }]
      }
    });
    if (ban) {
      throw new ForbiddenException('Banned');
    }
  }
}

