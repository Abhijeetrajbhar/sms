import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { mockData } from '../data/mockData.js';
import { api, authApi, getAccessToken, setAccessToken } from '../services/api.js';
import { hasPermission } from '../utils/permissions.js';

const AppContext = createContext(null);
const USER_KEY = 'sms-user';
const THEME_KEY = 'sms-theme';

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

async function loadBackendData(role, selectedChildId, currentUser) {
  const nextData = {};
  const requests = [];

  if (role === 'TEACHER') {
    requests.push(
      api.get('/teachers/me/dashboard').then((response) => {
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
      api.get('/assignments?limit=100').then((response) => {
        if (Array.isArray(response.data)) nextData.assignments = response.data.map(mapAssignment);
      })
    );
    requests.push(
      api.get('/timetable/my-schedule').then((response) => {
        if (Array.isArray(response.data)) nextData.timetable = mapTeacherTimetable(response.data);
      })
    );
    requests.push(
      api.get('/results/teacher/marks/history?limit=100').then((response) => {
        if (Array.isArray(response.data)) nextData.results = response.data.map(mapTeacherResult);
      })
    );
    requests.push(
      api.get('/notifications?limit=100').then((response) => {
        if (Array.isArray(response.data)) nextData.roleNotifications = response.data.map(mapNotification);
      })
    );
  }

  if (role === 'ADMIN') {
    if (hasPermission(currentUser, 'students:view')) requests.push(
      api.get('/students?limit=100').then((response) => {
        if (Array.isArray(response.data)) nextData.students = response.data.map(mapStudent);
      })
    );

    if (hasPermission(currentUser, 'teachers:view')) requests.push(
      api.get('/teachers?limit=100').then((response) => {
        if (Array.isArray(response.data)) nextData.teachers = response.data.map(mapTeacher);
      })
    );
  }

  if (role === 'PARENT') {
    const query = selectedChildId ? `?studentId=${encodeURIComponent(selectedChildId)}` : '';
    requests.push(
      api.get(`/parents/me/dashboard${query}`).then((response) => {
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
        nextData.fees = Array.isArray(dashboard.fees?.legacy) ? dashboard.fees.legacy.map(mapFee) : [];
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
      api.get('/students/me/dashboard').then((response) => {
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
        nextData.fees = Array.isArray(dashboard.fees?.legacy) ? dashboard.fees.legacy.map(mapFee) : [];
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
      api.get('/analytics/dashboard').then((response) => {
        if (response.data) nextData.dashboardAnalytics = response.data;
      })
    );

    if (hasPermission(currentUser, 'classes:manage')) requests.push(
      api.get('/classes?limit=100').then((response) => {
        if (Array.isArray(response.data)) nextData.classes = response.data.map(mapClass);
      })
    );

    if (hasPermission(currentUser, 'notices:manage')) requests.push(
      api.get('/announcements?limit=100').then((response) => {
        const rows = response.data?.data || response.data;
        if (Array.isArray(rows)) nextData.announcements = rows.map(mapAnnouncement);
      })
    );

    if (hasPermission(currentUser, 'fees:view')) requests.push(
      api.get('/fees?limit=100').then((response) => {
        const rows = response.data?.data || response.data;
        if (Array.isArray(rows)) nextData.fees = rows.map(mapFee);
      })
    );

    if (hasPermission(currentUser, 'audit:view')) requests.push(
      api.get('/audit-logs?limit=100').then((response) => {
        if (Array.isArray(response.data)) nextData.auditLogs = response.data.map(mapAuditLog);
      })
    );
  }

  const results = await Promise.allSettled(requests);
  return {
    data: nextData,
    failedRequests: results.filter((result) => result.status === 'rejected').length,
  };
}

export function AppProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(readStoredUser);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [appData, setAppData] = useState(mockData);
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) || 'light');
  const [isAuthLoading, setIsAuthLoading] = useState(() => Boolean(getAccessToken()));
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [dataError, setDataError] = useState('');
  const [dataRefreshKey, setDataRefreshKey] = useState(0);
  const [authError, setAuthError] = useState('');
  const [notifications, setNotifications] = useState(mockData.notifications);
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
      if (!getAccessToken()) {
        setIsAuthLoading(false);
        return;
      }

      try {
        const response = await authApi.me();
        if (active) storeSession(response.data);
      } catch {
        if (active) clearSession();
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

    async function hydrateData() {
      if (!currentRole || !getAccessToken()) {
        setAppData(mockData);
        return;
      }

      setIsDataLoading(true);
      const result = await loadBackendData(currentRole, selectedChildId, currentUser);

      if (active) {
        setAppData((existing) => ['ADMIN', 'TEACHER', 'PARENT', 'STUDENT'].includes(currentRole)
          ? {
            ...existing,
            ...(currentRole === 'ADMIN' ? { dashboardAnalytics: null, auditLogs: [] } : {}),
            ...(currentRole === 'PARENT' ? { parentDashboard: null } : {}),
            ...(currentRole === 'STUDENT' ? { studentDashboard: null } : {}),
            students: [],
            teachers: [],
            classes: [],
            fees: [],
            results: [],
            assignments: [],
            attendance: { today: [], monthly: {} },
            timetable: {},
            announcements: [],
            ...result.data,
          }
          : { ...existing, ...result.data });
        if (currentRole === 'PARENT' && !selectedChildId && result.data.parentDashboard?.selectedChild?.id) {
          setSelectedChildId(result.data.parentDashboard.selectedChild.id);
        }
        if (['TEACHER', 'PARENT', 'STUDENT'].includes(currentRole)) {
          setNotifications(result.data.roleNotifications || []);
        }
        setDataError(result.failedRequests
          ? `Some live school data could not be loaded (${result.failedRequests} request${result.failedRequests === 1 ? '' : 's'} failed).`
          : '');
        setIsDataLoading(false);
      }
    }

    hydrateData();
    if (currentRole && getAccessToken()) {
      refreshTimer = window.setInterval(hydrateData, 30000);
    }
    return () => {
      active = false;
      if (refreshTimer) window.clearInterval(refreshTimer);
    };
  }, [currentRole, currentUser, selectedChildId, dataRefreshKey]);

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
        storeSession(response.data?.user, response.data?.accessToken);
        return response.data?.user;
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

  const markAllNotificationsRead = () => {
    setNotifications((items) => items.map((item) => ({ ...item, read: true })));
    api.patch('/notifications/read-all').catch(() => undefined);
  };

  const markNotificationRead = (id) => {
    setNotifications((items) => items.map((item) => (item.id === id ? { ...item, read: true } : item)));
    api.patch(`/notifications/${id}/read`).catch(() => undefined);
  };

  const toggleTheme = () => setTheme((value) => (value === 'dark' ? 'light' : 'dark'));

  const selectChild = useCallback((childId) => {
    setSelectedChildId(childId);
    setAppData((existing) => ({
      ...existing,
      parentDashboard: null,
      fees: [],
      results: [],
      assignments: [],
      attendance: { today: [], monthly: {} },
      timetable: {},
      announcements: [],
    }));
  }, []);

  const updateData = useCallback((updater) => {
    setAppData((existing) => (typeof updater === 'function' ? updater(existing) : { ...existing, ...updater }));
  }, []);

  const addStudent = useCallback((student) => {
    const next = {
      id: student.id || `S${Date.now().toString().slice(-5)}`,
      attendance: Number(student.attendance || 100),
      grade: student.grade || 'N/A',
      risk: student.risk || 'low',
      fees: student.fees || 'pending',
      ...student,
    };
    updateData((data) => ({ ...data, students: [next, ...data.students] }));
  }, [updateData]);

  const removeStudent = useCallback((id) => {
    updateData((data) => ({ ...data, students: data.students.filter((item) => item.id !== id) }));
  }, [updateData]);

  const addTeacher = useCallback((teacher) => {
    const next = {
      id: teacher.id || `T${Date.now().toString().slice(-5)}`,
      status: 'active',
      workload: Number(teacher.workload || 50),
      classes: String(teacher.classes || '').split(',').map((item) => item.trim()).filter(Boolean),
      ...teacher,
    };
    updateData((data) => ({ ...data, teachers: [next, ...data.teachers] }));
  }, [updateData]);

  const removeTeacher = useCallback((id) => {
    updateData((data) => ({ ...data, teachers: data.teachers.filter((item) => item.id !== id) }));
  }, [updateData]);

  const addClass = useCallback((classItem) => {
    const next = {
      id: classItem.id || `C${Date.now().toString().slice(-5)}`,
      students: Number(classItem.students || 0),
      subjects: Number(classItem.subjects || 0),
      health: Number(classItem.health || 85),
      ...classItem,
    };
    updateData((data) => ({ ...data, classes: [next, ...data.classes] }));
    api.post('/classes', {
      name: next.name,
      section: next.section,
      gradeLevel: String(next.name).replace(/[^0-9]/g, '') || next.name,
      academicYear: '2025-2026',
      capacity: Math.max(40, Number(next.students || 0)),
      room: next.room,
    }).catch(() => undefined);
  }, [updateData]);

  const removeClass = useCallback((id) => {
    updateData((data) => ({ ...data, classes: data.classes.filter((item) => item.id !== id) }));
    api.delete(`/classes/${id}`).catch(() => undefined);
  }, [updateData]);

  const addAssignment = useCallback((assignment) => {
    const next = {
      id: assignment.id || `A${Date.now().toString().slice(-5)}`,
      submitted: Number(assignment.submitted || 0),
      total: Number(assignment.total || 1),
      status: assignment.status || 'active',
      ...assignment,
    };
    updateData((data) => ({ ...data, assignments: [next, ...data.assignments] }));
  }, [updateData]);

  const removeAssignment = useCallback((id) => {
    updateData((data) => ({ ...data, assignments: data.assignments.filter((item) => item.id !== id) }));
    api.delete(`/assignments/${id}`).catch(() => undefined);
  }, [updateData]);

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

  const addPeriod = useCallback(async (period) => {
    const next = { id: period.id || `P${Date.now()}`, ...period };
    updateData((data) => ({
      ...data,
      timetable: { ...data.timetable, [period.day]: [...(data.timetable[period.day] || []), next].sort((a, b) => a.time.localeCompare(b.time)) },
    }));

    if (period.timetableId && period.classId && period.subjectId && period.teacherId) {
      try {
        const response = await api.post(`/timetable/${period.timetableId}/slots`, {
          classId: period.classId,
          subjectId: period.subjectId,
          teacherId: period.teacherId,
          dayOfWeek: period.dayOfWeek,
          startTime: period.startTime,
          endTime: period.endTime,
          room: period.room,
        });
        const backendId = response.data?.id;
        if (backendId) updateData((data) => ({
          ...data,
          timetable: { ...data.timetable, [period.day]: data.timetable[period.day].map((item) => item.id === next.id ? { ...item, id: backendId, timetableId: period.timetableId } : item) },
        }));
      } catch (error) {
        updateData((data) => ({ ...data, timetable: { ...data.timetable, [period.day]: data.timetable[period.day].filter((item) => item.id !== next.id) } }));
        throw error;
      }
    }
  }, [updateData]);

  const removePeriod = useCallback(async (day, period) => {
    updateData((data) => ({ ...data, timetable: { ...data.timetable, [day]: data.timetable[day].filter((item) => item !== period && item.id !== period.id) } }));
    if (period.timetableId && period.id && !String(period.id).startsWith('P')) {
      try {
        await api.delete(`/timetable/${period.timetableId}/slots/${period.id}`);
      } catch (error) {
        updateData((data) => ({ ...data, timetable: { ...data.timetable, [day]: [...data.timetable[day], period].sort((a, b) => a.time.localeCompare(b.time)) } }));
        throw error;
      }
    }
  }, [updateData]);

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

  const publishResults = useCallback(() => {
    const notification = {
      id: `N${Date.now()}`,
      type: 'result',
      title: 'Results Published',
      message: 'The latest examination results are now visible to students and parents.',
      time: 'Just now',
      read: false,
    };
    setNotifications((items) => [notification, ...items]);
    api.post('/results/publish', {
      classId: appData.classes[0]?.id,
      examType: 'Mid-Term',
      term: 'Term 2',
      academicYear: '2025-2026',
    }).catch(() => undefined);
  }, [appData.classes]);

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
      retryData: () => setDataRefreshKey((value) => value + 1),
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
      addStudent,
      removeStudent,
      addTeacher,
      removeTeacher,
      addClass,
      removeClass,
      addAssignment,
      removeAssignment,
      recordFeePayment,
      addPeriod,
      removePeriod,
      generateAIInsights,
      addAnnouncement,
      publishResults,
    }),
    [
      addAssignment,
      addClass,
      addStudent,
      addTeacher,
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
      logout,
      notifications,
      publishResults,
      removeAssignment,
      recordFeePayment,
      addPeriod,
      removePeriod,
      generateAIInsights,
      addAnnouncement,
      removeClass,
      removeStudent,
      removeTeacher,
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
