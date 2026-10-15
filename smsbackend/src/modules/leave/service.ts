import { LeaveRequestStatus, Role } from '@prisma/client';
import { Request } from 'express';
import prisma from '../../config/database';
import { AppError } from '../../utils/AppError';
import { buildPaginationMeta } from '../../utils/apiResponse';
import { getPaginationOptions } from '../../utils/pagination';

export class LeaveService {
  async create(data: { type: string; startDate: Date; endDate: Date; reason: string }, requesterId: string) {
    const requester = await prisma.user.findUnique({ where: { id: requesterId }, select: { role: true, status: true, deletedAt: true } });
    if (!requester || requester.deletedAt || requester.status !== 'ACTIVE') throw AppError.forbidden('Active account required');
    if (requester.role !== Role.STUDENT && requester.role !== Role.TEACHER) throw AppError.forbidden('Only students and teachers can submit leave requests');
    if (data.startDate < new Date(new Date().toDateString())) throw AppError.badRequest('Leave start date cannot be in the past');
    return prisma.leaveRequest.create({ data: { ...data, requesterId } as never });
  }

  async list(req: Request, user: { id: string; role: string }) {
    const { page, limit, skip } = getPaginationOptions(req);
    const where: Record<string, unknown> = user.role === Role.ADMIN ? {} : { requesterId: user.id };
    if (req.query.status) where.status = String(req.query.status);
    const [data, total] = await Promise.all([
      prisma.leaveRequest.findMany({ where, include: { requester: { select: { firstName: true, lastName: true, role: true } }, reviewedBy: { select: { firstName: true, lastName: true } } }, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.leaveRequest.count({ where }),
    ]);
    return { data, meta: buildPaginationMeta(total, page, limit) };
  }

  async review(id: string, status: 'APPROVED' | 'REJECTED', reviewNotes: string | undefined, actorId: string) {
    const leave = await prisma.leaveRequest.findUnique({ where: { id } });
    if (!leave) throw AppError.notFound('Leave request not found');
    if (leave.status !== LeaveRequestStatus.PENDING) throw AppError.badRequest('Only pending leave requests can be reviewed');
    return prisma.leaveRequest.update({ where: { id }, data: { status, reviewNotes, reviewedById: actorId, reviewedAt: new Date() } });
  }

  async cancel(id: string, requesterId: string) {
    const leave = await prisma.leaveRequest.findUnique({ where: { id } });
    if (!leave) throw AppError.notFound('Leave request not found');
    if (leave.requesterId !== requesterId) throw AppError.forbidden('You can only cancel your own leave request');
    if (leave.status !== LeaveRequestStatus.PENDING) throw AppError.badRequest('Only pending leave requests can be cancelled');
    return prisma.leaveRequest.update({ where: { id }, data: { status: LeaveRequestStatus.CANCELLED } });
  }
}
