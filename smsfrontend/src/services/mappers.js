/**
 * Data mapping and normalization utilities for API entities.
 * Decouples backend API responses from UI component schemas.
 */

export function fullName(user) {
  return [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || 'Unassigned';
}

export function normalizeUser(user) {
  if (!user) return null;

  const name = user.name || [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;

  return {
    ...user,
    name,
    role: user.role || 'STUDENT',
    permissions: Array.isArray(user.permissions) ? user.permissions : [],
    isSuperAdmin: Boolean(user.isSuperAdmin),
  };
}

export function createEmptyAppData() {
  return {
    adminStats: {
      totalStudents: 0,
      totalTeachers: 0,
      totalParents: 0,
      totalClasses: 0,
      attendanceRate: 0,
      feeCollectionRate: 0,
      activeAssignments: 0,
      atRiskStudents: 0,
    },
    students: [],
    teachers: [],
    classes: [],
    attendance: { today: [], monthly: {} },
    assignments: [],
    results: [],
    fees: [],
    timetable: {},
    announcements: [],
    analyticsData: {
      enrollment: [],
      attendance: [],
      feeCollection: [],
      labels: [],
    },
    generatedInsights: [],
    notifications: [],
    roleNotifications: [],
    auditLogs: [],
    dashboardAnalytics: null,
    teacherDashboard: null,
    parentDashboard: null,
    studentDashboard: null,
  };
}

export function mapStudent(student) {
  const className = student.class
    ? `${student.class.name}${student.class.section ? ` ${student.class.section}` : ''}`
    : 'Unassigned';

  return {
    id: student.studentCode || student.id,
    backendId: student.id,
    name: fullName(student.user),
    className,
    rollNo: student.rollNo || student.studentCode || student.id.slice(0, 6),
    attendance: Math.round(student.attendancePercentage || 0),
    grade: student.grade || student.riskLevel || 'N/A',
    parent: student.parentName || 'Not linked',
    risk: String(student.riskLevel || 'low').toLowerCase(),
    fees: String(student.feeStatus || 'pending').toLowerCase(),
    contact: student.phone || student.user?.phone || student.contact || 'Not available',
    address: student.address || student.user?.address || 'Address not available',
    avatarUrl: student.user?.avatarUrl,
    academicYear: student.class?.academicYear,
    dateOfBirth: student.dateOfBirth,
    bloodGroup: student.bloodGroup,
    classTeacher: student.class?.teacher?.user ? fullName(student.class.teacher.user) : 'Not assigned',
  };
}

export function mapFee(fee) {
  return {
    id: fee.id,
    source: 'legacy',
    student: fullName(fee.student?.user),
    studentId: fee.studentId,
    className: fee.class ? `${fee.class.name}${fee.class.section ? ` ${fee.class.section}` : ''}` : 'Unassigned',
    term: fee.term || fee.title,
    title: fee.title,
    amount: Number(fee.amount || 0),
    paid: Number(fee.paidAmount || 0),
    status: String(fee.status || 'pending').toLowerCase(),
    dueDate: String(fee.dueDate || '').slice(0, 10),
    paidDate: fee.payments?.[0]?.paidAt ? String(fee.payments[0].paidAt).slice(0, 10) : null,
  };
}

export function mapInvoiceFee(invoice, student) {
  const feeItems = Array.isArray(invoice.feeItems) ? invoice.feeItems : [];
  const title = feeItems.map((item) => item?.name).filter(Boolean).join(', ') || invoice.invoiceNumber || 'Fee invoice';
  const className = student?.class
    ? `${student.class.name}${student.class.section ? ` ${student.class.section}` : ''}`
    : 'Unassigned';

  return {
    id: invoice.id,
    source: 'invoice',
    student: student?.user ? fullName(student.user) : 'Student',
    studentId: invoice.studentId,
    className,
    term: title,
    title,
    amount: Number(invoice.payableAmount || 0),
    paid: Number(invoice.paidAmount || 0),
    status: String(invoice.status || 'UNPAID').toLowerCase(),
    dueDate: String(invoice.dueDate || '').slice(0, 10),
    paidDate: invoice.status === 'PAID' ? String(invoice.updatedAt || invoice.createdAt || '').slice(0, 10) : null,
  };
}

export function mapTeacher(teacher) {
  const classes = teacher.classes?.map((item) => `${item.name}${item.section ? ` ${item.section}` : ''}`) || [];
  const subject = teacher.subjectTeachers?.[0]?.subject?.name || teacher.specialization || 'General Faculty';
  const workload = Math.min(100, Math.max(20, classes.length * 22 || 42));

  return {
    id: teacher.employeeCode || teacher.id,
    name: fullName(teacher.user),
    subject,
    status: String(teacher.user?.status || 'active').toLowerCase(),
    experience: `${teacher.experience || 0} yrs`,
    classes,
    workload,
  };
}

export function mapClass(item) {
  const mentor = item.teacher?.user ? fullName(item.teacher.user) : 'Unassigned';
  const students = item._count?.students || 0;
  const capacity = item.capacity || 40;

  return {
    id: item.id,
    name: item.gradeLevel || item.name,
    section: item.section,
    mentor,
    students,
    subjects: item._count?.subjects || 0,
    room: item.room || 'Room TBD',
    academicYear: item.academicYear,
    health: Math.round(Math.min(100, Math.max(55, (students / capacity) * 100))),
    isClassTeacher: Boolean(item.isClassTeacher),
  };
}

export function mapAnnouncement(item) {
  return {
    id: item.id,
    title: item.title,
    content: item.content,
    audience: item.target === 'CLASS'
      ? `Class ${item.class?.name || ''}${item.class?.section ? ` ${item.class.section}` : ''}`.trim()
      : String(item.target || 'ALL').toLowerCase().replace(/^\w/, (character) => character.toUpperCase()),
    author: item.author ? fullName(item.author) : 'School Administration',
    date: String(item.createdAt || new Date().toISOString()).slice(0, 10),
  };
}

export function mapAssignment(assignment) {
  return {
    id: assignment.id,
    title: assignment.title,
    subject: assignment.subject?.name || 'Subject',
    subjectId: assignment.subjectId,
    className: assignment.class ? `${assignment.class.name}${assignment.class.section ? ` ${assignment.class.section}` : ''}` : 'Unassigned',
    classId: assignment.classId,
    dueDate: String(assignment.dueDate || '').slice(0, 10),
    submitted: assignment._count?.submissions || assignment.submitted || 0,
    total: assignment.class?._count?.students || assignment.total || 1,
    status: assignment.isPublished ? 'active' : 'draft',
    isPublished: Boolean(assignment.isPublished),
    maxMarks: assignment.maxMarks,
    description: assignment.description,
    teacher: assignment.teacher?.user ? fullName(assignment.teacher.user) : 'Teacher',
    submissionStatus: assignment.submissions?.[0]?.status || 'PENDING',
    feedback: assignment.submissions?.[0]?.feedback || '',
  };
}

export function mapTeacherTimetable(slots = []) {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  return slots.reduce((schedule, slot) => {
    const day = days[slot.dayOfWeek] || 'Monday';
    const period = {
      id: slot.id,
      timetableId: slot.timetableId,
      classId: slot.classId,
      subjectId: slot.subjectId,
      dayOfWeek: slot.dayOfWeek,
      time: `${slot.startTime}-${slot.endTime}`,
      subject: slot.subject?.name || 'Subject',
      teacher: slot.class ? `Class ${slot.class.name}${slot.class.section ? ` ${slot.class.section}` : ''}` : 'Assigned class',
      room: slot.room || 'Room TBD',
    };
    return { ...schedule, [day]: [...(schedule[day] || []), period] };
  }, {});
}

export function mapTeacherResult(result) {
  return {
    id: result.id,
    student: fullName(result.student?.user),
    studentCode: result.student?.studentCode,
    className: result.class ? `${result.class.name}${result.class.section ? ` ${result.class.section}` : ''}` : 'Unassigned',
    subject: result.subject?.name || 'Subject',
    examType: result.examType,
    term: result.term,
    academicYear: result.academicYear,
    marks: result.marksObtained,
    maxMarks: result.maxMarks,
    status: String(result.status || (result.isPublished ? 'LOCKED' : 'DRAFT')).toLowerCase(),
  };
}

export function mapNotification(item) {
  return {
    id: item.id,
    type: String(item.type || 'general').toLowerCase(),
    title: item.title,
    message: item.message,
    time: String(item.createdAt || '').slice(0, 16).replace('T', ' '),
    read: Boolean(item.isRead),
  };
}

export function mapAuditLog(item) {
  return {
    id: item.id,
    time: String(item.createdAt || '').slice(0, 16).replace('T', ' '),
    actor: item.actor ? fullName(item.actor) : 'System',
    module: item.entity || 'System',
    action: String(item.action || 'UPDATE').replaceAll('_', ' '),
    severity: ['USER_DELETED', 'REFUND_PROCESSED', 'ROLE_CHANGED'].includes(item.action) ? 'high' : 'info',
  };
}

export function mapParentAttendance(record, child) {
  return {
    id: record.id,
    student: fullName(child?.user),
    studentId: record.studentId || child?.id,
    className: record.class ? `${record.class.name}${record.class.section ? ` ${record.class.section}` : ''}` : 'Unassigned',
    subject: record.subject?.name || 'Daily attendance',
    status: String(record.status || 'PRESENT').toLowerCase(),
    date: String(record.date || '').slice(0, 10),
    time: String(record.date || '').slice(11, 16),
    remarks: record.remarks || '',
  };
}

export function mapParentResult(result, child) {
  return {
    id: result.id,
    student: fullName(child?.user),
    studentId: result.studentId,
    className: result.class ? `${result.class.name}${result.class.section ? ` ${result.class.section}` : ''}` : 'Unassigned',
    subject: result.subject?.name || 'Subject',
    examType: result.examType,
    term: result.term,
    academicYear: result.academicYear,
    marks: result.marksObtained,
    maxMarks: result.maxMarks,
    percentage: result.percentage,
    total: `${result.marksObtained}/${result.maxMarks}`,
    grade: String(result.grade || 'N/A').replace('_PLUS', '+'),
    remarks: result.remarks || '',
  };
}

export function mapParentTimetable(slots = []) {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  return slots.reduce((schedule, slot) => {
    const day = days[slot.dayOfWeek] || 'Monday';
    const period = {
      id: slot.id,
      timetableId: slot.timetableId,
      classId: slot.classId,
      subjectId: slot.subjectId,
      dayOfWeek: slot.dayOfWeek,
      time: `${slot.startTime}-${slot.endTime}`,
      subject: slot.subject?.name || 'Subject',
      teacher: slot.teacher?.user ? fullName(slot.teacher.user) : 'Teacher',
      room: slot.room || 'Room TBD',
    };
    return { ...schedule, [day]: [...(schedule[day] || []), period] };
  }, {});
}
