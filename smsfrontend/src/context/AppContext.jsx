import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, authApi, getAccessToken, setAccessToken } from '../services/api.js';
import { hasPermission } from '../utils/permissions.js';

const AppContext = createContext(null);
const USER_KEY = 'sms-user';
const THEME_KEY = 'sms-theme';
const DATA_REFRESH_INTERVAL_MS = 5 * 60 * 1000;
let sessionRestoreRequest = null;
const dataLoadRequests = new Map();

function createEmptyAppData() {
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

function normalizeUser(user) {
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

function readStoredUser() {
  try {
    const saved = localStorage.getItem(USER_KEY);
    return saved ? normalizeUser(JSON.parse(saved)) : null;
  } catch {
    localStorage.removeItem(USER_KEY);
    return null;
  }
}

function fullName(user) {
  return [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || 'Unassigned';
}

function mapStudent(student) {
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

function mapFee(fee) {
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

function mapInvoiceFee(invoice, student) {
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

function mapTeacher(teacher) {
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

function mapClass(item) {
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

function mapAnnouncement(item) {
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

function mapAssignment(assignment) {
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

function mapTeacherTimetable(slots = []) {
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

function mapTeacherResult(result) {
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

function mapNotification(item) {
  return {
    id: item.id,
    type: String(item.type || 'general').toLowerCase(),
    title: item.title,
    message: item.message,
    time: String(item.createdAt || '').slice(0, 16).replace('T', ' '),
    read: Boolean(item.isRead),
  };
}

function mapAuditLog(item) {
  return {
    id: item.id,
    time: String(item.createdAt || '').slice(0, 16).replace('T', ' '),
    actor: item.actor ? fullName(item.actor) : 'System',
    module: item.entity || 'System',
    action: String(item.action || 'UPDATE').replaceAll('_', ' '),
    severity: ['USER_DELETED', 'REFUND_PROCESSED', 'ROLE_CHANGED'].includes(item.action) ? 'high' : 'info',
  };
}

function mapParentAttendance(record, child) {
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

function mapParentResult(result, child) {
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

function mapParentTimetable(slots = []) {
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

async function fetchBackendData(role, selectedChildId, currentUser, bypassCache = false) {
  const nextData = {};
  const requests = [];
  const reqOptions = bypassCache ? { bypassCache: true } : {};

  if (role === 'TEACHER') {
    requests.push(
      api.get('/teachers/me/dashboard', reqOptions).then((response) => {
        const dashboard = response.data;
        if (!dashboard) return;
        nextData.teacherDashboard = dashboard;
        nextData.dashboardAnalytics = dashboard;
        nextData.students = Array.isArray(dashboard.students) ? dashboard.students.map(mapStudent) : [];
        nextData.classes = Array.isArray(dashboard.assignedClasses)
          ? dashboard.assignedClasses.map((item) => mapClass({
            ...item,
            teacher: { user: dashboard.profile?.user },
            _count: {
              students: dashboard.students?.filter((student) => student.classId === item.id).length || 0,
              subjects: dashboard.assignedSubjects?.filter((subject) => subject.class?.id === item.id).length || 0,
            },
          }))
          : [];
        nextData.assignments = Array.isArray(dashboard.recentAssignments) ? dashboard.recentAssignments.map(mapAssignment) : [];
        nextData.announcements = Array.isArray(dashboard.notices) ? dashboard.notices.map(mapAnnouncement) : [];
        nextData.attendance = { today: [], monthly: dashboard.attendance || {} };
      })
    );
    requests.push(
      api.get('/assignments?limit=100', reqOptions).then((response) => {
        const rows = response.data?.data || response.data;
        if (Array.isArray(rows)) nextData.assignments = rows.map(mapAssignment);
      })
    );
    requests.push(
      api.get('/timetable/my-schedule', reqOptions).then((response) => {
        const rows = response.data?.data || response.data;
        if (Array.isArray(rows)) nextData.timetable = mapTeacherTimetable(rows);
      })
    );
    requests.push(
      api.get('/results/teacher/marks/history?limit=100', reqOptions).then((response) => {
        const rows = response.data?.data || response.data;
        if (Array.isArray(rows)) nextData.results = rows.map(mapTeacherResult);
      })
    );
    requests.push(
      api.get('/notifications?limit=100', reqOptions).then((response) => {
        const rows = response.data?.data || response.data;
        if (Array.isArray(rows)) nextData.roleNotifications = rows.map(mapNotification);
      })
    );
  }

  if (role === 'ADMIN') {
    requests.push(
      api.get('/notifications?limit=100', reqOptions).then((response) => {
        const rows = response.data?.data || response.data;
        if (Array.isArray(rows)) nextData.roleNotifications = rows.map(mapNotification);
      })
    );

    if (hasPermission(currentUser, 'students:view')) requests.push(
      api.get('/students?limit=100', reqOptions).then((response) => {
        const rows = response.data?.data || response.data;
        if (Array.isArray(rows)) nextData.students = rows.map(mapStudent);
      })
    );

    if (hasPermission(currentUser, 'teachers:view')) requests.push(
      api.get('/teachers?limit=100', reqOptions).then((response) => {
        const rows = response.data?.data || response.data;
        if (Array.isArray(rows)) nextData.teachers = rows.map(mapTeacher);
      })
    );
  }

  if (role === 'PARENT') {
    const query = selectedChildId ? `?studentId=${encodeURIComponent(selectedChildId)}` : '';
    requests.push(
      api.get(`/parents/me/dashboard${query}`, reqOptions).then((response) => {
        const dashboard = response.data;
        if (!dashboard) return;
        nextData.parentDashboard = dashboard;
        nextData.students = Array.isArray(dashboard.children) ? dashboard.children.map(mapStudent) : [];
        nextData.classes = dashboard.selectedChild?.class ? [mapClass(dashboard.selectedChild.class)] : [];
        nextData.attendance = {
          today: Array.isArray(dashboard.attendance?.records)
            ? dashboard.attendance.records.map((record) => mapParentAttendance(record, dashboard.selectedChild))
            : [],
          monthly: dashboard.attendance?.summary || {},
        };
        nextData.fees = Array.isArray(dashboard.fees?.invoices) && dashboard.fees.invoices.length
          ? dashboard.fees.invoices.map((invoice) => mapInvoiceFee(invoice, dashboard.selectedChild))
          : Array.isArray(dashboard.fees?.legacy) ? dashboard.fees.legacy.map(mapFee) : [];
        nextData.assignments = Array.isArray(dashboard.assignments)
          ? dashboard.assignments.map((assignment) => mapAssignment({
            ...assignment,
            submitted: assignment.submissions?.length ? 1 : 0,
            total: 1,
          }))
          : [];
        nextData.results = Array.isArray(dashboard.results)
          ? dashboard.results.map((result) => mapParentResult(result, dashboard.selectedChild))
          : [];
        nextData.timetable = mapParentTimetable(dashboard.timetable || []);
        nextData.announcements = Array.isArray(dashboard.notices) ? dashboard.notices.map(mapAnnouncement) : [];
        nextData.roleNotifications = Array.isArray(dashboard.notifications) ? dashboard.notifications.map(mapNotification) : [];
      })
    );
  }

  if (role === 'STUDENT') {
    requests.push(
      api.get('/students/me/dashboard', reqOptions).then((response) => {
        const dashboard = response.data;
        if (!dashboard) return;
        const profile = dashboard.profile;
        nextData.studentDashboard = dashboard;
        nextData.students = profile
          ? [mapStudent({ ...profile, attendancePercentage: dashboard.attendance?.summary?.percentage || 0 })]
          : [];
        nextData.classes = profile?.class ? [mapClass(profile.class)] : [];
        nextData.attendance = {
          today: Array.isArray(dashboard.attendance?.records)
            ? dashboard.attendance.records.map((record) => mapParentAttendance(record, profile))
            : [],
          monthly: dashboard.attendance?.summary || {},
        };
        nextData.fees = Array.isArray(dashboard.fees?.invoices) && dashboard.fees.invoices.length
          ? dashboard.fees.invoices.map((invoice) => mapInvoiceFee(invoice, profile))
          : Array.isArray(dashboard.fees?.legacy) ? dashboard.fees.legacy.map(mapFee) : [];
        nextData.assignments = Array.isArray(dashboard.assignments)
          ? dashboard.assignments.map((assignment) => mapAssignment({
            ...assignment,
            submitted: assignment.submissions?.length ? 1 : 0,
            total: 1,
          }))
          : [];
        nextData.results = Array.isArray(dashboard.results)
          ? dashboard.results.map((result) => mapParentResult(result, profile))
          : [];
        nextData.timetable = mapParentTimetable(dashboard.timetable || []);
        nextData.announcements = Array.isArray(dashboard.notices) ? dashboard.notices.map(mapAnnouncement) : [];
        nextData.roleNotifications = Array.isArray(dashboard.notifications) ? dashboard.notifications.map(mapNotification) : [];
      })
    );
  }

  if (role === 'ADMIN') {
    if (hasPermission(currentUser, 'dashboard:view')) requests.push(
      api.get('/analytics/dashboard', reqOptions).then((response) => {
        if (response.data) nextData.dashboardAnalytics = response.data;
      })
    );

    if (hasPermission(currentUser, 'classes:manage')) requests.push(
      api.get('/classes?limit=100', reqOptions).then((response) => {
        const rows = response.data?.data || response.data;
        if (Array.isArray(rows)) nextData.classes = rows.map(mapClass);
      })
    );

    if (hasPermission(currentUser, 'notices:manage')) requests.push(
      api.get('/announcements?limit=100', reqOptions).then((response) => {
        const rows = response.data?.data || response.data;
        if (Array.isArray(rows)) nextData.announcements = rows.map(mapAnnouncement);
      })
    );

    if (hasPermission(currentUser, 'fees:view')) requests.push(
      Promise.all([
        api.get('/fees/invoices?limit=100', reqOptions).catch(() => ({ data: [] })),
        api.get('/fees?limit=100', reqOptions).catch(() => ({ data: [] })),
      ]).then(([invoicesRes, feesRes]) => {
        const invoiceRows = invoicesRes.data?.data || invoicesRes.data || [];
        const legacyRows = feesRes.data?.data || feesRes.data || [];
        const mappedInvoices = Array.isArray(invoiceRows) ? invoiceRows.map((inv) => mapInvoiceFee(inv, inv.student)) : [];
        const mappedLegacy = Array.isArray(legacyRows) ? legacyRows.map(mapFee) : [];
        nextData.fees = mappedInvoices.length > 0 ? mappedInvoices : mappedLegacy;
      })
    );

    if (hasPermission(currentUser, 'audit:view')) requests.push(
      api.get('/audit-logs?limit=100', reqOptions).then((response) => {
        const rows = response.data?.data || response.data;
        if (Array.isArray(rows)) nextData.auditLogs = rows.map(mapAuditLog);
      })
    );
  }

  const results = await Promise.allSettled(requests);
  return {
    data: nextData,
    failedRequests: results.filter((result) => result.status === 'rejected').length,
  };
}

function loadBackendData(role, selectedChildId, currentUser, bypassCache = false) {
  const key = `${currentUser?.id || 'anonymous'}:${role}:${selectedChildId || ''}`;
  const existing = dataLoadRequests.get(key);
  if (existing && !bypassCache) return existing;

  const request = fetchBackendData(role, selectedChildId, currentUser, bypassCache).finally(() => {
    if (dataLoadRequests.get(key) === request) dataLoadRequests.delete(key);
  });
  dataLoadRequests.set(key, request);
  return request;
}

function restoreBackendSession() {
  if (sessionRestoreRequest) return sessionRestoreRequest;

  sessionRestoreRequest = (async () => {
    if (!getAccessToken()) await authApi.refresh();
    return authApi.me();
  })().finally(() => {
    sessionRestoreRequest = null;
  });

  return sessionRestoreRequest;
}

export function AppProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(readStoredUser);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [appData, setAppData] = useState(createEmptyAppData);
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) || 'light');
  const [isAuthLoading, setIsAuthLoading] = useState(() => Boolean(readStoredUser()));
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [dataError, setDataError] = useState('');
  const [dataRefreshKey, setDataRefreshKey] = useState(0);
  const [authError, setAuthError] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const currentRole = currentUser?.role || null;

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const storeSession = useCallback((user, accessToken) => {
    const normalized = normalizeUser(user);
    setCurrentUser(normalized);
    setAuthError('');

    if (accessToken) setAccessToken(accessToken);
    if (normalized) localStorage.setItem(USER_KEY, JSON.stringify(normalized));
    else localStorage.removeItem(USER_KEY);
  }, []);

  const clearSession = useCallback(() => {
    setCurrentUser(null);
    setAccessToken(null);
    setDataError('');
    setSelectedChildId('');
    setNotifications([]);
    setAppData(createEmptyAppData());
    api.invalidate();
    localStorage.removeItem(USER_KEY);
  }, []);

  useEffect(() => {
    const handleExpiredSession = () => {
      clearSession();
      setAuthError('Your session expired. Please sign in again.');
    };
    window.addEventListener('sms:session-expired', handleExpiredSession);
    return () => window.removeEventListener('sms:session-expired', handleExpiredSession);
  }, [clearSession]);

  useEffect(() => {
    let active = true;

    async function restoreSession() {
      if (!getAccessToken() && !readStoredUser()) {
        setIsAuthLoading(false);
        return;
      }

      try {
        const response = await restoreBackendSession();
        if (active) storeSession(response.data);
      } catch {
        if (active && !getAccessToken()) clearSession();
      } finally {
        if (active) setIsAuthLoading(false);
      }
    }

    restoreSession();
    return () => {
      active = false;
    };
  }, [clearSession, storeSession]);

  useEffect(() => {
    let active = true;
    let refreshTimer;

    async function hydrateData({ showLoading = true, bypassCache = false } = {}) {
      if (isAuthLoading) return;

      if (!currentRole || !getAccessToken()) {
        setAppData(createEmptyAppData());
        return;
      }

      // Check if we already have non-empty data in memory
      setAppData((existing) => {
        const hasExisting = Boolean(
          existing.dashboardAnalytics ||
          existing.teacherDashboard ||
          existing.studentDashboard ||
          existing.parentDashboard ||
          existing.students?.length > 0
        );
        if (showLoading && !hasExisting) {
          setIsDataLoading(true);
        }
        return existing;
      });

      const result = await loadBackendData(currentRole, selectedChildId, currentUser, bypassCache);

      if (active) {
        setAppData((existing) => ({
          ...existing,
          ...result.data,
        }));
        if (currentRole === 'PARENT' && !selectedChildId && result.data.parentDashboard?.selectedChild?.id) {
          setSelectedChildId(result.data.parentDashboard.selectedChild.id);
        }
        if (result.data.roleNotifications) {
          setNotifications(result.data.roleNotifications);
        }
        setDataError(result.failedRequests
          ? `Some live school data could not be loaded (${result.failedRequests} request${result.failedRequests === 1 ? '' : 's'} failed).`
          : '');
        setIsDataLoading(false);
      }
    }

    hydrateData({ bypassCache: dataRefreshKey > 0 });
    if (currentRole && getAccessToken()) {
      refreshTimer = window.setInterval(() => hydrateData({ showLoading: false }), DATA_REFRESH_INTERVAL_MS);
    }
    return () => {
      active = false;
      if (refreshTimer) window.clearInterval(refreshTimer);
    };
  }, [currentRole, currentUser, selectedChildId, dataRefreshKey, isAuthLoading]);

  useEffect(() => {
    if (!currentUser?.id || !getAccessToken()) return undefined;

    let active = true;
    let disconnect = null;

    import('../services/socket.js').then(({ connectNotificationSocket }) => {
      if (!active || !getAccessToken()) return;
      disconnect = connectNotificationSocket({
        onNotification: (item) => {
          const notification = mapNotification(item);
          setNotifications((existing) => {
            if (existing.some((entry) => entry.id === notification.id)) return existing;
            return [notification, ...existing].slice(0, 100);
          });
        },
      });
    }).catch(() => {
      // Notification sockets are progressive enhancement; polling/live data still works without them.
    });

    return () => {
      active = false;
      if (disconnect) disconnect();
    };
  }, [currentUser?.id]);

  const login = useCallback(
    async ({ email, password }) => {
      setIsAuthLoading(true);
      setAuthError('');

      try {
        const response = await authApi.login({ email, password });
        storeSession(response.data?.user, response.data?.accessToken);
        return response.data?.user;
      } catch (error) {
        const message = error.message || 'Login failed. Check your email and password.';
        setAuthError(message);
        throw error;
      } finally {
        setIsAuthLoading(false);
      }
    },
    [storeSession]
  );

  const register = useCallback(
    async (payload) => {
      setIsAuthLoading(true);
      setAuthError('');

      try {
        const response = await authApi.register(payload);
        if (response.data?.accessToken) {
          storeSession(response.data?.user, response.data?.accessToken);
        }
        return { ...(response.data || {}), message: response.message };
      } catch (error) {
        const message = error.message || 'Registration failed. Check the details and try again.';
        setAuthError(message);
        throw error;
      } finally {
        setIsAuthLoading(false);
      }
    },
    [storeSession]
  );

  const logout = useCallback(async () => {
    try {
      if (getAccessToken()) await authApi.logout();
    } catch {
      // Local session cleanup still happens if the server session is already gone.
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const markAllNotificationsRead = useCallback(() => {
    const previous = notifications;
    setNotifications((items) => items.map((item) => ({ ...item, read: true })));
    api.patch('/notifications/read-all').catch(() => setNotifications(previous));
  }, [notifications]);

  const markNotificationRead = useCallback((id) => {
    const previous = notifications;
    setNotifications((items) => items.map((item) => (item.id === id ? { ...item, read: true } : item)));
    api.patch(`/notifications/${id}/read`).catch(() => setNotifications(previous));
  }, [notifications]);

  const toggleTheme = () => setTheme((value) => (value === 'dark' ? 'light' : 'dark'));

  const selectChild = useCallback((childId) => {
    setSelectedChildId(childId);
    api.invalidate('/parents/me/dashboard');
  }, []);

  const retryData = useCallback(() => {
    api.invalidate();
    setDataRefreshKey((value) => value + 1);
  }, []);

  const updateData = useCallback((updater) => {
    setAppData((existing) => (typeof updater === 'function' ? updater(existing) : { ...existing, ...updater }));
  }, []);

  const removeAssignment = useCallback(async (id) => {
    const removed = appData.assignments.find((item) => item.id === id);
    updateData((data) => ({ ...data, assignments: data.assignments.filter((item) => item.id !== id) }));
    try {
      await api.delete(`/assignments/${id}`);
    } catch (error) {
      if (removed) updateData((data) => ({ ...data, assignments: [removed, ...data.assignments] }));
      throw error;
    }
  }, [appData.assignments, updateData]);

  const recordFeePayment = useCallback(async ({ feeId, amount, paymentMethod, transactionId, remarks }) => {
    const numericAmount = Number(amount);
    const fee = appData.fees.find((item) => item.id === feeId);
    if (!fee) throw new Error('Select a valid fee record.');
    if (!numericAmount || numericAmount <= 0) throw new Error('Enter a valid payment amount.');
    if (numericAmount > fee.amount - fee.paid) throw new Error('Payment exceeds the remaining balance.');

    const nextPaid = fee.paid + numericAmount;
    const nextStatus = nextPaid >= fee.amount ? 'paid' : 'partial';
    updateData((data) => ({
      ...data,
      fees: data.fees.map((item) => item.id === feeId ? { ...item, paid: nextPaid, status: nextStatus, paidDate: new Date().toISOString().slice(0, 10) } : item),
    }));

    try {
      await api.post(`/fees/${feeId}/pay`, { amount: numericAmount, paymentMethod, transactionId, remarks });
    } catch (error) {
      updateData((data) => ({ ...data, fees: data.fees.map((item) => item.id === feeId ? fee : item) }));
      throw error;
    }
  }, [appData.fees, updateData]);

  const generateAIInsights = useCallback(async () => {
    const candidates = appData.students.filter((student) => student.risk !== 'low' || student.attendance < 85);
    const insights = await Promise.all(candidates.map(async (student) => {
      const recordInsight = {
        student: student.name,
        risk: student.risk || (student.attendance < 70 ? 'high' : 'medium'),
        confidence: null,
        source: 'Record analysis',
        summary: `${student.name} has ${student.attendance}% attendance and a current grade of ${student.grade}.`,
        recommendations: [
          ...(student.attendance < 85 ? ['Review attendance pattern'] : []),
          ...(student.risk === 'high' ? ['Schedule student support meeting'] : []),
          ...(student.fees === 'overdue' ? ['Coordinate fee support follow-up'] : []),
        ],
      };

      if (!student.backendId || !['ADMIN', 'TEACHER'].includes(currentRole)) return recordInsight;
      try {
        const response = await api.get(`/ai/student/${student.backendId}/risk-explain`);
        return {
          ...recordInsight,
          risk: String(response.data?.riskLevel || recordInsight.risk).toLowerCase(),
          confidence: response.data?.riskScore ?? null,
          source: 'AI provider',
          summary: response.data?.explanation || recordInsight.summary,
          recommendations: response.data?.recommendations?.length ? response.data.recommendations : recordInsight.recommendations,
        };
      } catch {
        return recordInsight;
      }
    }));
    updateData((data) => ({ ...data, generatedInsights: insights }));
    return insights;
  }, [appData.students, currentRole, updateData]);

  const addAnnouncement = useCallback(async (announcement) => {
    const target = announcement.target || 'ALL';
    const selectedClass = appData.classes.find((item) => item.id === announcement.classId);
    const optimistic = {
      id: `AN${Date.now()}`,
      title: announcement.title,
      content: announcement.content,
      audience: target === 'CLASS' ? `Class ${selectedClass?.name || ''}`.trim() : target.toLowerCase().replace(/^\w/, (character) => character.toUpperCase()),
      author: currentUser?.name || 'School Administration',
      date: new Date().toISOString().slice(0, 10),
    };

    updateData((data) => ({ ...data, announcements: [optimistic, ...data.announcements] }));

    try {
      const response = await api.post('/announcements', {
        title: announcement.title,
        content: announcement.content,
        target,
        ...(target === 'CLASS' ? { classId: announcement.classId } : {}),
        ...(announcement.expiresAt ? { expiresAt: announcement.expiresAt } : {}),
      });
      const created = response.data ? mapAnnouncement(response.data) : optimistic;
      updateData((data) => ({
        ...data,
        announcements: data.announcements.map((item) => (item.id === optimistic.id ? created : item)),
      }));
      return created;
    } catch (error) {
      updateData((data) => ({ ...data, announcements: data.announcements.filter((item) => item.id !== optimistic.id) }));
      throw error;
    }
  }, [appData.classes, currentUser?.name, updateData]);

  const publishResults = useCallback(async (payload) => {
    const notification = {
      id: `N${Date.now()}`,
      type: 'result',
      title: 'Results Published',
      message: 'The latest examination results are now visible to students and parents.',
      time: 'Just now',
      read: false,
    };
    await api.post('/results/publish', payload);
    setNotifications((items) => [notification, ...items]);
    setDataRefreshKey((value) => value + 1);
  }, []);

  const searchRecords = useCallback((query) => {
    const term = query.trim().toLowerCase();
    if (!term) return [];

    const sources = [
      ...appData.students.map((item) => ({ type: 'Student', title: item.name, subtitle: `${item.className} - Roll ${item.rollNo}`, path: '/app/students' })),
      ...(currentRole === 'ADMIN' ? appData.teachers.map((item) => ({ type: 'Teacher', title: item.name, subtitle: item.subject, path: '/app/teachers' })) : []),
      ...(currentRole === 'PARENT' ? [] : appData.classes.map((item) => ({ type: 'Class', title: `Class ${item.name}`, subtitle: `${item.students} students - ${item.room}`, path: '/app/classes' }))),
      ...appData.assignments.map((item) => ({ type: 'Assignment', title: item.title, subtitle: `${item.subject} - ${item.className}`, path: '/app/assignments' })),
      ...(currentRole === 'TEACHER' ? [] : appData.fees.map((item) => ({ type: 'Fee', title: item.student, subtitle: `${item.term} - ${item.status}`, path: '/app/fees' }))),
    ];

    return sources.filter((item) => `${item.type} ${item.title} ${item.subtitle}`.toLowerCase().includes(term)).slice(0, 8);
  }, [appData, currentRole]);

  const value = useMemo(
    () => ({
      currentRole,
      currentUser,
      selectedChildId,
      setSelectedChildId: selectChild,
      isAuthenticated: Boolean(currentUser),
      isAuthLoading,
      isDataLoading,
      dataError,
      retryData,
      authError,
      theme,
      data: appData,
      notifications,
      sidebarOpen,
      setSidebarOpen,
      login,
      register,
      logout,
      toggleTheme,
      markAllNotificationsRead,
      markNotificationRead,
      searchRecords,
      removeAssignment,
      recordFeePayment,
      generateAIInsights,
      addAnnouncement,
      publishResults,
    }),
    [
      appData,
      authError,
      currentRole,
      currentUser,
      selectedChildId,
      selectChild,
      isAuthLoading,
      isDataLoading,
      dataError,
      login,
      register,
      retryData,
      logout,
      notifications,
      markAllNotificationsRead,
      markNotificationRead,
      publishResults,
      removeAssignment,
      recordFeePayment,
      generateAIInsights,
      addAnnouncement,
      searchRecords,
      sidebarOpen,
      theme,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used inside AppProvider');
  }
  return context;
}
