import { Grade } from '@prisma/client';

export function calculateGrade(percentage: number): Grade {
  if (percentage >= 95) return Grade.A_PLUS;
  if (percentage >= 85) return Grade.A;
  if (percentage >= 75) return Grade.B_PLUS;
  if (percentage >= 65) return Grade.B;
  if (percentage >= 50) return Grade.C;
  if (percentage >= 40) return Grade.D;
  return Grade.F;
}

export function calculateGPA(percentage: number): number {
  if (percentage >= 95) return 4.0;
  if (percentage >= 85) return 3.7;
  if (percentage >= 75) return 3.3;
  if (percentage >= 65) return 3.0;
  if (percentage >= 55) return 2.7;
  if (percentage >= 50) return 2.3;
  if (percentage >= 45) return 2.0;
  if (percentage >= 40) return 1.7;
  return 0.0;
}

export function calculatePercentage(marks: number, maxMarks: number): number {
  if (maxMarks === 0) return 0;
  return Math.round((marks / maxMarks) * 100 * 100) / 100;
}

export function gradeToString(grade: Grade): string {
  const gradeMap: Record<Grade, string> = {
    A_PLUS: 'A+',
    A: 'A',
    B_PLUS: 'B+',
    B: 'B',
    C: 'C',
    D: 'D',
    F: 'F',
  };
  return gradeMap[grade];
}

export function calculateOverallGPA(gpas: number[]): number {
  if (!gpas.length) return 0;
  const sum = gpas.reduce((acc, gpa) => acc + gpa, 0);
  return Math.round((sum / gpas.length) * 100) / 100;
}
