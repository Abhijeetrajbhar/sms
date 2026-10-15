import prisma from '../../config/database';
import { cacheGet, cacheSet } from '../../config/redis';
import { getAttendanceSummary } from '../../utils/attendance';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';
import { hasAdminPermission } from '../../middlewares/adminPermission.middleware';

const CACHE_TTL = 30; // Keep dashboard data fresh for near real-time UI refreshes.

async function withCache<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const cached = await cacheGet(key);
  if (cached) return JSON.parse(cached) as T;

  const result = await fn();
  await cacheSet(key, JSON.stringify(result), CACHE_TTL);
  return result;
}

export class AnalyticsService {
  // ─── Admin Analytics ────────────────────────────────────────────────────────
  async getAdminDashboard(user?: NonNullable<AuthenticatedRequest['user']>) {
    const dashboard = await withCache('analytics:admin:dashboard:v2', async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const [
        totalStudents,
        activeStudents,
        totalTeachers,
        activeTeachers,
        totalClasses,
        totalParents,
        totalSubjects,
        attendances,
        invoices,
        pendingOfflinePayments,
        pendingTeacherApprovals,
        recentAdmissions,
        studentsWithoutParent,
        recentNotices,
        recentAudit,
        classRows,
      ] = await Promise.all([
        prisma.studentProfile.count({ where: { deletedAt: null } }),
        prisma.studentProfile.count({ where: { deletedAt: null, user: { status: 'ACTIVE', deletedAt: null } } }),
        prisma.teacherProfile.count({ where: { deletedAt: null } }),
        prisma.teacherProfile.count({ where: { deletedAt: null, user: { status: 'ACTIVE', deletedAt: null } } }),
        prisma.class.count({ where: { deletedAt: null } }),
        prisma.parentProfile.count({ where: { deletedAt: null } }),
        prisma.subject.count({ where: { deletedAt: null } }),
        prisma.attendance.findMany({
          where: { date: { gte: today, lt: tomorrow } },
          select: { status: true },
        }),
        prisma.feeInvoice.aggregate({
          where: { status: { notIn: ['CANCELLED', 'REFUNDED'] } },
          _sum: { payableAmount: true, paidAmount: true, dueAmount: true },
        }),
        prisma.offlinePayment.count({ where: { status: 'PENDING_VERIFICATION' } }),
        prisma.user.count({ where: { role: 'TEACHER', status: 'PENDING_VERIFICATION', deletedAt: null } }),
        prisma.studentProfile.findMany({
          where: { deletedAt: null },
          orderBy: { admissionDate: 'desc' },
          take: 6,
          select: {
            id: true,
            studentCode: true,
            admissionDate: true,
            user: { select: { firstName: true, lastName: true } },
            class: { select: { name: true, section: true, academicYear: true } },
          },
        }),
        prisma.studentProfile.count({ where: { deletedAt: null, parentIds: { isEmpty: true } } }),
        prisma.announcement.findMany({
          where: { isActive: true, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
          orderBy: { createdAt: 'desc' },
          take: 6,
          select: { id: true, title: true, target: true, createdAt: true, expiresAt: true },
        }),
        prisma.auditLog.findMany({
          orderBy: { createdAt: 'desc' },
          take: 8,
          select: {
            id: true,
            action: true,
            entity: true,
            entityId: true,
            createdAt: true,
            actor: { select: { firstName: true, lastName: true, role: true } },
          },
        }),
        prisma.class.findMany({
          where: { deletedAt: null },
          select: {
            id: true,
            name: true,
            section: true,
            academicYear: true,
            _count: { select: { students: true } },
          },
        }),
      ]);

      const attendanceSummary = getAttendanceSummary(attendances);
      const academicYears = [...new Set(classRows.map((item) => item.academicYear))].sort().reverse();
      const classNames = new Set(classRows.map((item) => `${item.name}:${item.academicYear}`));

      return {
        totals: {
          students: totalStudents,
          activeStudents,
          teachers: totalTeachers,
          activeTeachers,
          parents: totalParents,
          classes: classNames.size || totalClasses,
          sections: totalClasses,
          subjects: totalSubjects,
        },
        attendance: attendanceSummary,
        fees: {
          total: invoices._sum.payableAmount || 0,
          collected: invoices._sum.paidAmount || 0,
          due: invoices._sum.dueAmount || 0,
          collectionRate: invoices._sum.payableAmount
            ? Math.round(((invoices._sum.paidAmount || 0) / invoices._sum.payableAmount) * 100)
            : 0,
        },
        pending: {
          parentLinks: studentsWithoutParent,
          teacherApprovals: pendingTeacherApprovals,
          offlinePayments: pendingOfflinePayments,
        },
        recentAdmissions,
        recentNotices,
        recentAudit,
        academicYears,
        enrollmentByClass: classRows,
      };
    });

    if (!user) return dashboard;
    return {
      ...dashboard,
      fees: hasAdminPermission(user, 'fees:view') ? dashboard.fees : null,
      recentAudit: hasAdminPermission(user, 'audit:view') ? dashboard.recentAudit : [],
      recentAdmissions: hasAdminPermission(user, 'students:view') ? dashboard.recentAdmissions : [],
      recentNotices: hasAdminPermission(user, 'notices:manage') ? dashboard.recentNotices : [],
      enrollmentByClass: hasAdminPermission(user, 'classes:manage') ? dashboard.enrollmentByClass : [],
      pending: {
        parentLinks: hasAdminPermission(user, 'parents:link-student') ? dashboard.pending.parentLinks : null,
        teacherApprovals: hasAdminPermission(user, 'teachers:update') ? dashboard.pending.teacherApprovals : null,
        offlinePayments: hasAdminPermission(user, 'payments:verify') ? dashboard.pending.offlinePayments : null,
      },
    };
  }

