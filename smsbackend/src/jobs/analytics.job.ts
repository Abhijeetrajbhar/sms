import { Job } from 'bullmq';
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

        let updated = 0;
        for (const { id } of students) {
          try {
            const [attendances, results, submissions] = await Promise.all([
              prisma.attendance.findMany({ where: { studentId: id }, select: { status: true } }),
              prisma.result.findMany({
                where: { studentId: id, isPublished: true },
                select: { percentage: true },
              }),
              prisma.assignmentSubmission.findMany({
                where: { studentId: id },
                select: { status: true, isLate: true },
              }),
            ]);

            const summary = getAttendanceSummary(attendances);
            const avgMarks =
              results.length
                ? results.reduce((s, r) => s + r.percentage, 0) / results.length
                : 0;
            const missing = submissions.filter(
              (s) => s.status === 'MISSING' || s.status === 'PENDING'
            ).length;
            const late = submissions.filter((s) => s.isLate).length;

            const { riskScore, riskLevel } = calculateRiskScore({
              attendancePercentage: summary.percentage,
              averageMarks: avgMarks,
              missingAssignments: missing,
              lateSubmissions: late,
              totalAssignments: submissions.length,
            });

            await prisma.studentProfile.update({
              where: { id },
              data: { riskScore, riskLevel },
            });
            updated++;
          } catch (err) {
            logger.error(`Risk score update failed for student ${id}:`, err);
          }
        }

        logger.info(`Risk scores updated for ${updated}/${students.length} students`);
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

  logger.info('✅ Analytics worker started');
  return worker;
}
