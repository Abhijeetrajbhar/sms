import { Response } from 'express';
import prisma from '../../config/database';
import { ApiResponse, buildPaginationMeta } from '../../utils/apiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import { getPaginationOptions } from '../../utils/pagination';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';

export const getAuditLogs = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { page, limit, skip, sortBy, sortOrder } = getPaginationOptions(req);
  const { action, entity, actorId } = req.query;

  const where: Record<string, unknown> = {
    ...(action && { action: action as string }),
    ...(entity && { entity: entity as string }),
    ...(actorId && { actorId: actorId as string }),
  };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        actor: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
      },
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  ApiResponse.success(res, {
    data: logs,
    meta: buildPaginationMeta(total, page, limit),
  });
});