  // ─── Teacher Analytics ───────────────────────────────────────────────────────
  async getTeacherDashboard(teacherUserId: string) {
    return withCache(`analytics:teacher:${teacherUserId}`, async () => {
      const teacher = await prisma.teacherProfile.findUnique({ where: { userId: teacherUserId } });
      if (!teacher) return null;

      const [classes, totalAssignments, submissions, attendanceSummary] = await Promise.all([
        prisma.class.findMany({
          where: { teacherId: teacher.id, deletedAt: null },
          select: {
            id: true,
            name: true,
            section: true,
            _count: { select: { students: true } },
          },
        }),
        prisma.assignment.count({ where: { teacherId: teacher.id, deletedAt: null } }),
        prisma.assignmentSubmission.findMany({
          where: { assignment: { teacherId: teacher.id } },
          select: { status: true, isLate: true },
        }),
        prisma.attendance.findMany({
          where: { markedById: teacher.id },
          select: { status: true },
        }),
      ]);

      const submissionStats = {
        total: submissions.length,
        graded: submissions.filter((s) => s.status === 'GRADED').length,
        submitted: submissions.filter((s) => s.status === 'SUBMITTED').length,
        late: submissions.filter((s) => s.isLate).length,
        missing: submissions.filter((s) => s.status === 'MISSING').length,
      };

      return {
        assignedClasses: classes,
        totalAssignments,
        submissionStats,
        totalAttendanceMarked: attendanceSummary.length,
        attendanceOverview: getAttendanceSummary(attendanceSummary),
      };
    });
  }

