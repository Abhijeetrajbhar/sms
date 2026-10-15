import prisma from '../../config/database';
import PDFDocument from 'pdfkit';
import { AppError } from '../../utils/AppError';
import { calculateGrade, calculateOverallGPA, gradeToString } from '../../utils/grading';
import { getAttendanceSummary } from '../../utils/attendance';
import { reportCardQueue } from '../../config/queue';

export class ReportCardService {
  async generateReportCard(data: {
    studentId: string;
    classId: string;
    academicYear: string;
    term: string;
    teacherRemarks?: string;
    principalRemarks?: string;
  }) {
    const [student, results, attendances] = await Promise.all([
      prisma.studentProfile.findUnique({
        where: { id: data.studentId },
        include: {
          user: { select: { firstName: true, lastName: true, email: true, avatarUrl: true } },
          class: { select: { name: true, section: true, gradeLevel: true } },
        },
      }),
      prisma.result.findMany({
        where: {
          studentId: data.studentId,
          classId: data.classId,
          academicYear: data.academicYear,
          term: data.term,
          isPublished: true,
        },
        include: { subject: { select: { name: true, code: true, credits: true } } },
      }),
      prisma.attendance.findMany({
        where: { studentId: data.studentId, classId: data.classId },
        select: { status: true },
      }),
    ]);

    if (!student) throw AppError.notFound('Student not found');
    if (student.classId !== data.classId) throw AppError.unprocessable('Student does not belong to the selected class or section');
    if (!results.length) throw AppError.badRequest('No published results found for this term');

    const totalMarks = results.reduce((s, r) => s + r.marksObtained, 0);
    const maxMarks = results.reduce((s, r) => s + r.maxMarks, 0);
    const percentage = maxMarks > 0 ? (totalMarks / maxMarks) * 100 : 0;
    const gpa = calculateOverallGPA(results.map((r) => r.gpa));
    const overallGrade = calculateGrade(percentage);
    const attendanceSummary = getAttendanceSummary(attendances);

    // Upsert report card record
    const existing = await prisma.reportCard.findUnique({
      where: {
        studentId_academicYear_term: {
          studentId: data.studentId,
          academicYear: data.academicYear,
          term: data.term,
        },
      },
    });

    const reportCard = existing
      ? await prisma.reportCard.update({
          where: { id: existing.id },
          data: {
            totalMarks,
            maxMarks,
            percentage: Math.round(percentage * 100) / 100,
            gpa,
            overallGrade,
            attendancePercentage: attendanceSummary.percentage,
            teacherRemarks: data.teacherRemarks,
            principalRemarks: data.principalRemarks,
          },
        })
      : await prisma.reportCard.create({
          data: {
            studentId: data.studentId,
            classId: data.classId,
            academicYear: data.academicYear,
            term: data.term,
            totalMarks,
            maxMarks,
            percentage: Math.round(percentage * 100) / 100,
            gpa,
            overallGrade,
            attendancePercentage: attendanceSummary.percentage,
            teacherRemarks: data.teacherRemarks,
            principalRemarks: data.principalRemarks,
          },
        });

    // Queue PDF generation job
    await reportCardQueue.add('generatePDF', {
      reportCardId: reportCard.id,
      student: {
        name: `${student.user.firstName} ${student.user.lastName}`,
        studentCode: student.studentCode,
        class: student.class
          ? `${student.class.name} - ${student.class.section}`
          : 'Unassigned',
        gradeLevel: student.class?.gradeLevel || '',
      },
      results: results.map((r) => ({
        subject: r.subject.name,
        code: r.subject.code,
        marks: r.marksObtained,
        maxMarks: r.maxMarks,
        percentage: r.percentage,
        grade: gradeToString(r.grade),
        gpa: r.gpa,
        remarks: r.remarks,
      })),
      summary: {
        totalMarks,
        maxMarks,
        percentage: Math.round(percentage * 100) / 100,
        gpa,
        overallGrade: gradeToString(overallGrade),
        attendancePercentage: attendanceSummary.percentage,
        attendancePresent: attendanceSummary.present,
        attendanceTotal: attendanceSummary.total,
        teacherRemarks: data.teacherRemarks,
        principalRemarks: data.principalRemarks,
        academicYear: data.academicYear,
        term: data.term,
      },
    });

    return reportCard;
  }

  async buildPDF(jobData: {
    reportCardId: string;
    student: {
      name: string;
      studentCode: string;
      class: string;
      gradeLevel: string;
    };
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
  }): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const doc = new PDFDocument({ margin: 50, size: 'A4' });

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const { student, results, summary } = jobData;

      // ── Header ───────────────────────────────────────────────
      doc
        .fontSize(24)
        .fillColor('#1a365d')
        .text('EduManage', { align: 'center' })
        .fontSize(14)
        .fillColor('#4a5568')
        .text('Student Report Card', { align: 'center' })
        .moveDown(0.5);

      doc
        .fontSize(11)
        .fillColor('#718096')
        .text(`Academic Year: ${summary.academicYear} | Term: ${summary.term}`, { align: 'center' })
        .moveDown(1);

