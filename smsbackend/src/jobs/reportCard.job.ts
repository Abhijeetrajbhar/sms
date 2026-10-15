import { Job } from 'bullmq';
import { createWorker } from '../config/queue';
import { ReportCardService } from '../modules/reportCard/service';
import { uploadToCloudinary } from '../middlewares/upload.middleware';
import prisma from '../config/database';
import logger from '../utils/logger';

const reportCardService = new ReportCardService();

export function startReportCardWorker() {
  const worker = createWorker('reportCard', async (job: Job) => {
    const { reportCardId, student, results, summary } = job.data as {
      reportCardId: string;
      student: { name: string; studentCode: string; class: string; gradeLevel: string };
      results: Array<{
        subject: string;
        code: string;
        marks: number;
        maxMarks: number;
        percentage: number;
        grade: string;
        gpa: number;
        remarks?: string | null;
      }>;
      summary: {
        totalMarks: number;
        maxMarks: number;
        percentage: number;
        gpa: number;
        overallGrade: string;
        attendancePercentage: number;
        attendancePresent: number;
        attendanceTotal: number;
        teacherRemarks?: string;
        principalRemarks?: string;
        academicYear: string;
        term: string;
      };
    };

    logger.info(`Generating PDF for report card ${reportCardId}`);

    try {
      const pdfBuffer = await reportCardService.buildPDF({ reportCardId, student, results, summary });

      const { url, publicId } = await uploadToCloudinary(pdfBuffer, 'report-cards', 'raw');

      await prisma.reportCard.update({
        where: { id: reportCardId },
        data: {
          pdfUrl: url,
          pdfPublicId: publicId,
          isGenerated: true,
          generatedAt: new Date(),
        },
      });

      logger.info(`Report card PDF generated and stored: ${url}`);
      return { success: true, url };
    } catch (error) {
      logger.error(`Report card generation failed for ${reportCardId}:`, error);
      throw error;
    }
  });

  if (worker) logger.info('Report card worker started');
  return worker;
}