  // ─── Student Analytics ───────────────────────────────────────────────────────
  async getStudentDashboard(studentUserId: string) {
    return withCache(`analytics:student:${studentUserId}`, async () => {
      const student = await prisma.studentProfile.findUnique({
        where: { userId: studentUserId },
        include: { class: { select: { id: true, name: true, section: true } } },
      });
      if (!student) return null;

      const [attendances, results, submissions] = await Promise.all([
        prisma.attendance.findMany({
          where: { studentId: student.id },
          select: { status: true, date: true },
        }),
        prisma.result.findMany({
          where: { studentId: student.id, isPublished: true },
          include: { subject: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.assignmentSubmission.findMany({
          where: { studentId: student.id },
          select: { status: true, isLate: true, marks: true, createdAt: true },
        }),
      ]);

      const attendanceSummary = getAttendanceSummary(attendances);
      const avgScore = results.length
        ? results.reduce((s, r) => s + r.percentage, 0) / results.length
        : 0;

      // Subject-wise performance
      const subjectPerformance = results.reduce((acc, r) => {
        if (!acc[r.subject.name]) acc[r.subject.name] = [];
        acc[r.subject.name].push(r.percentage);
        return acc;
      }, {} as Record<string, number[]>);

      const subjectAvgs = Object.entries(subjectPerformance).map(([subject, scores]) => ({
        subject,
        average: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100,
      }));

      return {
        class: student.class,
        studentCode: student.studentCode,
        riskLevel: student.riskLevel,
        riskScore: student.riskScore,
        attendance: attendanceSummary,
        academic: {
          averageScore: Math.round(avgScore * 100) / 100,
          subjectPerformance: subjectAvgs,
          totalResults: results.length,
        },
        assignments: {
          total: submissions.length,
          submitted: submissions.filter((s) => s.status === 'SUBMITTED' || s.status === 'GRADED').length,
          graded: submissions.filter((s) => s.status === 'GRADED').length,
          late: submissions.filter((s) => s.isLate).length,
          missing: submissions.filter((s) => s.status === 'MISSING').length,
          completionRate:
            submissions.length > 0
              ? Math.round(
                  (submissions.filter((s) => s.status !== 'PENDING' && s.status !== 'MISSING').length /
                    submissions.length) *
                    100
                )
              : 0,
        },
      };
    });
  }

  // ─── Parent Analytics ────────────────────────────────────────────────────────
  async getParentDashboard(parentUserId: string) {
    return withCache(`analytics:parent:${parentUserId}`, async () => {
      const parent = await prisma.parentProfile.findUnique({ where: { userId: parentUserId } });
      if (!parent) return null;

      // Find linked students
      const students = await prisma.studentProfile.findMany({
        where: {
          parentIds: { has: parent.id },
          deletedAt: null,
          user: { deletedAt: null, status: { notIn: ['INACTIVE', 'SUSPENDED'] } },
        },
        include: {
          user: { select: { firstName: true, lastName: true } },
          class: { select: { name: true, section: true } },
        },
      });

      const childrenData = await Promise.all(
        students.map(async (student) => {
          const [attendances, results, invoices, legacyFees] = await Promise.all([
            prisma.attendance.findMany({
              where: { studentId: student.id },
              select: { status: true },
            }),
            prisma.result.findMany({
              where: { studentId: student.id, isPublished: true },
              select: { percentage: true },
            }),
            prisma.feeInvoice.findMany({
              where: { studentId: student.id, status: { notIn: ['CANCELLED', 'REFUNDED'] } },
              select: { payableAmount: true, paidAmount: true, dueAmount: true, status: true },
            }),
            prisma.fee.findMany({
              where: { studentId: student.id },
              select: { amount: true, paidAmount: true, status: true },
            }),
          ]);

          const attendanceSummary = getAttendanceSummary(attendances);
          const avgScore = results.length
            ? results.reduce((s, r) => s + r.percentage, 0) / results.length
            : 0;

          const invoiceTotal = invoices.reduce((s, i) => s + Number(i.payableAmount || 0), 0);
          const invoicePaid = invoices.reduce((s, i) => s + Number(i.paidAmount || 0), 0);
          const invoiceDue = invoices.reduce((s, i) => s + Number(i.dueAmount || 0), 0);
          const invoiceOverdue = invoices.filter((i) => i.dueAmount > 0 && i.status !== 'PAID').length;

          const legacyTotal = legacyFees.reduce((s, f) => s + f.amount, 0);
          const legacyPaid = legacyFees.reduce((s, f) => s + f.paidAmount, 0);
          const legacyOverdue = legacyFees.filter((f) => f.status === 'OVERDUE').length;

          const totalFees = invoiceTotal > 0 ? invoiceTotal : legacyTotal;
          const paidFees = invoiceTotal > 0 ? invoicePaid : legacyPaid;
          const overdueFees = invoiceTotal > 0 ? invoiceOverdue : legacyOverdue;
          const dueFees = invoiceTotal > 0 ? invoiceDue : Math.max(0, totalFees - paidFees);

          return {
            studentId: student.id,
            studentCode: student.studentCode,
            name: `${student.user.firstName} ${student.user.lastName}`,
            class: student.class,
            riskLevel: student.riskLevel,
            riskScore: student.riskScore,
            attendancePercentage: attendanceSummary.percentage,
            averageScore: Math.round(avgScore * 100) / 100,
            fees: { total: totalFees, paid: paidFees, due: dueFees, overdueCount: overdueFees },
          };
        })
      );

      return { children: childrenData };
    });
  }
}