      // ── Student Info ─────────────────────────────────────────
      doc.rect(50, doc.y, 495, 80).fillAndStroke('#f7fafc', '#e2e8f0').fillColor('#2d3748');

      const infoY = doc.y + 10;
      doc
        .fontSize(12)
        .text(`Student Name: ${student.name}`, 70, infoY)
        .text(`Student ID: ${student.studentCode}`, 70, infoY + 18)
        .text(`Class: ${student.class}`, 70, infoY + 36)
        .text(`Grade Level: ${student.gradeLevel}`, 300, infoY)
        .text(`Generated: ${new Date().toLocaleDateString()}`, 300, infoY + 18);

      doc.moveDown(4);

      // ── Results Table ─────────────────────────────────────────
      doc
        .fontSize(13)
        .fillColor('#1a365d')
        .text('Academic Performance', { underline: true })
        .moveDown(0.5);

      // Table headers
      const tableTop = doc.y;
      const cols = { subject: 50, code: 210, marks: 290, pct: 360, grade: 420, gpa: 470 };

      doc
        .fontSize(10)
        .fillColor('#ffffff')
        .rect(50, tableTop, 495, 20)
        .fill('#2b6cb0')
        .fillColor('#ffffff')
        .text('Subject', cols.subject, tableTop + 5)
        .text('Code', cols.code, tableTop + 5)
        .text('Marks', cols.marks, tableTop + 5)
        .text('%', cols.pct, tableTop + 5)
        .text('Grade', cols.grade, tableTop + 5)
        .text('GPA', cols.gpa, tableTop + 5);

      let rowY = tableTop + 22;
      results.forEach((r, i) => {
        const bg = i % 2 === 0 ? '#f7fafc' : '#ffffff';
        doc.rect(50, rowY, 495, 18).fill(bg).fillColor('#2d3748');
        doc
          .fontSize(9)
          .text(r.subject, cols.subject, rowY + 4, { width: 155, ellipsis: true })
          .text(r.code, cols.code, rowY + 4)
          .text(`${r.marks}/${r.maxMarks}`, cols.marks, rowY + 4)
          .text(`${r.percentage.toFixed(1)}%`, cols.pct, rowY + 4)
          .text(r.grade, cols.grade, rowY + 4)
          .text(r.gpa.toFixed(2), cols.gpa, rowY + 4);
        rowY += 18;
      });

      doc.moveDown(1);

      // ── Summary ───────────────────────────────────────────────
      doc
        .fontSize(13)
        .fillColor('#1a365d')
        .text('Overall Summary', { underline: true })
        .moveDown(0.5);

      const sumY = doc.y;
      doc.rect(50, sumY, 495, 90).fillAndStroke('#ebf8ff', '#bee3f8');

      doc
        .fontSize(11)
        .fillColor('#2d3748')
        .text(`Total Marks: ${summary.totalMarks} / ${summary.maxMarks}`, 70, sumY + 10)
        .text(`Overall Percentage: ${summary.percentage.toFixed(2)}%`, 70, sumY + 28)
        .text(`Overall GPA: ${summary.gpa.toFixed(2)} / 4.0`, 70, sumY + 46)
        .text(`Overall Grade: ${summary.overallGrade}`, 70, sumY + 64)
        .text(
          `Attendance: ${summary.attendancePresent}/${summary.attendanceTotal} days (${summary.attendancePercentage.toFixed(1)}%)`,
          310,
          sumY + 10
        );

      doc.moveDown(5);

      // ── Remarks ───────────────────────────────────────────────
      if (summary.teacherRemarks) {
        doc
          .fontSize(11)
          .fillColor('#1a365d')
          .text('Teacher Remarks:', { underline: true })
          .fontSize(10)
          .fillColor('#4a5568')
          .text(summary.teacherRemarks)
          .moveDown(0.5);
      }

      if (summary.principalRemarks) {
        doc
          .fontSize(11)
          .fillColor('#1a365d')
          .text('Principal Remarks:', { underline: true })
          .fontSize(10)
          .fillColor('#4a5568')
          .text(summary.principalRemarks)
          .moveDown(0.5);
      }

      // ── Footer ────────────────────────────────────────────────
      doc
        .moveDown(2)
        .fontSize(9)
        .fillColor('#a0aec0')
        .text('This is a computer-generated report card.', { align: 'center' })
        .text('EduManage School Management System', { align: 'center' });

      doc.end();
    });
  }

  async getReportCard(studentId: string, academicYear: string, term: string) {
    const reportCard = await prisma.reportCard.findUnique({
      where: { studentId_academicYear_term: { studentId, academicYear, term } },
      include: {
        student: { include: { user: { select: { firstName: true, lastName: true } } } },
        class: { select: { name: true, section: true } },
      },
    });
    if (!reportCard) throw AppError.notFound('Report card not found');
    return reportCard;
  }

  async getStudentReportCards(studentId: string) {
    return prisma.reportCard.findMany({
      where: { studentId },
      orderBy: [{ academicYear: 'desc' }, { term: 'desc' }],
    });
  }
}
