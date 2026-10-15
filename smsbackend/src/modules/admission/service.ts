import crypto from 'crypto';
import { AdmissionStatus, Role, UserStatus } from '@prisma/client';
import prisma from '../../config/database';
import { AppError } from '../../utils/AppError';
import { hashPassword, generateRandomToken } from '../../utils/password';
import { buildPaginationMeta } from '../../utils/apiResponse';
import { getPaginationOptions } from '../../utils/pagination';
import { Request } from 'express';

export class AdmissionService {
  private applicationNumber() {
    return `ADM-${new Date().getFullYear()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  }

  async create(data: Record<string, unknown>) {
    if (data.desiredClassId) {
      const classRecord = await prisma.class.findUnique({ where: { id: String(data.desiredClassId) } });
      if (!classRecord || classRecord.deletedAt) throw AppError.notFound('Requested class not found');
    }
    return prisma.admissionApplication.create({
      data: { ...data, applicationNumber: this.applicationNumber(), dateOfBirth: data.dateOfBirth ? new Date(String(data.dateOfBirth)) : undefined } as never,
    });
  }

  async list(req: Request) {
    const { page, limit, skip } = getPaginationOptions(req);
    const { status, academicYear, search } = req.query;
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (academicYear) where.academicYear = academicYear;
    if (search) where.OR = [{ firstName: { contains: String(search), mode: 'insensitive' } }, { lastName: { contains: String(search), mode: 'insensitive' } }, { email: { contains: String(search), mode: 'insensitive' } }, { applicationNumber: { contains: String(search), mode: 'insensitive' } }];
    const [data, total] = await Promise.all([
      prisma.admissionApplication.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.admissionApplication.count({ where }),
    ]);
    return { data, meta: buildPaginationMeta(total, page, limit) };
  }

  async get(id: string) {
    const application = await prisma.admissionApplication.findUnique({ where: { id } });
    if (!application) throw AppError.notFound('Admission application not found');
    return application;
  }

  async updateStatus(id: string, status: AdmissionStatus, reviewNotes: string | undefined, actorId: string) {
    const application = await this.get(id);
    if (application.status === AdmissionStatus.ENROLLED) throw AppError.badRequest('Enrolled applications cannot be changed');
    return prisma.admissionApplication.update({ where: { id }, data: { status, reviewNotes, reviewedById: actorId, reviewedAt: new Date() } });
  }

  async convertToStudent(id: string, actorId: string) {
    const application = await this.get(id);
    if (application.status !== AdmissionStatus.ACCEPTED) throw AppError.badRequest('Only accepted applications can be enrolled');
    if (application.convertedStudentId) throw AppError.conflict('Application has already been enrolled');
    if (!application.desiredClassId) throw AppError.unprocessable('Assign a class before enrolling this application');
    const [existingUser, classRecord] = await Promise.all([
      prisma.user.findUnique({ where: { email: application.email } }),
      prisma.class.findUnique({ where: { id: application.desiredClassId } }),
    ]);
    if (existingUser) throw AppError.conflict('An account already exists for this applicant email');
    if (!classRecord || classRecord.deletedAt) throw AppError.notFound('Assigned class not found');
    const enrolled = await prisma.studentProfile.count({ where: { classId: classRecord.id, deletedAt: null } });
    if (enrolled >= classRecord.capacity) throw AppError.unprocessable('Assigned class is at full capacity');
    const user = await prisma.user.create({ data: { email: application.email, password: await hashPassword(generateRandomToken()), firstName: application.firstName, lastName: application.lastName, phone: application.phone, role: Role.STUDENT, status: UserStatus.PENDING_VERIFICATION } });
    const student = await prisma.studentProfile.create({ data: { userId: user.id, studentCode: `STU${Date.now().toString(36).toUpperCase()}${crypto.randomBytes(2).toString('hex').toUpperCase()}`, dateOfBirth: application.dateOfBirth, gender: application.gender, address: application.address, classId: classRecord.id } });
    return prisma.admissionApplication.update({ where: { id }, data: { status: AdmissionStatus.ENROLLED, reviewedById: actorId, reviewedAt: new Date(), convertedStudentId: student.id } });
  }
}
