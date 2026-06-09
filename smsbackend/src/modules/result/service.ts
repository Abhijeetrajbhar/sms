import prisma from '../../config/database';
import { AuditAction, ResultEntryStatus } from '@prisma/client';
import { AppError } from '../../utils/AppError';
import { buildPaginationMeta } from '../../utils/apiResponse';
import { getPaginationOptions } from '../../utils/pagination';
import { calculateGrade, calculateGPA, calculatePercentage, calculateOverallGPA } from '../../utils/grading';
import { auditLog } from '../auditLog/service';
import { notificationQueue } from '../../config/queue';
import { Request } from 'express';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';
import { assertTeacherSubjectAccess, getTeacherScope } from '../teacher/access';

interface ResultEntry {
  studentId: string;
  subjectId: string;
  marksObtained: number;
  maxMarks?: number;
  remarks?: string;
}

export class ResultService {
  private validateMarks(marksObtained: number, maxMarks: number): void {
    if (!Number.isFinite(maxMarks) || maxMarks <= 0) {
      throw AppError.badRequest('Maximum marks must be greater than zero');
    }
    if (!Number.isFinite(marksObtained) || marksObtained < 0) {
      throw AppError.badRequest('Marks obtained cannot be negative');
    }
    if (marksObtained > maxMarks) {
      throw AppError.badRequest('Marks obtained cannot exceed maximum marks');
    }
  }

  private async validateEntryAccess(
    data: { studentId: string; classId: string; subjectId: string },
    user: NonNullable<AuthenticatedRequest['user']>
  ) {
    const student = await prisma.studentProfile.findUnique({
      where: { id: data.studentId },
      select: { classId: true, deletedAt: true },
    });
    if (!student || student.deletedAt) throw AppError.notFound('Active student not found');
    if (student.classId !== data.classId) throw AppError.unprocessable('Student does not belong to the selected class or section');
    if (user.role === 'TEACHER') await assertTeacherSubjectAccess(user, data.classId, data.subjectId);
  }

