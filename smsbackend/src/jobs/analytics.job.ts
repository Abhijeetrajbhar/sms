import { Job } from 'bullmq';
import { Prisma } from '@prisma/client';
import { createWorker } from '../config/queue';
import { cacheDelPattern } from '../config/redis';
import prisma from '../config/database';
import { calculateRiskScore } from '../utils/riskScore';
import { getAttendanceSummary } from '../utils/attendance';
import logger from '../utils/logger';

export function startAnalyticsWorker() {
  const worker = createWorker('analytics', async (job: Job) => {
    const { name } = job;

    switch (name) {
      case 'refreshAnalyticsCache': {
        // Bust all analytics caches so next request recomputes
        await cacheDelPattern('analytics:*');
        logger.info('Analytics cache cleared');
        break;
      }

      case 'updateAllRiskScores': {
        // Recalculate risk scores for all active students
        const students = await prisma.studentProfile.findMany({
          where: { deletedAt: null },
          select: { id: true },
        });

        const ids = students.map((s) => s.id);
        if (!ids.length) break;

        // Batch load all data with 3 queries instead of 3 per student
        const [attendances, results, submissions] = await Promise.all([
          prisma.attendance.findMany({
            where: { studentId: { in: ids } },
            select: { studentId: true, status: true },
          }),
          prisma.result.findMany({
            where: { studentId: { in: ids }, isPublished: true },
            select: { studentId: true, percentage: true },
          }),
          prisma.assignmentSubmission.findMany({
            where: { studentId: { in: ids } },
            select: { studentId: true, status: true, isLate: true },
          }),
        ]);

        const attendanceByStudent = new Map<string, typeof attendances>();
        for (const record of attendances) {
          const list = attendanceByStudent.get(record.studentId) ?? [];
          list.push(record);
          attendanceByStudent.set(record.studentId, list);
        }
        const resultsByStudent = new Map<string, typeof results>();
        for (const record of results) {
          const list = resultsByStudent.get(record.studentId) ?? [];
          list.push(record);
          resultsByStudent.set(record.studentId, list);
        }
        const submissionsByStudent = new Map<string, typeof submissions>();
        for (const record of submissions) {
          const list = submissionsByStudent.get(record.studentId) ?? [];
          list.push(record);
          submissionsByStudent.set(record.studentId, list);
        }

        const updates: Prisma.PrismaPromise<unknown>[] = [];
        for (const { id } of students) {
          try {
            const summary = getAttendanceSummary(attendanceByStudent.get(id) ?? []);
            const studentResults = resultsByStudent.get(id) ?? [];
            const avgMarks = studentResults.length
              ? studentResults.reduce((s, r) => s + r.percentage, 0) / studentResults.length
              : 0;
            const studentSubmissions = submissionsByStudent.get(id) ?? [];
            const missing = studentSubmissions.filter(
              (s) => s.status === 'MISSING' || s.status === 'PENDING'
            ).length;
            const late = studentSubmissions.filter((s) => s.isLate).length;

            const { riskScore, riskLevel } = calculateRiskScore({
              attendancePercentage: summary.percentage,
              averageMarks: avgMarks,
              missingAssignments: missing,
              lateSubmissions: late,
              totalAssignments: studentSubmissions.length,
            });

            updates.push(
              prisma.studentProfile.update({
                where: { id },
                data: { riskScore, riskLevel },
              })
            );
          } catch (err) {
            logger.error(`Risk score update failed for student ${id}:`, err);
          }
        }

        // Execute in chunks to stay within transaction operation limits
        for (let i = 0; i < updates.length; i += 100) {
          await prisma.$transaction(updates.slice(i, i + 100));
        }

        logger.info(`Risk scores updated for ${updates.length}/${students.length} students`);
        break;
      }

      case 'markOverdueFees': {
        const result = await prisma.fee.updateMany({
          where: {
            status: { in: ['PENDING', 'PARTIAL'] },
            dueDate: { lt: new Date() },
          },
          data: { status: 'OVERDUE' },
        });
        logger.info(`${result.count} fees marked as overdue`);
        break;
      }

      default:
        logger.warn(`Unknown analytics job: ${name}`);
    }
  });

  if (worker) logger.info('Analytics worker started');
  return worker;
}
