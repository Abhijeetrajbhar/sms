import { AcademicCalendarEventType } from '@prisma/client';
import prisma from '../../config/database';
import { AppError } from '../../utils/AppError';
import { buildPaginationMeta } from '../../utils/apiResponse';
import { getPaginationOptions } from '../../utils/pagination';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';
import { getTeacherScope } from '../teacher/access';

export class CalendarService {
  async list(req: AuthenticatedRequest) {
    const { page, limit, skip } = getPaginationOptions(req);
    const { academicYear, type, from, to, classId } = req.query;
    const where: Record<string, unknown> = {};
    if (academicYear) where.academicYear = String(academicYear);
    if (type) where.type = type as AcademicCalendarEventType;
    if (from || to) where.AND = [{ startDate: to ? { lte: new Date(String(to)) } : {} }, { endDate: from ? { gte: new Date(String(from)) } : {} }];
    if (req.user!.role !== 'ADMIN') where.isPublished = true;
    if (req.user!.role === 'TEACHER') {
      const scope = await getTeacherScope(req.user!.id);
      where.OR = [{ classId: null }, { classId: { in: scope.classIds } }];
    } else if (classId) where.classId = String(classId);
    const [data, total] = await Promise.all([
      prisma.academicCalendarEvent.findMany({ where, orderBy: [{ startDate: 'asc' }, { createdAt: 'desc' }], skip, take: limit }),
      prisma.academicCalendarEvent.count({ where }),
    ]);
    return { data, meta: buildPaginationMeta(total, page, limit) };
  }

  async create(data: Record<string, unknown>, actorId: string) {
    if (data.classId) await this.assertClass(String(data.classId));
    return prisma.academicCalendarEvent.create({ data: { ...data, createdById: actorId } as never });
  }

  async update(id: string, data: Record<string, unknown>, actorId: string) {
    const existing = await prisma.academicCalendarEvent.findUnique({ where: { id } });
    if (!existing) throw AppError.notFound('Calendar event not found');
    if (data.classId) await this.assertClass(String(data.classId));
    const startDate = data.startDate ? new Date(String(data.startDate)) : existing.startDate;
    const endDate = data.endDate ? new Date(String(data.endDate)) : existing.endDate;
    if (endDate < startDate) throw AppError.badRequest('End date must be on or after start date');
    return prisma.academicCalendarEvent.update({ where: { id }, data: { ...data, updatedById: actorId } as never });
  }

  async remove(id: string) {
    const event = await prisma.academicCalendarEvent.findUnique({ where: { id } });
    if (!event) throw AppError.notFound('Calendar event not found');
    await prisma.academicCalendarEvent.delete({ where: { id } });
  }

  private async assertClass(classId: string) {
    const classRecord = await prisma.class.findUnique({ where: { id: classId } });
    if (!classRecord || classRecord.deletedAt) throw AppError.notFound('Class not found');
  }
}
