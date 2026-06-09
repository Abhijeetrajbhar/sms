import { RiskLevel } from '@prisma/client';

export interface RiskScoreInput {
  attendancePercentage: number;
  averageMarks: number;
  missingAssignments: number;
  lateSubmissions: number;
  totalAssignments: number;
}

export interface RiskScoreResult {
  riskScore: number;
  riskLevel: RiskLevel;
  riskFactors: string[];
  recommendations: string[];
}

export function calculateRiskScore(input: RiskScoreInput): RiskScoreResult {
  let score = 0;
  const riskFactors: string[] = [];
  const recommendations: string[] = [];

  // Attendance risk (max 40 points)
  if (input.attendancePercentage < 60) {
    score += 40;
    riskFactors.push(`Critical attendance rate: ${input.attendancePercentage.toFixed(1)}%`);
    recommendations.push('Immediate attendance counseling required');
  } else if (input.attendancePercentage < 75) {
    score += 25;
    riskFactors.push(`Low attendance rate: ${input.attendancePercentage.toFixed(1)}%`);
    recommendations.push('Regular attendance monitoring recommended');
  } else if (input.attendancePercentage < 85) {
    score += 10;
    riskFactors.push(`Below average attendance: ${input.attendancePercentage.toFixed(1)}%`);
    recommendations.push('Encourage consistent attendance');
  }

  // Academic performance risk (max 35 points)
  if (input.averageMarks < 40) {
    score += 35;
    riskFactors.push(`Very low average marks: ${input.averageMarks.toFixed(1)}%`);
    recommendations.push('Academic intervention and tutoring needed urgently');
  } else if (input.averageMarks < 55) {
    score += 20;
    riskFactors.push(`Below passing average: ${input.averageMarks.toFixed(1)}%`);
    recommendations.push('Additional academic support recommended');
  } else if (input.averageMarks < 65) {
    score += 10;
    riskFactors.push(`Below average marks: ${input.averageMarks.toFixed(1)}%`);
    recommendations.push('Monitor academic progress closely');
  }

  // Missing assignments (max 15 points)
  const missingRate =
    input.totalAssignments > 0
      ? (input.missingAssignments / input.totalAssignments) * 100
      : 0;

  if (missingRate > 50) {
    score += 15;
    riskFactors.push(`High missing assignments: ${input.missingAssignments} of ${input.totalAssignments}`);
    recommendations.push('Follow up on all missing assignments immediately');
  } else if (missingRate > 25) {
    score += 8;
    riskFactors.push(`Several missing assignments: ${input.missingAssignments}`);
    recommendations.push('Remind student to complete pending assignments');
  }

  // Late submissions (max 10 points)
  const lateRate =
    input.totalAssignments > 0
      ? (input.lateSubmissions / input.totalAssignments) * 100
      : 0;

  if (lateRate > 40) {
    score += 10;
    riskFactors.push(`High late submission rate: ${input.lateSubmissions} submissions`);
    recommendations.push('Discuss time management strategies with student');
  } else if (lateRate > 20) {
    score += 5;
    riskFactors.push(`Frequent late submissions: ${input.lateSubmissions}`);
    recommendations.push('Encourage timely assignment submission');
  }

  // Determine risk level
  let riskLevel: RiskLevel;
  if (score >= 70) {
    riskLevel = RiskLevel.CRITICAL;
  } else if (score >= 45) {
    riskLevel = RiskLevel.HIGH;
  } else if (score >= 20) {
    riskLevel = RiskLevel.MEDIUM;
  } else {
    riskLevel = RiskLevel.LOW;
  }

  if (riskFactors.length === 0) {
    riskFactors.push('No significant risk factors identified');
    recommendations.push('Continue current performance level');
  }

  return {
    riskScore: Math.min(100, score),
    riskLevel,
    riskFactors,
    recommendations,
  };
}
