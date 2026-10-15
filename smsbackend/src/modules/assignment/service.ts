import prisma from '../../config/database';
import { SubmissionStatus, AuditAction } from '@prisma/client';
import { AppError } from '../../utils/AppError';
import { buildPaginationMeta } from '../../utils/apiResponse';
import { getPaginationOptions } from '../../utils/pagination';
import { calculateGrade, calculatePercentage } from '../../utils/grading';
import { auditLog } from '../auditLog/service';
import { notificationQueue } from '../../config/queue';
import { uploadToCloudinary } from '../../middlewares/upload.middleware';
import { Request } from 'express';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';
import { assertTeacherAssignmentOwnership, assertTeacherSubjectAccess, getTeacherScope } from '../teacher/access';
import { getParentScope } from '../parent/access';

export class AssignmentService {
  async createAssignment(data: {
    title: string;
    description: string;
    classId: string;
    subjectId: string;
    teacherUserId: string;
    teacherId?: string;
    dueDate: string;
    maxMarks?: number;
    isPublished?: boolean;
    file?: Express.Multer.File;
  }, req: AuthenticatedRequest) {
    let teacher = req.user?.role === 'TEACHER'
      ? await prisma.teacherProfile.findUnique({ where: { userId: data.teacherUserId } })
      : null;
    if (req.user?.role === 'TEACHER') {
      if (!teacher || teacher.deletedAt) throw AppError.notFound('Teacher profile not found');
      await assertTeacherSubjectAccess(req.user!, data.classId, data.subjectId);
    } else {
      const assignment = data.teacherId
        ? await prisma.subjectTeacher.findFirst({
          where: {
            classId: data.classId,
            subjectId: data.subjectId,
            teacherId: data.teacherId,
            status: 'ACTIVE',
          },
          include: { teacher: true },
        })
        : await prisma.subjectTeacher.findUnique({
          where: { classId_subjectId: { classId: data.classId, subjectId: data.subjectId } },
          include: { teacher: true },
        });
      if (!assignment || assignment.status !== 'ACTIVE' || assignment.teacher.deletedAt) {
        throw AppError.unprocessable('An active teacher assignment is required for this class and subject');
      }
      teacher = assignment.teacher;
    }
    const dueDate = new Date(data.dueDate);
    if (Number.isNaN(dueDate.getTime()) || dueDate <= new Date()) {
      throw AppError.unprocessable('Assignment due date must be in the future');
    }
    if (data.maxMarks !== undefined && (!Number.isInteger(data.maxMarks) || data.maxMarks <= 0)) {
      throw AppError.badRequest('Maximum marks must be a positive whole number');
    }

    let attachmentUrl: string | undefined;
    let attachmentPublicId: string | undefined;

    if (data.file) {
      const uploaded = await uploadToCloudinary(data.file.buffer, 'assignments');
      attachmentUrl = uploaded.url;
      attachmentPublicId = uploaded.publicId;
    }

    const assignment = await prisma.assignment.create({
      data: {
        title: data.title,
        description: data.description,
        classId: data.classId,
        subjectId: data.subjectId,
        teacherId: teacher.id,
        dueDate,
        maxMarks: data.maxMarks || 100,
        attachmentUrl,
        attachmentPublicId,
        isPublished: data.isPublished ?? true,
      },
      include: {
        class: { select: { name: true, section: true } },
        subject: { select: { name: true } },
        teacher: { include: { user: { select: { firstName: true, lastName: true } } } },
      },
    });

    await auditLog({
      actorId: data.teacherUserId,
      action: AuditAction.ASSIGNMENT_CREATED,
      entity: 'Assignment',
      entityId: assignment.id,
      metadata: { title: assignment.title, classId: data.classId },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    // Notify all students in class
    const students = await prisma.studentProfile.findMany({
      where: { classId: data.classId, deletedAt: null, user: { status: 'ACTIVE', deletedAt: null } },
      select: { userId: true },
    });

    await notificationQueue.add('assignment:created', {
      assignmentId: assignment.id,
      title: assignment.title,
      dueDate: assignment.dueDate,
      studentUserIds: students.map((s) => s.userId),
    });

    return assignment;
  }

  async updateAssignment(id: string, data: Partial<{
    title: string;
    description: string;
    dueDate: string;
    maxMarks: number;
    isPublished: boolean;
  }>, user: NonNullable<AuthenticatedRequest['user']>, req: Request) {
    const assignment = await prisma.assignment.findUnique({ where: { id } });
    if (!assignment || assignment.deletedAt) throw AppError.notFound('Assignment not found');

    await assertTeacherAssignmentOwnership(user, id);
    if (data.dueDate && new Date(data.dueDate) <= new Date()) throw AppError.unprocessable('Assignment due date must be in the future');
    if (data.maxMarks !== undefined && (!Number.isInteger(data.maxMarks) || data.maxMarks <= 0)) {
      throw AppError.badRequest('Maximum marks must be a positive whole number');
    }

    const updated = await prisma.assignment.update({
      where: { id },
      data: {
        ...data,
        ...(data.dueDate && { dueDate: new Date(data.dueDate) }),
      },
    });
    await auditLog({
      actorId: user.id,
      action: AuditAction.ASSIGNMENT_UPDATED,
      entity: 'Assignment',
      entityId: id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return updated;
  }

  async deleteAssignment(id: string, user: NonNullable<AuthenticatedRequest['user']>, req: Request) {
    const assignment = await prisma.assignment.findUnique({ where: { id } });
    if (!assignment || assignment.deletedAt) throw AppError.notFound('Assignment not found');

    await assertTeacherAssignmentOwnership(user, id);
    const submissions = await prisma.assignmentSubmission.count({ where: { assignmentId: id } });
    if (submissions > 0) throw AppError.conflict('Assignment with submissions cannot be deleted; unpublish it instead');

    const deleted = await prisma.assignment.update({ where: { id }, data: { deletedAt: new Date() } });
    await auditLog({
      actorId: user.id,
      action: AuditAction.ASSIGNMENT_DELETED,
      entity: 'Assignment',
      entityId: id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return deleted;
  }

  async getAssignments(req: AuthenticatedRequest) {
    const { page, limit, skip, sortBy, sortOrder } = getPaginationOptions(req);
    const { classId, subjectId } = req.query;

    const where: Record<string, unknown> = { deletedAt: null, isPublished: true };
    if (req.user?.role === 'TEACHER') {
      const scope = await getTeacherScope(req.user.id);
      where.teacherId = scope.teacher.id;
      delete where.isPublished;
    } else if (req.user?.role === 'STUDENT') {
      const student = await prisma.studentProfile.findUnique({ where: { userId: req.user.id }, select: { classId: true } });
      if (classId && String(classId) !== student?.classId) {
        throw AppError.forbidden('Assignment is not available to your class');
      }
      where.classId = student?.classId || '__none__';
    } else if (req.user?.role === 'PARENT') {
      const scope = await getParentScope(req.user.id);
      if (classId && !scope.classIds.includes(String(classId))) {
        throw AppError.forbidden('Assignment is not available for a linked child');
      }
      where.classId = classId ? String(classId) : { in: scope.classIds };
    }
    if (classId && !['PARENT', 'STUDENT'].includes(req.user?.role || '')) where.classId = classId as string;
    if (subjectId) where.subjectId = subjectId as string;
    if (req.user?.role === 'TEACHER' && (classId || subjectId)) {
      const scope = await getTeacherScope(req.user.id);
      if (classId && !scope.classIds.includes(String(classId))) throw AppError.forbidden('Not assigned to this class');
      if (subjectId && !scope.subjectIds.includes(String(subjectId))) throw AppError.forbidden('Not assigned to this subject');
    }

    const [assignments, total] = await Promise.all([
      prisma.assignment.findMany({
        where,
        include: {
          class: { select: { name: true, section: true } },
          subject: { select: { name: true, code: true } },
          teacher: { include: { user: { select: { firstName: true, lastName: true } } } },
          _count: { select: { submissions: true } },
        },
        orderBy: { [sortBy]: sortOrder } as never,
        skip,
        take: limit,
      }),
      prisma.assignment.count({ where }),
    ]);

    const data = ['PARENT', 'STUDENT'].includes(req.user?.role || '')
      ? assignments.map(({ _count: _privateSubmissionCount, ...assignment }) => assignment)
      : assignments;
    return { data, meta: buildPaginationMeta(total, page, limit) };
  }

  async getAssignmentById(id: string, user: NonNullable<AuthenticatedRequest['user']>) {
    const assignment = await prisma.assignment.findUnique({
      where: { id },
      include: {
        class: { select: { name: true, section: true } },
        subject: { select: { name: true } },
        teacher: { include: { user: { select: { firstName: true, lastName: true } } } },
        submissions: {
          include: {
            student: { include: { user: { select: { firstName: true, lastName: true } } } },
          },
        },
      },
    });
    if (!assignment || assignment.deletedAt) throw AppError.notFound('Assignment not found');
    if (user.role === 'TEACHER') await assertTeacherAssignmentOwnership(user, id);
    if (user.role === 'STUDENT') {
      const student = await prisma.studentProfile.findUnique({ where: { userId: user.id }, select: { id: true, classId: true } });
      if (!student || !assignment.isPublished || assignment.classId !== student.classId) throw AppError.forbidden('Assignment is not available to your class');
      return { ...assignment, submissions: assignment.submissions.filter((item) => item.studentId === student.id) };
    }
    if (user.role === 'PARENT') {
      const scope = await getParentScope(user.id);
      const linkedIds = scope.children.filter((child) => child.classId === assignment.classId).map((child) => child.id);
      if (!assignment.isPublished || !linkedIds.length) throw AppError.forbidden('Assignment is not available for a linked student');
      return { ...assignment, submissions: assignment.submissions.filter((item) => linkedIds.includes(item.studentId)) };
    }
    return assignment;
  }

  async submitAssignment(data: {
    assignmentId: string;
    studentUserId: string;
    content?: string;
    file?: Express.Multer.File;
  }) {
    const assignment = await prisma.assignment.findUnique({
      where: { id: data.assignmentId },
      include: { teacher: { select: { userId: true } } },
    });
    if (!assignment || assignment.deletedAt) throw AppError.notFound('Assignment not found');

    const student = await prisma.studentProfile.findUnique({
      where: { userId: data.studentUserId },
      include: { user: { select: { firstName: true, lastName: true } } },
    });
    if (!student) throw AppError.notFound('Student profile not found');
    if (!assignment.isPublished || student.classId !== assignment.classId) {
      throw AppError.forbidden('You can only submit assignments published for your class');
    }

    const existing = await prisma.assignmentSubmission.findUnique({
      where: { assignmentId_studentId: { assignmentId: data.assignmentId, studentId: student.id } },
    });
    if (existing && existing.status === SubmissionStatus.GRADED) {
      throw AppError.conflict('Assignment already graded');
    }

    const isLate = new Date() > assignment.dueDate;

    let fileUrl: string | undefined;
    let filePublicId: string | undefined;

    if (data.file) {
      const uploaded = await uploadToCloudinary(data.file.buffer, 'submissions');
      fileUrl = uploaded.url;
      filePublicId = uploaded.publicId;
    }

    const submissionData = {
      assignmentId: data.assignmentId,
      studentId: student.id,
      submittedAt: new Date(),
      content: data.content,
      fileUrl,
      filePublicId,
      status: isLate ? SubmissionStatus.LATE : SubmissionStatus.SUBMITTED,
      isLate,
    };

    const submission = existing
      ? await prisma.assignmentSubmission.update({
        where: { id: existing.id },
        data: submissionData,
      })
      : await prisma.assignmentSubmission.create({ data: submissionData });

    await notificationQueue.add('assignment:submitted', {
      teacherUserId: assignment.teacher.userId,
      assignmentId: assignment.id,
      assignmentTitle: assignment.title,
      submissionId: submission.id,
      studentId: student.id,
      studentName: `${student.user.firstName} ${student.user.lastName}`.trim(),
      isResubmission: Boolean(existing),
    });

    return submission;
  }

  async gradeSubmission(submissionId: string, data: {
    marks: number;
    feedback?: string;
  }, user: NonNullable<AuthenticatedRequest['user']>, req: Request) {
    const submission = await prisma.assignmentSubmission.findUnique({
      where: { id: submissionId },
      include: { assignment: true, student: true },
    });
    if (!submission) throw AppError.notFound('Submission not found');

    await assertTeacherAssignmentOwnership(user, submission.assignmentId);

    if (!Number.isFinite(data.marks) || data.marks < 0 || data.marks > submission.assignment.maxMarks) {
      throw AppError.badRequest(`Marks cannot exceed ${submission.assignment.maxMarks}`);
    }

    const percentage = calculatePercentage(data.marks, submission.assignment.maxMarks);
    const grade = calculateGrade(percentage);

    const updated = await prisma.assignmentSubmission.update({
      where: { id: submissionId },
      data: {
        marks: data.marks,
        feedback: data.feedback,
        grade,
        status: SubmissionStatus.GRADED,
        gradedAt: new Date(),
      },
    });

    // Notify student
    await notificationQueue.add('assignment:graded', {
      studentUserId: submission.student.userId,
      assignmentTitle: submission.assignment.title,
      marks: data.marks,
      maxMarks: submission.assignment.maxMarks,
      grade,
    });
    await auditLog({
      actorId: user.id,
      action: AuditAction.SUBMISSION_GRADED,
      entity: 'AssignmentSubmission',
      entityId: submissionId,
      metadata: { assignmentId: submission.assignmentId },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return updated;
  }

  async getAssignmentSubmissions(id: string, user: NonNullable<AuthenticatedRequest['user']>) {
    await assertTeacherAssignmentOwnership(user, id);
    return prisma.assignmentSubmission.findMany({
      where: { assignmentId: id },
      include: {
        student: {
          select: {
            id: true,
            studentCode: true,
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getStudentSubmissions(studentUserId: string, req: Request) {
    const student = await prisma.studentProfile.findUnique({ where: { userId: studentUserId } });
    if (!student) throw AppError.notFound('Student profile not found');

    const { page, limit, skip } = getPaginationOptions(req);
    const { status } = req.query;

    const where: Record<string, unknown> = { studentId: student.id };
    if (status) where.status = status as SubmissionStatus;

    const [submissions, total] = await Promise.all([
      prisma.assignmentSubmission.findMany({
        where,
        include: {
          assignment: {
            include: {
              subject: { select: { name: true } },
              class: { select: { name: true, section: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.assignmentSubmission.count({ where }),
    ]);

    return { data: submissions, meta: buildPaginationMeta(total, page, limit) };
  }
}
