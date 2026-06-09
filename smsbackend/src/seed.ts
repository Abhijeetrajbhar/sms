import { PrismaClient, Role, UserStatus, AttendanceStatus, FeeStatus, AnnouncementTarget, AuditAction } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log(' Seeding EduManage database...\n');

  // ── Clean up ────────────────────────────────────────────────────────────────
  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.fee.deleteMany(),
    prisma.assignmentSubmission.deleteMany(),
    prisma.assignment.deleteMany(),
    prisma.result.deleteMany(),
    prisma.reportCard.deleteMany(),
    prisma.attendance.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.announcement.deleteMany(),
    prisma.timetableSlot.deleteMany(),
    prisma.timetable.deleteMany(),
    prisma.subjectTeacher.deleteMany(),
    prisma.studentProfile.deleteMany(),
    prisma.teacherProfile.deleteMany(),
    prisma.parentProfile.deleteMany(),
    prisma.class.deleteMany(),
    prisma.subject.deleteMany(),
    prisma.session.deleteMany(),
    prisma.fileAsset.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  console.log(' Database cleaned');

  const hashPwd = (p: string) => bcrypt.hash(p, 10);

  // ── Users ────────────────────────────────────────────────────────────────────
  const [adminUser, teacherUser, teacher2User, studentUser, student2User, parentUser] =
    await Promise.all([
      prisma.user.create({
        data: {
          email: 'admin@edumanage.com',
          password: await hashPwd('Admin@123'),
          firstName: 'System',
          lastName: 'Admin',
          role: Role.ADMIN,
          status: UserStatus.ACTIVE,
          isEmailVerified: true,
          phone: '+1-555-0100',
        },
      }),
      prisma.user.create({
        data: {
          email: 'teacher@edumanage.com',
          password: await hashPwd('Teacher@123'),
          firstName: 'Sarah',
          lastName: 'Johnson',
          role: Role.TEACHER,
          status: UserStatus.ACTIVE,
          isEmailVerified: true,
          phone: '+1-555-0101',
        },
      }),
      prisma.user.create({
        data: {
          email: 'teacher2@edumanage.com',
          password: await hashPwd('Teacher@123'),
          firstName: 'Michael',
          lastName: 'Chen',
          role: Role.TEACHER,
          status: UserStatus.ACTIVE,
          isEmailVerified: true,
          phone: '+1-555-0102',
        },
      }),
      prisma.user.create({
        data: {
          email: 'student@edumanage.com',
          password: await hashPwd('Student@123'),
          firstName: 'Alex',
          lastName: 'Smith',
          role: Role.STUDENT,
          status: UserStatus.ACTIVE,
          isEmailVerified: true,
          phone: '+1-555-0103',
        },
      }),
      prisma.user.create({
        data: {
          email: 'student2@edumanage.com',
          password: await hashPwd('Student@123'),
          firstName: 'Emily',
          lastName: 'Davis',
          role: Role.STUDENT,
          status: UserStatus.ACTIVE,
          isEmailVerified: true,
          phone: '+1-555-0104',
        },
      }),
      prisma.user.create({
        data: {
          email: 'parent@edumanage.com',
          password: await hashPwd('Parent@123'),
          firstName: 'Robert',
          lastName: 'Smith',
          role: Role.PARENT,
          status: UserStatus.ACTIVE,
          isEmailVerified: true,
          phone: '+1-555-0105',
        },
      }),
    ]);

  console.log('Users created');

  // ── Subjects ──────────────────────────────────────────────────────────────────
  const [mathSubject, scienceSubject, englishSubject, historySubject, csSubject] =
    await Promise.all([
      prisma.subject.create({ data: { name: 'Mathematics', code: 'MATH101', credits: 4, description: 'Core mathematics including algebra and geometry' } }),
      prisma.subject.create({ data: { name: 'Science', code: 'SCI101', credits: 4, description: 'General science covering physics, chemistry, and biology' } }),
      prisma.subject.create({ data: { name: 'English', code: 'ENG101', credits: 3, description: 'English language and literature' } }),
      prisma.subject.create({ data: { name: 'History', code: 'HIST101', credits: 3, description: 'World history and social studies' } }),
      prisma.subject.create({ data: { name: 'Computer Science', code: 'CS101', credits: 3, description: 'Introduction to programming and digital literacy' } }),
    ]);

  console.log('Subjects created');

  // ── Teacher Profiles ──────────────────────────────────────────────────────────
  const [teacherProfile, teacherProfile2] = await Promise.all([
    prisma.teacherProfile.create({
      data: {
        userId: teacherUser.id,
        employeeCode: 'EMP00001',
        qualification: 'M.Sc Mathematics',
        specialization: 'Algebra and Calculus',
        experience: 8,
        dateOfJoining: new Date('2018-07-15'),
      },
    }),
    prisma.teacherProfile.create({
      data: {
        userId: teacher2User.id,
        employeeCode: 'EMP00002',
        qualification: 'M.Sc Computer Science',
        specialization: 'Programming and AI',
        experience: 5,
        dateOfJoining: new Date('2020-08-01'),
      },
    }),
  ]);

  console.log('Teacher profiles created');

  // ── Class ─────────────────────────────────────────────────────────────────────
  const class10A = await prisma.class.create({
    data: {
      name: 'Grade 10',
      section: 'A',
      gradeLevel: '10',
      academicYear: '2024-2025',
      teacherId: teacherProfile.id,
      capacity: 40,
      room: 'Room 101',
    },
  });

  const class10B = await prisma.class.create({
    data: {
      name: 'Grade 10',
      section: 'B',
      gradeLevel: '10',
      academicYear: '2024-2025',
      teacherId: teacherProfile2.id,
      capacity: 40,
      room: 'Room 102',
    },
  });

  console.log('Classes created');

  // ── Subject-Teacher Assignments ───────────────────────────────────────────────
  await Promise.all([
    prisma.subjectTeacher.create({ data: { classId: class10A.id, subjectId: mathSubject.id, teacherId: teacherProfile.id } }),
    prisma.subjectTeacher.create({ data: { classId: class10A.id, subjectId: scienceSubject.id, teacherId: teacherProfile.id } }),
    prisma.subjectTeacher.create({ data: { classId: class10A.id, subjectId: csSubject.id, teacherId: teacherProfile2.id } }),
    prisma.subjectTeacher.create({ data: { classId: class10B.id, subjectId: mathSubject.id, teacherId: teacherProfile.id } }),
    prisma.subjectTeacher.create({ data: { classId: class10B.id, subjectId: englishSubject.id, teacherId: teacherProfile2.id } }),
  ]);

  console.log('Subject-teacher assignments created');

  // ── Parent Profile ────────────────────────────────────────────────────────────
  const parentProfile = await prisma.parentProfile.create({
    data: {
      userId: parentUser.id,
      occupation: 'Software Engineer',
      relation: 'Father',
      emergencyContact: '+1-555-0199',
    },
  });

  // ── Student Profiles ──────────────────────────────────────────────────────────
  const [studentProfile, studentProfile2] = await Promise.all([
    prisma.studentProfile.create({
      data: {
        userId: studentUser.id,
        studentCode: 'STU00001',
        dateOfBirth: new Date('2009-03-15'),
        gender: 'MALE',
        address: '123 Main Street, Springfield',
        bloodGroup: 'O+',
        admissionDate: new Date('2022-07-01'),
        classId: class10A.id,
        parentIds: [parentProfile.id],
      },
    }),
    prisma.studentProfile.create({
      data: {
        userId: student2User.id,
        studentCode: 'STU00002',
        dateOfBirth: new Date('2009-06-22'),
        gender: 'FEMALE',
        address: '456 Oak Avenue, Springfield',
        bloodGroup: 'A+',
        admissionDate: new Date('2022-07-01'),
        classId: class10A.id,
        parentIds: [],
      },
    }),
  ]);

  console.log('Student profiles created');

  // ── Attendance Records ────────────────────────────────────────────────────────
  const attendanceDates = Array.from({ length: 20 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (20 - i));
    d.setUTCHours(0, 0, 0, 0);
    // Skip weekends
    if (d.getDay() === 0 || d.getDay() === 6) return null;
    return d;
  }).filter(Boolean) as Date[];

  const attendanceStatuses: AttendanceStatus[] = [
    AttendanceStatus.PRESENT, AttendanceStatus.PRESENT, AttendanceStatus.PRESENT,
    AttendanceStatus.PRESENT, AttendanceStatus.LATE, AttendanceStatus.PRESENT,
    AttendanceStatus.ABSENT, AttendanceStatus.PRESENT, AttendanceStatus.PRESENT,
    AttendanceStatus.PRESENT, AttendanceStatus.PRESENT, AttendanceStatus.PRESENT,
    AttendanceStatus.PRESENT, AttendanceStatus.EXCUSED, AttendanceStatus.PRESENT,
  ];

  for (let i = 0; i < Math.min(attendanceDates.length, attendanceStatuses.length); i++) {
    const date = attendanceDates[i];
    if (!date) continue;
    await prisma.attendance.create({
      data: {
        studentId: studentProfile.id,
        classId: class10A.id,
        subjectId: mathSubject.id,
        markedById: teacherProfile.id,
        date,
        status: attendanceStatuses[i],
        remarks: attendanceStatuses[i] === AttendanceStatus.ABSENT ? 'No prior notice' : undefined,
      },
    });
  }

  // Also add some for student2
  for (let i = 0; i < Math.min(attendanceDates.length - 2, 12); i++) {
    const date = attendanceDates[i];
    if (!date) continue;
    await prisma.attendance.create({
      data: {
        studentId: studentProfile2.id,
        classId: class10A.id,
        subjectId: mathSubject.id,
        markedById: teacherProfile.id,
        date,
        status: AttendanceStatus.PRESENT,
      },
    });
  }

  console.log('Attendance records created');

  // ── Assignments ───────────────────────────────────────────────────────────────
  const assignment1 = await prisma.assignment.create({
    data: {
      title: 'Quadratic Equations Problem Set',
      description: 'Solve the following 10 quadratic equations using factoring and the quadratic formula. Show all working steps.',
      classId: class10A.id,
      subjectId: mathSubject.id,
      teacherId: teacherProfile.id,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      maxMarks: 50,
      isPublished: true,
    },
  });

  const assignment2 = await prisma.assignment.create({
    data: {
      title: 'Essay: Industrial Revolution',
      description: 'Write a 1000-word essay analyzing the social and economic impacts of the Industrial Revolution on 19th century Europe.',
      classId: class10A.id,
      subjectId: englishSubject.id,
      teacherId: teacherProfile.id,
      dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago (overdue)
      maxMarks: 100,
      isPublished: true,
    },
  });

  // Student submission for assignment 2 (late)
  await prisma.assignmentSubmission.create({
    data: {
      assignmentId: assignment2.id,
      studentId: studentProfile.id,
      submittedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      content: 'The Industrial Revolution marked a turning point in human history...',
      status: 'GRADED',
      marks: 82,
      grade: 'A',
      feedback: 'Well-structured essay with good analysis. Could improve with more primary sources.',
      isLate: true,
      gradedAt: new Date(),
    },
  });

  // Student 2 submission (on time)
  await prisma.assignmentSubmission.create({
    data: {
      assignmentId: assignment2.id,
      studentId: studentProfile2.id,
      submittedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      content: 'The Industrial Revolution fundamentally transformed European society...',
      status: 'GRADED',
      marks: 91,
      grade: 'A_PLUS',
      feedback: 'Excellent essay with insightful analysis and strong arguments.',
      isLate: false,
      gradedAt: new Date(),
    },
  });

  console.log('Assignments and submissions created');

  // ── Results ───────────────────────────────────────────────────────────────────
  const resultData = [
    { subjectId: mathSubject.id, marksObtained: 88, maxMarks: 100 },
    { subjectId: scienceSubject.id, marksObtained: 76, maxMarks: 100 },
    { subjectId: englishSubject.id, marksObtained: 82, maxMarks: 100 },
    { subjectId: historySubject.id, marksObtained: 69, maxMarks: 100 },
    { subjectId: csSubject.id, marksObtained: 94, maxMarks: 100 },
  ];

  const gradeFor = (pct: number) => {
    if (pct >= 95) return 'A_PLUS';
    if (pct >= 85) return 'A';
    if (pct >= 75) return 'B_PLUS';
    if (pct >= 65) return 'B';
    if (pct >= 50) return 'C';
    if (pct >= 40) return 'D';
    return 'F';
  };
  const gpaFor = (pct: number) => {
    if (pct >= 95) return 4.0;
    if (pct >= 85) return 3.7;
    if (pct >= 75) return 3.3;
    if (pct >= 65) return 3.0;
    if (pct >= 55) return 2.7;
    if (pct >= 50) return 2.3;
    return 0.0;
  };

  for (const r of resultData) {
    const pct = (r.marksObtained / r.maxMarks) * 100;
    await prisma.result.create({
      data: {
        studentId: studentProfile.id,
        classId: class10A.id,
        subjectId: r.subjectId,
        examType: 'Mid-Term',
        academicYear: '2024-2025',
        term: 'Term 1',
        marksObtained: r.marksObtained,
        maxMarks: r.maxMarks,
        percentage: pct,
        grade: gradeFor(pct) as never,
        gpa: gpaFor(pct),
        isPublished: true,
        publishedAt: new Date(),
        remarks: 'Good performance',
      },
    });
  }

  // Results for student 2
  const resultData2 = [
    { subjectId: mathSubject.id, marksObtained: 95, maxMarks: 100 },
    { subjectId: scienceSubject.id, marksObtained: 92, maxMarks: 100 },
    { subjectId: englishSubject.id, marksObtained: 97, maxMarks: 100 },
  ];

  for (const r of resultData2) {
    const pct = (r.marksObtained / r.maxMarks) * 100;
    await prisma.result.create({
      data: {
        studentId: studentProfile2.id,
        classId: class10A.id,
        subjectId: r.subjectId,
        examType: 'Mid-Term',
        academicYear: '2024-2025',
        term: 'Term 1',
        marksObtained: r.marksObtained,
        maxMarks: r.maxMarks,
        percentage: pct,
        grade: gradeFor(pct) as never,
        gpa: gpaFor(pct),
        isPublished: true,
        publishedAt: new Date(),
      },
    });
  }

  console.log('Results created');

  // ── Fees ──────────────────────────────────────────────────────────────────────
  const tuitionFee = await prisma.fee.create({
    data: {
      studentId: studentProfile.id,
      classId: class10A.id,
      title: 'Tuition Fee - Term 1',
      description: 'Academic term tuition fee for 2024-2025',
      amount: 25000,
      paidAmount: 25000,
      dueDate: new Date('2024-08-31'),
      status: FeeStatus.PAID,
      academicYear: '2024-2025',
      term: 'Term 1',
    },
  });

  await prisma.payment.create({
    data: {
      feeId: tuitionFee.id,
      amount: 25000,
      paymentMethod: 'Bank Transfer',
      transactionId: 'TXN-2024-001',
      remarks: 'Full payment received',
      paidAt: new Date('2024-08-15'),
    },
  });

  const pendingFee = await prisma.fee.create({
    data: {
      studentId: studentProfile.id,
      classId: class10A.id,
      title: 'Tuition Fee - Term 2',
      description: 'Academic term tuition fee for 2024-2025',
      amount: 25000,
      paidAmount: 0,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: FeeStatus.PENDING,
      academicYear: '2024-2025',
      term: 'Term 2',
    },
  });

  await prisma.fee.create({
    data: {
      studentId: studentProfile.id,
      classId: class10A.id,
      title: 'Lab Fee',
      description: 'Annual laboratory usage fee',
      amount: 5000,
      paidAmount: 2500,
      dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      status: FeeStatus.OVERDUE,
      academicYear: '2024-2025',
      term: 'Term 1',
    },
  });

  console.log('Fees created');

  // ── Timetable ─────────────────────────────────────────────────────────────────
  const timetable = await prisma.timetable.create({
    data: {
      name: 'Grade 10-A Weekly Schedule',
      classId: class10A.id,
      academicYear: '2024-2025',
      isActive: true,
    },
  });

  const slotData = [
    { dayOfWeek: 0, startTime: '08:00', endTime: '09:00', subjectId: mathSubject.id, teacherId: teacherProfile.id, room: 'Room 101' },
    { dayOfWeek: 0, startTime: '09:00', endTime: '10:00', subjectId: scienceSubject.id, teacherId: teacherProfile.id, room: 'Lab 1' },
    { dayOfWeek: 0, startTime: '10:30', endTime: '11:30', subjectId: englishSubject.id, teacherId: teacherProfile2.id, room: 'Room 101' },
    { dayOfWeek: 1, startTime: '08:00', endTime: '09:00', subjectId: csSubject.id, teacherId: teacherProfile2.id, room: 'Computer Lab' },
    { dayOfWeek: 1, startTime: '09:00', endTime: '10:00', subjectId: mathSubject.id, teacherId: teacherProfile.id, room: 'Room 101' },
    { dayOfWeek: 2, startTime: '08:00', endTime: '09:00', subjectId: historySubject.id, teacherId: teacherProfile.id, room: 'Room 101' },
    { dayOfWeek: 2, startTime: '09:00', endTime: '10:00', subjectId: scienceSubject.id, teacherId: teacherProfile.id, room: 'Lab 1' },
    { dayOfWeek: 3, startTime: '08:00', endTime: '09:00', subjectId: mathSubject.id, teacherId: teacherProfile.id, room: 'Room 101' },
    { dayOfWeek: 3, startTime: '10:30', endTime: '11:30', subjectId: csSubject.id, teacherId: teacherProfile2.id, room: 'Computer Lab' },
    { dayOfWeek: 4, startTime: '08:00', endTime: '09:00', subjectId: englishSubject.id, teacherId: teacherProfile2.id, room: 'Room 101' },
    { dayOfWeek: 4, startTime: '09:00', endTime: '10:00', subjectId: mathSubject.id, teacherId: teacherProfile.id, room: 'Room 101' },
  ];

  for (const slot of slotData) {
    await prisma.timetableSlot.create({
      data: { timetableId: timetable.id, classId: class10A.id, ...slot },
    });
  }

  console.log('✅ Timetable created');

  // ── Announcements ─────────────────────────────────────────────────────────────
  await Promise.all([
    prisma.announcement.create({
      data: {
        title: 'Welcome Back to School!',
        content: 'Dear students, teachers, and parents — welcome to the 2024-2025 academic year at EduManage School. We look forward to an excellent year of learning and growth.',
        authorId: adminUser.id,
        target: AnnouncementTarget.ALL,
        isActive: true,
      },
    }),
    prisma.announcement.create({
      data: {
        title: 'Mid-Term Examination Schedule',
        content: 'Mid-term examinations will be held from November 15-22, 2024. Please refer to the detailed timetable available in the student portal. Best of luck to all students!',
        authorId: adminUser.id,
        target: AnnouncementTarget.STUDENTS,
        isActive: true,
        expiresAt: new Date('2024-11-25'),
      },
    }),
    prisma.announcement.create({
      data: {
        title: 'Grade 10-A: Mathematics Project Due',
        content: 'Reminder: The Quadratic Equations Problem Set is due next Friday. Please ensure all work is submitted on time. Late submissions will be penalized.',
        authorId: teacherUser.id,
        target: AnnouncementTarget.CLASS,
        classId: class10A.id,
        isActive: true,
      },
    }),
    prisma.announcement.create({
      data: {
        title: 'Staff Meeting - Thursday',
        content: 'All teaching staff are reminded of the mandatory staff meeting this Thursday at 3:30 PM in the conference room. Agenda: Q1 academic review and Q2 planning.',
        authorId: adminUser.id,
        target: AnnouncementTarget.TEACHERS,
        isActive: true,
      },
    }),
    prisma.announcement.create({
      data: {
        title: 'Parent-Teacher Conference',
        content: 'We are pleased to invite all parents to the Parent-Teacher Conference on December 5, 2024 from 10 AM to 4 PM. Please book your slot through the portal.',
        authorId: adminUser.id,
        target: AnnouncementTarget.PARENTS,
        isActive: true,
      },
    }),
  ]);

  console.log('✅ Announcements created');

  // ── Notifications ─────────────────────────────────────────────────────────────
  await Promise.all([
    prisma.notification.create({
      data: {
        userId: studentUser.id,
        type: 'ASSIGNMENT_CREATED',
        title: 'New Assignment: Quadratic Equations',
        message: '"Quadratic Equations Problem Set" has been assigned. Due in 7 days.',
        isRead: false,
        metadata: { assignmentId: assignment1.id },
      },
    }),
    prisma.notification.create({
      data: {
        userId: studentUser.id,
        type: 'ASSIGNMENT_GRADED',
        title: 'Assignment Graded',
        message: 'Your essay "Industrial Revolution" has been graded: 82/100 (A)',
        isRead: true,
        readAt: new Date(),
        metadata: { marks: 82, maxMarks: 100, grade: 'A' },
      },
    }),
    prisma.notification.create({
      data: {
        userId: studentUser.id,
        type: 'RESULT_PUBLISHED',
        title: 'Mid-Term Results Available',
        message: 'Your Mid-Term results for Term 1, 2024-2025 are now available.',
        isRead: false,
      },
    }),
    prisma.notification.create({
      data: {
        userId: parentUser.id,
        type: 'FEE_DUE',
        title: 'Fee Due Reminder',
        message: 'Tuition Fee - Term 2: ₹25,000 is due in 30 days.',
        isRead: false,
        metadata: { amount: 25000 },
      },
    }),
  ]);

  console.log('✅ Notifications created');

  // ── Audit Logs ─────────────────────────────────────────────────────────────────
  await Promise.all([
    prisma.auditLog.create({
      data: {
        actorId: adminUser.id,
        action: AuditAction.USER_CREATED,
        entity: 'User',
        entityId: teacherUser.id,
        metadata: { role: 'TEACHER', email: 'teacher@edumanage.com' },
        ipAddress: '127.0.0.1',
        userAgent: 'Seed Script',
      },
    }),
    prisma.auditLog.create({
      data: {
        actorId: teacherUser.id,
        action: AuditAction.ATTENDANCE_MARKED,
        entity: 'Attendance',
        metadata: { classId: class10A.id, count: 2 },
        ipAddress: '127.0.0.1',
        userAgent: 'Seed Script',
      },
    }),
    prisma.auditLog.create({
      data: {
        actorId: teacherUser.id,
        action: AuditAction.ASSIGNMENT_CREATED,
        entity: 'Assignment',
        entityId: assignment1.id,
        metadata: { title: assignment1.title },
        ipAddress: '127.0.0.1',
        userAgent: 'Seed Script',
      },
    }),
    prisma.auditLog.create({
      data: {
        actorId: teacherUser.id,
        action: AuditAction.RESULT_PUBLISHED,
        entity: 'Result',
        metadata: { count: 5, term: 'Term 1', examType: 'Mid-Term' },
        ipAddress: '127.0.0.1',
        userAgent: 'Seed Script',
      },
    }),
  ]);

  console.log(' Audit logs created');

  // ── Summary ───────────────────────────────────────────────────────────────────
  console.log(`
╔══════════════════════════════════════════════════╗
║           Seed Complete!                       ║
╠══════════════════════════════════════════════════╣
║  Demo Accounts:                                  ║
║                                                  ║
║  Admin   : admin@edumanage.com   / Admin@123     ║
║  Teacher : teacher@edumanage.com / Teacher@123   ║
║  Teacher2: teacher2@edumanage.com/ Teacher@123   ║
║  Student : student@edumanage.com / Student@123   ║
║  Student2: student2@edumanage.com/ Student@123   ║
║  Parent  : parent@edumanage.com  / Parent@123    ║
╠══════════════════════════════════════════════════╣
║  Data Created:                                   ║
║  - 6 users across all roles                      ║
║  - 2 classes, 5 subjects                         ║
║  - 2 teacher profiles, 2 student profiles        ║
║  - 1 parent profile (linked to student)          ║
║  - ~15 attendance records                        ║
║  - 2 assignments with submissions                ║
║  - 8 published results                           ║
║  - 3 fee records (paid/pending/overdue)          ║
║  - Weekly timetable with 11 slots                ║
║  - 5 announcements                               ║
║  - 4 notifications                               ║
║  - 4 audit log entries                           ║
╚══════════════════════════════════════════════════╝
  `);
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
