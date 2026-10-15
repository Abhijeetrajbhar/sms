import { AttendanceStatus } from '@prisma/client';

export function calculateAttendancePercentage(
  records: { status: AttendanceStatus }[]
): number {
  if (!records.length) return 0;

  const present = records.filter(
    (r) =>
      r.status === AttendanceStatus.PRESENT ||
      r.status === AttendanceStatus.LATE ||
      r.status === AttendanceStatus.HALF_DAY
  ).length;

  const halfDayCount = records.filter(
    (r) => r.status === AttendanceStatus.HALF_DAY
  ).length;

  // Half day counts as 0.5
  const effectivePresent = present - halfDayCount + halfDayCount * 0.5;
  const total = records.length;

  return Math.round((effectivePresent / total) * 100 * 100) / 100;
}

export const isLowAttendance = (percentage: number): boolean => percentage < 75;

export function getAttendanceSummary(records: { status: AttendanceStatus }[]) {
  const summary = {
    total: records.length,
    present: 0,
    absent: 0,
    late: 0,
    halfDay: 0,
    excused: 0,
    percentage: 0,
  };

  records.forEach((r) => {
    switch (r.status) {
      case AttendanceStatus.PRESENT:
        summary.present++;
        break;
      case AttendanceStatus.ABSENT:
        summary.absent++;
        break;
      case AttendanceStatus.LATE:
        summary.late++;
        break;
      case AttendanceStatus.HALF_DAY:
        summary.halfDay++;
        break;
      case AttendanceStatus.EXCUSED:
        summary.excused++;
        break;
    }
  });

  summary.percentage = calculateAttendancePercentage(records);
  return summary;
}

export function buildMonthlyHeatmap(
  records: { date: Date; status: AttendanceStatus }[]
) {
  const heatmap: Record<string, AttendanceStatus> = {};
  records.forEach((r) => {
    const key = r.date.toISOString().split('T')[0];
    heatmap[key] = r.status;
  });
  return heatmap;
}
