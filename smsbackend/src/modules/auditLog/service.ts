import prisma from '../../config/database';
import { AuditAction, Prisma } from '@prisma/client';
import logger from '../../utils/logger';

interface AuditLogInput {
  actorId: string;
  action: AuditAction;
  entity: string;
  entityId?: string;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string;
  userAgent?: string;
}

export async function auditLog(input: AuditLogInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: input.actorId,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        metadata: input.metadata,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      },
    });
  } catch (error) {
    // Never block request for audit log failure
    logger.error('Audit log failed:', error);
  }
}
