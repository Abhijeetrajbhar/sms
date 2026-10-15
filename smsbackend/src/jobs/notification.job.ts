import { Job } from 'bullmq';
import { createWorker } from '../config/queue';
import { NotificationService } from '../modules/notification/service';
import { NotificationType, Prisma } from '@prisma/client';
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
        const { entries } = data as {
          date: string;
          entries: Array<{ studentId: string; status: string }>;
        };

        const absentStudentIds = [
          ...new Set(
            entries
              .filter((e) => e.status === 'ABSENT')
              .map((e) => e.studentId)
          ),
        ];
        if (!absentStudentIds.length) break;

        // Batch load attendance records for all absent students in one query
        const allRecords = await prisma.attendance.findMany({
          where: { studentId: { in: absentStudentIds } },
          select: { studentId: true, status: true },
        });

        const recordsByStudent = new Map<string, typeof allRecords>();
        for (const record of allRecords) {
          const list = recordsByStudent.get(record.studentId) ?? [];
          list.push(record);
          recordsByStudent.set(record.studentId, list);
        }

        const percentageByStudent = new Map<string, number>();
        for (const id of absentStudentIds) {
          const records = recordsByStudent.get(id) ?? [];
          const present = records.filter(
            (r) => r.status === 'PRESENT' || r.status === 'LATE'
          ).length;
          const percentage = records.length > 0 ? (present / records.length) * 100 : 100;
          if (percentage < 75) percentageByStudent.set(id, percentage);
        }

        if (!percentageByStudent.size) break;

        // Batch load student profiles for low-attendance students in one query
        const students = await prisma.studentProfile.findMany({
          where: { id: { in: [...percentageByStudent.keys()] } },
          select: { id: true, userId: true, parentIds: true },
        });

        // Batch load parent user ids in one query
        const parentIds = [
          ...new Set(students.flatMap((s) => s.parentIds)),
        ];
        const parents = parentIds.length
          ? await prisma.parentProfile.findMany({
              where: { id: { in: parentIds } },
              select: { id: true, userId: true },
            })
          : [];
        const parentUserByParentId = new Map(parents.map((p) => [p.id, p.userId]));

        const notifications: Array<{
          userId: string;
          type: NotificationType;
          title: string;
          message: string;
          metadata?: Prisma.InputJsonValue;
        }> = [];
        for (const student of students) {
          const percentage = percentageByStudent.get(student.id)!;
          notifications.push({
            userId: student.userId,
            type: NotificationType.ATTENDANCE_WARNING,
            title: '⚠️ Low Attendance Warning',
            message: `Your attendance has dropped to ${percentage.toFixed(1)}%. Minimum required is 75%.`,
            metadata: { attendance: percentage, studentId: student.id },
          });

          for (const parentId of student.parentIds) {
            const parentUserId = parentUserByParentId.get(parentId);
            if (!parentUserId) continue;
            notifications.push({
              userId: parentUserId,
              type: NotificationType.ATTENDANCE_WARNING,
              title: "⚠️ Child's Low Attendance Warning",
              message: `Your child's attendance has dropped to ${percentage.toFixed(1)}%. Please take action.`,
              metadata: { attendance: percentage, studentId: student.id },
            });
          }
        }

        await notificationService.createBulkNotifications(notifications);
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
          // Load users in chunks to avoid pulling the entire user table into memory
          const BATCH_SIZE = 500;
          let cursor: { id: string } | undefined;
          let total = 0;
          while (true) {
            const users = await prisma.user.findMany({
              where,
              select: { id: true },
              orderBy: { id: 'asc' },
              take: BATCH_SIZE,
              ...(cursor ? { cursor: { id: cursor.id }, skip: 1 } : {}),
            });
            if (!users.length) break;

            const notifications = users.map((user) => ({
              userId: user.id,
              type: NotificationType.ANNOUNCEMENT,
              title: 'New Announcement',
              message: title,
              metadata: { announcementId },
            }));
            await notificationService.createBulkNotifications(notifications);
            total += users.length;
            if (users.length < BATCH_SIZE) break;
            cursor = users[users.length - 1];
          }
          logger.info(`Announcement notifications sent to ${total} users`);
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

  if (worker) logger.info('Notification worker started');
  return worker;
}
