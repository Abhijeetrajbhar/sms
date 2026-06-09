import { Job } from 'bullmq';
import { createWorker } from '../config/queue';
import { NotificationService } from '../modules/notification/service';
import { NotificationType } from '@prisma/client';
import prisma from '../config/database';
import logger from '../utils/logger';

const notificationService = new NotificationService();

async function linkedParentUserIds(studentUserIds: string[]) {
  if (!studentUserIds.length) return [];
  const students = await prisma.studentProfile.findMany({
    where: { userId: { in: studentUserIds }, deletedAt: null },
    select: { parentIds: true },
  });
  const parentIds = [...new Set(students.flatMap((student) => student.parentIds))];
  if (!parentIds.length) return [];
  const parents = await prisma.parentProfile.findMany({
    where: { id: { in: parentIds }, deletedAt: null },
    select: { userId: true },
  });
  return [...new Set(parents.map((parent) => parent.userId))];
}

export function startNotificationWorker() {
  const worker = createWorker('notification', async (job: Job) => {
    const { name, data } = job;

    switch (name) {
      case 'assignment:created': {
        const { assignmentId, title, dueDate, studentUserIds } = data as {
          assignmentId: string;
          title: string;
          dueDate: string;
          studentUserIds: string[];
        };

        const parentUserIds = await linkedParentUserIds(studentUserIds);
        const notifications = [...new Set([...studentUserIds, ...parentUserIds])].map((userId) => ({
          userId,
          type: NotificationType.ASSIGNMENT_CREATED,
          title: 'New Assignment',
          message: `"${title}" has been assigned. Due: ${new Date(dueDate).toLocaleDateString()}`,
          metadata: { assignmentId },
        }));

        await notificationService.createBulkNotifications(notifications);
        logger.info(`Assignment created notifications sent to ${notifications.length} linked users`);
        break;
      }

      case 'assignment:graded': {
        const { studentUserId, assignmentTitle, marks, maxMarks, grade } = data as {
          studentUserId: string;
          assignmentTitle: string;
          marks: number;
          maxMarks: number;
          grade: string;
        };

        await notificationService.createNotification({
          userId: studentUserId,
          type: NotificationType.ASSIGNMENT_GRADED,
          title: 'Assignment Graded',
          message: `Your submission for "${assignmentTitle}" has been graded: ${marks}/${maxMarks} (${grade})`,
          metadata: { marks, maxMarks, grade },
        });
        break;
      }

      case 'assignment:submitted': {
        const {
          teacherUserId,
          assignmentId,
          assignmentTitle,
          submissionId,
          studentId,
          studentName,
          isResubmission,
        } = data as {
          teacherUserId: string;
          assignmentId: string;
          assignmentTitle: string;
          submissionId: string;
          studentId: string;
          studentName: string;
          isResubmission: boolean;
        };

        await notificationService.createNotification({
          userId: teacherUserId,
          type: NotificationType.GENERAL,
          title: isResubmission ? 'Assignment Resubmitted' : 'New Assignment Submission',
          message: `${studentName} ${isResubmission ? 'resubmitted' : 'submitted'} "${assignmentTitle}".`,
          metadata: { assignmentId, submissionId, studentId },
        });
        break;
      }

      case 'result:published': {
        const { studentUserIds, examType, term, academicYear } = data as {
          studentUserIds: string[];
          examType: string;
          term: string;
          academicYear: string;
        };

        const parentUserIds = await linkedParentUserIds(studentUserIds);
        const notifications = [...new Set([...studentUserIds, ...parentUserIds])].map((userId) => ({
          userId,
          type: NotificationType.RESULT_PUBLISHED,
          title: 'Results Published',
          message: `${examType} results for ${term}, ${academicYear} are now available.`,
          metadata: { examType, term, academicYear },
        }));

        await notificationService.createBulkNotifications(notifications);
        logger.info(`Result notifications sent to ${notifications.length} linked users`);
        break;
      }

      case 'checkAttendanceWarning': {
        const { classId, entries } = data as {
          classId: string;
          date: string;
          entries: Array<{ studentId: string; status: string }>;
        };

        // Check each student's overall attendance after marking
        for (const entry of entries) {
          if (entry.status === 'ABSENT') {
            const allRecords = await prisma.attendance.findMany({
              where: { studentId: entry.studentId },
              select: { status: true },
            });

            const present = allRecords.filter(
              (r) => r.status === 'PRESENT' || r.status === 'LATE'
            ).length;
            const percentage = allRecords.length > 0 ? (present / allRecords.length) * 100 : 100;

            if (percentage < 75) {
              const student = await prisma.studentProfile.findUnique({
                where: { id: entry.studentId },
                select: { userId: true, parentIds: true },
              });

              if (student) {
                // Notify student
                await notificationService.createNotification({
                  userId: student.userId,
                  type: NotificationType.ATTENDANCE_WARNING,
                  title: '⚠️ Low Attendance Warning',
                  message: `Your attendance has dropped to ${percentage.toFixed(1)}%. Minimum required is 75%.`,
                  metadata: { attendance: percentage, studentId: entry.studentId },
                });

                // Notify parents
                if (student.parentIds.length > 0) {
                  const parents = await prisma.parentProfile.findMany({
                    where: { id: { in: student.parentIds } },
                    select: { userId: true },
                  });

                  for (const parent of parents) {
                    await notificationService.createNotification({
                      userId: parent.userId,
                      type: NotificationType.ATTENDANCE_WARNING,
                      title: "⚠️ Child's Low Attendance Warning",
                      message: `Your child's attendance has dropped to ${percentage.toFixed(1)}%. Please take action.`,
                      metadata: { attendance: percentage, studentId: entry.studentId },
                    });
                  }
                }
              }
            }
          }
        }
        break;
      }

      case 'announcement:new': {
        const { announcementId, title, target, classId } = data as {
          announcementId: string;
          title: string;
          target: string;
          classId?: string;
        };

        // Build user query based on target
        const where: Record<string, unknown> = { deletedAt: null };
        if (target === 'STUDENTS') where.role = 'STUDENT';
        else if (target === 'TEACHERS') where.role = 'TEACHER';
        else if (target === 'PARENTS') where.role = 'PARENT';
        else if (target === 'CLASS' && classId) {
          // Get students of the class
          const students = await prisma.studentProfile.findMany({
            where: { classId, deletedAt: null },
            select: { userId: true, parentIds: true },
          });
          const parents = await prisma.parentProfile.findMany({
            where: { id: { in: [...new Set(students.flatMap((student) => student.parentIds))] }, deletedAt: null },
            select: { userId: true },
          });
          const userIds = [...new Set([...students.map((student) => student.userId), ...parents.map((parent) => parent.userId)])];
          const notifications = userIds.map((userId) => ({
            userId,
            type: NotificationType.ANNOUNCEMENT,
            title: 'New Announcement',
            message: title,
            metadata: { announcementId },
          }));
          await notificationService.createBulkNotifications(notifications);
          break;
        }

        if (target !== 'CLASS') {
          const users = await prisma.user.findMany({ where, select: { id: true } });
          const notifications = users.map((user) => ({
            userId: user.id,
            type: NotificationType.ANNOUNCEMENT,
            title: 'New Announcement',
            message: title,
            metadata: { announcementId },
          }));
          await notificationService.createBulkNotifications(notifications);
          logger.info(`Announcement notifications sent to ${users.length} users`);
        }
        break;
      }

      case 'fee:created': {
        const { studentUserIds, feeTitle, amount, dueDate } = data as {
          studentUserIds: string[];
          feeTitle: string;
          amount: number;
          dueDate: string;
        };

        const parentUserIds = await linkedParentUserIds(studentUserIds);
        const notifications = [...new Set([...studentUserIds, ...parentUserIds])].map((userId) => ({
          userId,
          type: NotificationType.FEE_DUE,
          title: 'Fee Due',
          message: `${feeTitle}: ₹${amount} due by ${new Date(dueDate).toLocaleDateString()}`,
          metadata: { amount, dueDate },
        }));

        await notificationService.createBulkNotifications(notifications);
        break;
      }

      default:
        logger.warn(`Unknown notification job: ${name}`);
    }
  });

  logger.info('✅ Notification worker started');
  return worker;
}
