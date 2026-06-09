import { AIProvider } from './providers/provider.interface';
import { GeminiProvider } from './providers/gemini.provider';
import { OpenAIProvider } from './providers/openai.provider';
import {
  SYSTEM_PROMPT,
  studentSummaryPrompt,
  teacherRemarkPrompt,
  attendanceTrendPrompt,
  assignmentQuestionsPrompt,
  riskExplanationPrompt,
} from './prompts';
import prisma from '../../config/database';
import { AppError } from '../../utils/AppError';
import { getAttendanceSummary } from '../../utils/attendance';
import logger from '../../utils/logger';
import config from '../../config/env';

class AIService {
  private provider: AIProvider;

  constructor() {
    // Adapter: pick provider based on config
    this.provider =
      config.AI_PROVIDER === 'openai'
        ? new OpenAIProvider()
        : new GeminiProvider();
  }

  private async complete(prompt: string): Promise<string> {
    if (!this.provider.isAvailable()) {
      throw AppError.internal('AI provider not configured. Set API key in environment variables.');
    }
    return this.provider.complete(prompt, SYSTEM_PROMPT);
  }

  async generateStudentSummary(studentId: string, requesterId: string, requesterRole: string) {
    const student = await prisma.studentProfile.findUnique({
      where: { id: studentId },
      include: { user: { select: { firstName: true, lastName: true } } },
    });
    if (!student) throw AppError.notFound('Student not found');

    // Authorization check
    if (requesterRole === 'PARENT') {
      const parent = await prisma.parentProfile.findUnique({ where: { userId: requesterId } });
      if (!parent || !student.parentIds.includes(parent.id)) {
        throw AppError.forbidden('Not authorized to view this student');
      }
    }

    const [attendances, results] = await Promise.all([
      prisma.attendance.findMany({ where: { studentId }, select: { status: true } }),
      prisma.result.findMany({
        where: { studentId, isPublished: true },
        include: { subject: { select: { name: true } } },
      }),
    ]);

    const summary = getAttendanceSummary(attendances);
    const avgScore = results.length
      ? results.reduce((s, r) => s + r.percentage, 0) / results.length
      : 0;

    // Group by subject
    const subjectMap: Record<string, number[]> = {};
    results.forEach((r) => {
      if (!subjectMap[r.subject.name]) subjectMap[r.subject.name] = [];
      subjectMap[r.subject.name].push(r.percentage);
    });
    const subjectPerformance = Object.entries(subjectMap).map(([subject, scores]) => ({
      subject,
      average: scores.reduce((a, b) => a + b, 0) / scores.length,
    }));

    const prompt = studentSummaryPrompt({
      name: `${student.user.firstName} ${student.user.lastName}`,
      attendancePercentage: summary.percentage,
      averageScore: avgScore,
      riskLevel: student.riskLevel,
      subjectPerformance,
    });

    const aiResponse = await this.complete(prompt);
    logger.info(`AI student summary generated for student ${studentId}`);
    return { summary: aiResponse };
  }

  async generateTeacherRemark(data: {
    studentId: string;
    academicYear: string;
    term: string;
  }) {
    const student = await prisma.studentProfile.findUnique({
      where: { id: data.studentId },
      include: { user: { select: { firstName: true, lastName: true } } },
    });
    if (!student) throw AppError.notFound('Student not found');

    const [results, attendances] = await Promise.all([
      prisma.result.findMany({
        where: { studentId: data.studentId, academicYear: data.academicYear, term: data.term, isPublished: true },
        include: { subject: { select: { name: true } } },
      }),
      prisma.attendance.findMany({ where: { studentId: data.studentId }, select: { status: true } }),
    ]);

    const attendanceSummary = getAttendanceSummary(attendances);
    const prompt = teacherRemarkPrompt({
      studentName: `${student.user.firstName} ${student.user.lastName}`,
      subjects: results.map((r) => ({
        name: r.subject.name,
        marks: r.marksObtained,
        maxMarks: r.maxMarks,
        percentage: r.percentage,
      })),
      attendancePercentage: attendanceSummary.percentage,
      term: data.term,
    });

    const remark = await this.complete(prompt);
    return { remark };
  }

  async explainAttendanceTrend(studentId: string) {
    const student = await prisma.studentProfile.findUnique({
      where: { id: studentId },
      include: { user: { select: { firstName: true, lastName: true } } },
    });
    if (!student) throw AppError.notFound('Student not found');

    const attendances = await prisma.attendance.findMany({
      where: { studentId },
      select: { status: true, date: true },
    });

    const summary = getAttendanceSummary(attendances);
    const prompt = attendanceTrendPrompt({
      studentName: `${student.user.firstName} ${student.user.lastName}`,
      currentPercentage: summary.percentage,
      presentDays: summary.present + summary.late,
      totalDays: summary.total,
      absentDays: summary.absent,
      lateDays: summary.late,
    });

    const explanation = await this.complete(prompt);
    return { explanation };
  }

  async generateAssignmentQuestions(data: {
    subject: string;
    topic: string;
    gradeLevel: string;
    count?: number;
    difficulty?: 'easy' | 'medium' | 'hard';
  }) {
    const prompt = assignmentQuestionsPrompt({
      subject: data.subject,
      topic: data.topic,
      gradeLevel: data.gradeLevel,
      count: data.count || 5,
      difficulty: data.difficulty || 'medium',
    });

    const questions = await this.complete(prompt);
    return { questions };
  }

  async explainRiskScore(studentId: string) {
    const student = await prisma.studentProfile.findUnique({
      where: { id: studentId },
      include: { user: { select: { firstName: true, lastName: true } } },
    });
    if (!student) throw AppError.notFound('Student not found');

    const { calculateRiskScore } = await import('../../utils/riskScore');
    const [attendances, results, submissions] = await Promise.all([
      prisma.attendance.findMany({ where: { studentId }, select: { status: true } }),
      prisma.result.findMany({ where: { studentId, isPublished: true }, select: { percentage: true } }),
      prisma.assignmentSubmission.findMany({ where: { studentId }, select: { status: true, isLate: true } }),
    ]);

    const { getAttendanceSummary } = await import('../../utils/attendance');
    const attendanceSummary = getAttendanceSummary(attendances);
    const avgMarks = results.length ? results.reduce((s, r) => s + r.percentage, 0) / results.length : 0;
    const missing = submissions.filter((s) => s.status === 'MISSING').length;
    const late = submissions.filter((s) => s.isLate).length;

    const risk = calculateRiskScore({
      attendancePercentage: attendanceSummary.percentage,
      averageMarks: avgMarks,
      missingAssignments: missing,
      lateSubmissions: late,
      totalAssignments: submissions.length,
    });

    const prompt = riskExplanationPrompt({
      studentName: `${student.user.firstName} ${student.user.lastName}`,
      riskLevel: risk.riskLevel,
      riskScore: risk.riskScore,
      riskFactors: risk.riskFactors,
      recommendations: risk.recommendations,
    });

    const explanation = await this.complete(prompt);
    return { ...risk, explanation };
  }
}

export default new AIService();
