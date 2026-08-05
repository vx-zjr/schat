import { Injectable } from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type AuditClient = Pick<Prisma.TransactionClient, 'auditLog'>;

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  record(
    actorId: string,
    action: AuditAction,
    targetId?: string,
    metadata?: Prisma.InputJsonValue,
    client: AuditClient = this.prisma
  ) {
    return client.auditLog.create({
      data: { actorId, action, targetId, metadata }
    });
  }
}