  async createResult(data: {
    studentId: string;
    classId: string;
    subjectId: string;
    examType: string;
    academicYear: string;
    term: string;
    marksObtained: number;
    maxMarks?: number;
    remarks?: string;
  }, user: NonNullable<AuthenticatedRequest['user']>, req: Request) {
    await this.validateEntryAccess(data, user);
    const maxMarks = data.maxMarks || 100;
    this.validateMarks(data.marksObtained, maxMarks);
    const percentage = calculatePercentage(data.marksObtained, maxMarks);
    const grade = calculateGrade(percentage);
    const gpa = calculateGPA(percentage);

    const result = await prisma.result.create({
      data: {
        studentId: data.studentId,
        classId: data.classId,
        subjectId: data.subjectId,
        examType: data.examType,
        academicYear: data.academicYear,
        term: data.term,
        marksObtained: data.marksObtained,
        maxMarks,
        percentage,
        grade,
        gpa,
        remarks: data.remarks,
        enteredById: user.id,
        status: ResultEntryStatus.DRAFT,
      },
      include: {
        student: { include: { user: { select: { firstName: true, lastName: true } } } },
        subject: { select: { name: true, code: true } },
        class: { select: { name: true, section: true } },
      },
    });

    await auditLog({
      actorId: user.id,
      action: AuditAction.MARKS_DRAFT_SAVED,
      entity: 'Result',
      entityId: result.id,
      metadata: { studentId: data.studentId, subjectId: data.subjectId },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return result;
  }

  async bulkCreateResults(data: {
    classId: string;
    examType: string;
    academicYear: string;
    term: string;
    entries: ResultEntry[];
  }, user: NonNullable<AuthenticatedRequest['user']>, req: Request) {
    for (const entry of data.entries) {
      await this.validateEntryAccess({ ...entry, classId: data.classId }, user);
    }
    const results = await Promise.all(
      data.entries.map((entry) =>
        this.createResult(
          {
            ...entry,
            classId: data.classId,
            examType: data.examType,
            academicYear: data.academicYear,
            term: data.term,
          },
          user,
          req
        )
      )
    );
    return results;
  }

  async updateResult(id: string, data: {
    marksObtained: number;
    remarks?: string;
  }, user: NonNullable<AuthenticatedRequest['user']>, req: Request) {
    const result = await prisma.result.findUnique({ where: { id } });
    if (!result) throw AppError.notFound('Result not found');
    if (user.role === 'TEACHER') await assertTeacherSubjectAccess(user, result.classId, result.subjectId);
    if (result.isPublished || result.status !== ResultEntryStatus.DRAFT) {
      throw AppError.badRequest('Only draft marks can be edited');
    }
    this.validateMarks(data.marksObtained, result.maxMarks);

    const percentage = calculatePercentage(data.marksObtained, result.maxMarks);
    const grade = calculateGrade(percentage);
    const gpa = calculateGPA(percentage);

    const updated = await prisma.result.update({
      where: { id },
      data: { marksObtained: data.marksObtained, percentage, grade, gpa, remarks: data.remarks },
    });
    await auditLog({
      actorId: user.id,
      action: AuditAction.MARKS_DRAFT_SAVED,
      entity: 'Result',
      entityId: id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return updated;
  }

  async publishResults(params: {
    classId: string;
    examType: string;
    term: string;
    academicYear: string;
  }, actorId: string, req: Request) {
    const results = await prisma.result.findMany({
      where: { ...params, isPublished: false },
      include: {
        student: { select: { userId: true } },
      },
    });

    if (!results.length) throw AppError.notFound('No unpublished results found');

    await prisma.result.updateMany({
      where: { ...params, isPublished: false },
      data: {
        isPublished: true,
        status: ResultEntryStatus.LOCKED,
        submittedAt: new Date(),
        lockedAt: new Date(),
        lockedById: actorId,
        publishedAt: new Date(),
      },
    });

    // Notify each student
    const studentUserIds = [...new Set(results.map((r) => r.student.userId))];
    await notificationQueue.add('result:published', {
      studentUserIds,
      examType: params.examType,
      term: params.term,
      academicYear: params.academicYear,
    });

    await auditLog({
      actorId,
      action: AuditAction.RESULT_PUBLISHED,
      entity: 'Result',
      metadata: params,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return { published: results.length };
  }

  async getStudentResults(studentId: string, req: AuthenticatedRequest) {
    const { page, limit, skip } = getPaginationOptions(req);
    const { academicYear, term, isPublished } = req.query;

    const where: Record<string, unknown> = { studentId };
    if (req.user?.role === 'TEACHER') {
      const [scope, student] = await Promise.all([
        getTeacherScope(req.user.id),
        prisma.studentProfile.findUnique({ where: { id: studentId }, select: { classId: true } }),
      ]);
      const allowedSubjectIds = scope.teacher.subjectTeachers
        .filter((item) => item.classId === student?.classId)
        .map((item) => item.subjectId);
      where.subjectId = { in: allowedSubjectIds };
    }
    if (academicYear) where.academicYear = academicYear as string;
    if (term) where.term = term as string;
    if (['STUDENT', 'PARENT'].includes(req.user?.role || '')) {
      where.isPublished = true;
    } else if (isPublished !== undefined) {
      where.isPublished = isPublished === 'true';
    }

    const [results, total] = await Promise.all([
      prisma.result.findMany({
        where,
        include: {
          subject: { select: { name: true, code: true } },
          class: { select: { name: true, section: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.result.count({ where }),
    ]);

    // Calculate GPA summary
    const published = results.filter((r) => r.isPublished);
    const overallGPA = calculateOverallGPA(published.map((r) => r.gpa));
    const avgPercentage =
      published.length
        ? published.reduce((s, r) => s + r.percentage, 0) / published.length
        : 0;

    return {
      data: results,
      meta: buildPaginationMeta(total, page, limit),
      summary: {
        overallGPA: Math.round(overallGPA * 100) / 100,
        averagePercentage: Math.round(avgPercentage * 100) / 100,
        totalSubjects: published.length,
      },
    };
  }

  async getClassResults(classId: string, req: AuthenticatedRequest) {
    const { examType, term, academicYear } = req.query;

    const where: Record<string, unknown> = { classId, isPublished: true };
    if (req.user?.role === 'TEACHER') {
      const scope = await getTeacherScope(req.user.id);
      const subjectIds = scope.teacher.subjectTeachers.filter((item) => item.classId === classId).map((item) => item.subjectId);
      if (!subjectIds.length) throw AppError.forbidden('No assigned subjects for this class');
      where.subjectId = { in: subjectIds };
    }
    if (examType) where.examType = examType as string;
    if (term) where.term = term as string;
    if (academicYear) where.academicYear = academicYear as string;

    return prisma.result.findMany({
      where,
      include: {
        student: { include: { user: { select: { firstName: true, lastName: true } } } },
        subject: { select: { name: true, code: true } },
      },
      orderBy: { percentage: 'desc' },
    });
  }

  async getMarksStudents(
    query: { classId: string; subjectId: string; examType?: string; term?: string; academicYear?: string },
    user: NonNullable<AuthenticatedRequest['user']>
  ) {
    await assertTeacherSubjectAccess(user, query.classId, query.subjectId);
    const students = await prisma.studentProfile.findMany({
      where: { classId: query.classId, deletedAt: null },
      select: {
        id: true,
        studentCode: true,
        user: { select: { firstName: true, lastName: true } },
      },
      orderBy: { studentCode: 'asc' },
    });
    const results = query.examType && query.term && query.academicYear
      ? await prisma.result.findMany({
        where: {
          classId: query.classId,
          subjectId: query.subjectId,
          examType: query.examType,
          term: query.term,
          academicYear: query.academicYear,
        },
      })
      : [];
    const byStudent = new Map(results.map((result) => [result.studentId, result]));
    return students.map((student) => ({ ...student, result: byStudent.get(student.id) || null }));
  }

  async saveDraft(data: {
    classId: string;
    subjectId: string;
    examType: string;
    academicYear: string;
    term: string;
    entries: Array<{ studentId: string; marksObtained: number; maxMarks?: number; remarks?: string }>;
  }, user: NonNullable<AuthenticatedRequest['user']>, req: Request) {
    await assertTeacherSubjectAccess(user, data.classId, data.subjectId);
    if (!data.entries.length) throw AppError.badRequest('At least one marks entry is required');
    for (const entry of data.entries) {
      await this.validateEntryAccess({ studentId: entry.studentId, classId: data.classId, subjectId: data.subjectId }, user);
      this.validateMarks(entry.marksObtained, entry.maxMarks || 100);
    }

    const existing = await prisma.result.findMany({
      where: {
        classId: data.classId,
        subjectId: data.subjectId,
        examType: data.examType,
        term: data.term,
        academicYear: data.academicYear,
        studentId: { in: data.entries.map((entry) => entry.studentId) },
      },
      select: { studentId: true, status: true },
    });
    if (existing.some((item) => item.status !== ResultEntryStatus.DRAFT)) {
      throw AppError.conflict('Submitted or locked marks cannot be overwritten');
    }

    const saved = await prisma.$transaction(data.entries.map((entry) => {
      const maxMarks = entry.maxMarks || 100;
      const percentage = calculatePercentage(entry.marksObtained, maxMarks);
      return prisma.result.upsert({
        where: {
          studentId_subjectId_examType_term_academicYear: {
            studentId: entry.studentId,
            subjectId: data.subjectId,
            examType: data.examType,
            term: data.term,
            academicYear: data.academicYear,
          },
        },
        create: {
          classId: data.classId,
          subjectId: data.subjectId,
          examType: data.examType,
          academicYear: data.academicYear,
          term: data.term,
          studentId: entry.studentId,
          marksObtained: entry.marksObtained,
          maxMarks,
          remarks: entry.remarks,
          percentage,
          grade: calculateGrade(percentage),
          gpa: calculateGPA(percentage),
          status: ResultEntryStatus.DRAFT,
          enteredById: user.id,
        },
        update: {
          marksObtained: entry.marksObtained,
          maxMarks,
          remarks: entry.remarks,
          percentage,
          grade: calculateGrade(percentage),
          gpa: calculateGPA(percentage),
          enteredById: user.id,
        },
      });
    }));
    await auditLog({
      actorId: user.id,
      action: AuditAction.MARKS_DRAFT_SAVED,
      entity: 'Result',
      metadata: { classId: data.classId, subjectId: data.subjectId, count: saved.length },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return saved;
  }

  async submitFinal(data: {
    classId: string;
    subjectId: string;
    examType: string;
    academicYear: string;
    term: string;
  }, user: NonNullable<AuthenticatedRequest['user']>, req: Request) {
    await assertTeacherSubjectAccess(user, data.classId, data.subjectId);
    const result = await prisma.result.updateMany({
      where: { ...data, status: ResultEntryStatus.DRAFT, isPublished: false },
      data: { status: ResultEntryStatus.SUBMITTED, submittedAt: new Date() },
    });
    if (!result.count) throw AppError.notFound('No draft marks found to submit');
    await auditLog({
      actorId: user.id,
      action: AuditAction.MARKS_SUBMITTED,
      entity: 'Result',
      metadata: { ...data, count: result.count },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return result;
  }

  async getMarksHistory(user: NonNullable<AuthenticatedRequest['user']>, req: Request) {
    const scope = await getTeacherScope(user.id);
    const { page, limit, skip } = getPaginationOptions(req);
    const where = {
      OR: scope.teacher.subjectTeachers.map((item) => ({ classId: item.classId, subjectId: item.subjectId })),
    };
    const [data, total] = await Promise.all([
      prisma.result.findMany({
        where,
        include: {
          student: { select: { studentCode: true, user: { select: { firstName: true, lastName: true } } } },
          class: { select: { name: true, section: true } },
          subject: { select: { name: true, code: true } },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.result.count({ where }),
    ]);
    return { data, meta: buildPaginationMeta(total, page, limit) };
  }

  async unlock(id: string, actorId: string, req: Request) {
    const result = await prisma.result.findUnique({ where: { id } });
    if (!result) throw AppError.notFound('Result not found');
    const updated = await prisma.result.update({
      where: { id },
      data: {
        status: ResultEntryStatus.DRAFT,
        isPublished: false,
        publishedAt: null,
        lockedAt: null,
        lockedById: null,
        submittedAt: null,
      },
    });
    await auditLog({
      actorId,
      action: AuditAction.MARKS_UNLOCKED,
      entity: 'Result',
      entityId: id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return updated;
  }
}
