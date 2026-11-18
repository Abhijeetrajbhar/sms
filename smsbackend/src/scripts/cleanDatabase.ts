import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Purging all demo data and seeded records from database...\n');

  const operations = [
    { name: 'AuditLog', fn: () => prisma.auditLog.deleteMany() },
    { name: 'Refund', fn: () => prisma.refund.deleteMany() },
    { name: 'Receipt', fn: () => prisma.receipt.deleteMany() },
    { name: 'OfflinePayment', fn: () => prisma.offlinePayment.deleteMany() },
    { name: 'PaymentWebhookEvent', fn: () => prisma.paymentWebhookEvent.deleteMany() },
    { name: 'PaymentAttempt', fn: () => prisma.paymentAttempt.deleteMany() },
    { name: 'FeeInvoice', fn: () => prisma.feeInvoice.deleteMany() },
    { name: 'FeeStructure', fn: () => prisma.feeStructure.deleteMany() },
    { name: 'Payment', fn: () => prisma.payment.deleteMany() },
    { name: 'PaymentLedger', fn: () => prisma.paymentLedger.deleteMany() },
    { name: 'Fee', fn: () => prisma.fee.deleteMany() },
    { name: 'AssignmentSubmission', fn: () => prisma.assignmentSubmission.deleteMany() },
    { name: 'Assignment', fn: () => prisma.assignment.deleteMany() },
    { name: 'Result', fn: () => prisma.result.deleteMany() },
    { name: 'ReportCard', fn: () => prisma.reportCard.deleteMany() },
    { name: 'Attendance', fn: () => prisma.attendance.deleteMany() },
    { name: 'Notification', fn: () => prisma.notification.deleteMany() },
    { name: 'Announcement', fn: () => prisma.announcement.deleteMany() },
    { name: 'TimetableSlot', fn: () => prisma.timetableSlot.deleteMany() },
    { name: 'Timetable', fn: () => prisma.timetable.deleteMany() },
    { name: 'SubjectTeacher', fn: () => prisma.subjectTeacher.deleteMany() },
    { name: 'StudentDocument', fn: () => prisma.studentDocument.deleteMany() },
    { name: 'StudentProfile', fn: () => prisma.studentProfile.deleteMany() },
    { name: 'TeacherProfile', fn: () => prisma.teacherProfile.deleteMany() },
    { name: 'ParentProfile', fn: () => prisma.parentProfile.deleteMany() },
    { name: 'AdmissionApplication', fn: () => prisma.admissionApplication.deleteMany() },
    { name: 'AcademicCalendarEvent', fn: () => prisma.academicCalendarEvent.deleteMany() },
    { name: 'LeaveRequest', fn: () => prisma.leaveRequest.deleteMany() },
    { name: 'Class', fn: () => prisma.class.deleteMany() },
    { name: 'Subject', fn: () => prisma.subject.deleteMany() },
    { name: 'Session', fn: () => prisma.session.deleteMany() },
    { name: 'FileAsset', fn: () => prisma.fileAsset.deleteMany() },
    { name: 'User', fn: () => prisma.user.deleteMany() },
    { name: 'School', fn: () => prisma.school.deleteMany() },
  ];

  let totalDeleted = 0;
  for (const op of operations) {
    try {
      const res = await op.fn();
      if (res.count > 0) {
        console.log(`  ✓ Cleared ${res.count} records from ${op.name}`);
        totalDeleted += res.count;
      }
    } catch (err) {
      console.warn(`  ⚠️ Could not clear ${op.name}:`, err instanceof Error ? err.message : err);
    }
  }

  console.log(`\n✨ Database successfully reset to a fresh state. Total records purged: ${totalDeleted}`);
}

main()
  .catch((err) => {
    console.error('Fatal purge error:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
