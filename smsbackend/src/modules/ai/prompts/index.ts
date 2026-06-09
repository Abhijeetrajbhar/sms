export const SYSTEM_PROMPT = `You are an educational AI assistant for EduManage School Management System. 
You help teachers, administrators, and parents understand student performance data. 
Be concise, professional, constructive, and supportive. Never share sensitive data beyond what is provided.
Always focus on improvement and actionable insights.`;

export function studentSummaryPrompt(data: {
  name: string;
  attendancePercentage: number;
  averageScore: number;
  riskLevel: string;
  subjectPerformance: Array<{ subject: string; average: number }>;
}): string {
  return `Generate a concise 3-4 sentence academic performance summary for student "${data.name}":
- Attendance: ${data.attendancePercentage.toFixed(1)}%
- Average Score: ${data.averageScore.toFixed(1)}%
- Risk Level: ${data.riskLevel}
- Subject Performance: ${data.subjectPerformance.map((s) => `${s.subject}: ${s.average}%`).join(', ')}

Provide a balanced, constructive summary highlighting strengths and areas for improvement.`;
}

export function teacherRemarkPrompt(data: {
  studentName: string;
  subjects: Array<{ name: string; marks: number; maxMarks: number; percentage: number }>;
  attendancePercentage: number;
  term: string;
}): string {
  return `Generate a professional teacher remark for ${data.studentName}'s ${data.term} report card:
- Attendance: ${data.attendancePercentage.toFixed(1)}%
- Subjects: ${data.subjects.map((s) => `${s.name}: ${s.marks}/${s.maxMarks} (${s.percentage.toFixed(1)}%)`).join(', ')}

Write 2-3 sentences that are encouraging, specific to their performance, and suggest areas for growth. Keep it professional and suitable for a school report card.`;
}

export function attendanceTrendPrompt(data: {
  studentName: string;
  currentPercentage: number;
  presentDays: number;
  totalDays: number;
  absentDays: number;
  lateDays: number;
}): string {
  return `Analyze the attendance trend for student "${data.studentName}":
- Current Attendance: ${data.currentPercentage.toFixed(1)}% (${data.presentDays}/${data.totalDays} days)
- Absent Days: ${data.absentDays}
- Late Arrivals: ${data.lateDays}

In 2-3 sentences, explain what this attendance pattern suggests and provide recommendations for improvement.`;
}

export function assignmentQuestionsPrompt(data: {
  subject: string;
  topic: string;
  gradeLevel: string;
  count: number;
  difficulty: 'easy' | 'medium' | 'hard';
}): string {
  return `Generate ${data.count} ${data.difficulty} assignment questions for:
- Subject: ${data.subject}
- Topic: ${data.topic}
- Grade Level: ${data.gradeLevel}

Format each question numbered (1. 2. etc.). Include a mix of question types (MCQ, short answer, problem-solving). Make them educational and appropriate for the grade level.`;
}

export function riskExplanationPrompt(data: {
  studentName: string;
  riskLevel: string;
  riskScore: number;
  riskFactors: string[];
  recommendations: string[];
}): string {
  return `Provide a supportive explanation of the academic risk assessment for student "${data.studentName}":
- Risk Level: ${data.riskLevel} (Score: ${data.riskScore}/100)
- Risk Factors: ${data.riskFactors.join('; ')}
- System Recommendations: ${data.recommendations.join('; ')}

In 3-4 sentences, explain what these risk factors mean for the student's academic journey and suggest concrete, actionable steps for teachers and parents to support this student.`;
}
