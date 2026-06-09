import {
  Activity,
  Award,
  BarChart3,
  BellRing,
  BookOpen,
  BrainCircuit,
  CalendarDays,
  ClipboardCheck,
  GraduationCap,
  IndianRupee,
  Megaphone,
  ShieldCheck,
  Users,
  UserCog,
  UserRoundCheck,
  LibraryBig,
} from 'lucide-react';

export const navigationByRole = {
  ADMIN: [
    { label: 'Dashboard', path: '/app/dashboard', icon: Activity, permission: 'dashboard:view' },
    { label: 'Users & Roles', path: '/app/users', icon: UserCog, permission: 'users:view' },
    { label: 'Students', path: '/app/students', icon: GraduationCap, permission: 'students:view' },
    { label: 'Teachers', path: '/app/teachers', icon: Users, permission: 'teachers:view' },
    { label: 'Parents', path: '/app/parents', icon: UserRoundCheck, permission: 'parents:view' },
    { label: 'Classes & Sections', path: '/app/classes', icon: BookOpen, permission: 'classes:manage' },
    { label: 'Academic Setup', path: '/app/academic-setup', icon: LibraryBig, permission: 'subjects:manage' },
    { label: 'Attendance', path: '/app/attendance', icon: ClipboardCheck, permission: 'attendance:view' },
    { label: 'Assignments', path: '/app/assignments', icon: BellRing, permission: 'assignments:view' },
    { label: 'Results', path: '/app/results', icon: Award, permission: 'results:view' },
    { label: 'Fees & Payments', path: '/app/fees', icon: IndianRupee, permission: 'fees:view' },
    { label: 'Timetable', path: '/app/timetable', icon: CalendarDays, permission: 'timetable:manage' },
    { label: 'Notices', path: '/app/announcements', icon: Megaphone, permission: 'notices:manage' },
    { label: 'Reports', path: '/app/analytics', icon: BarChart3, permission: 'reports:view' },
    { label: 'AI Insights', path: '/app/ai-insights', icon: BrainCircuit, permission: 'reports:view' },
    { label: 'Audit Logs', path: '/app/audit-logs', icon: ShieldCheck, permission: 'audit:view' },
  ],
  TEACHER: [
    { label: 'Dashboard', path: '/app/dashboard', icon: Activity },
    { label: 'My Classes', path: '/app/classes', icon: BookOpen },
    { label: 'My Students', path: '/app/students', icon: GraduationCap },
    { label: 'Attendance', path: '/app/attendance', icon: ClipboardCheck },
    { label: 'Assignments', path: '/app/assignments', icon: BellRing },
    { label: 'Marks Entry', path: '/app/results', icon: Award },
    { label: 'My Timetable', path: '/app/timetable', icon: CalendarDays },
    { label: 'Notices', path: '/app/announcements', icon: Megaphone },
  ],
  STUDENT: [
    { label: 'Dashboard', path: '/app/dashboard', icon: Activity },
    { label: 'My Profile', path: '/app/students', icon: GraduationCap },
    { label: 'Attendance', path: '/app/attendance', icon: ClipboardCheck },
    { label: 'Assignments', path: '/app/assignments', icon: BellRing },
    { label: 'Results', path: '/app/results', icon: Award },
    { label: 'Timetable', path: '/app/timetable', icon: CalendarDays },
    { label: 'Notices', path: '/app/announcements', icon: Megaphone },
    { label: 'Fees', path: '/app/fees', icon: IndianRupee },
  ],
  PARENT: [
    { label: 'Dashboard', path: '/app/dashboard', icon: Activity },
    { label: 'My Children', path: '/app/students', icon: GraduationCap },
    { label: 'Child Attendance', path: '/app/attendance', icon: ClipboardCheck },
    { label: 'Assignments', path: '/app/assignments', icon: BellRing },
    { label: 'Child Results', path: '/app/results', icon: Award },
    { label: 'Fees & Payments', path: '/app/fees', icon: IndianRupee },
    { label: 'Timetable', path: '/app/timetable', icon: CalendarDays },
    { label: 'Notices', path: '/app/announcements', icon: Megaphone },
  ],
};

export const pageTitles = {
  '/app/dashboard': 'Dashboard',
  '/app/students': 'Student Intelligence',
  '/app/users': 'Users & Roles',
  '/app/parents': 'Parent Management',
  '/app/academic-setup': 'Academic Setup',
  '/app/teachers': 'Faculty Operations',
  '/app/classes': 'Classrooms',
  '/app/attendance': 'Attendance Control',
  '/app/assignments': 'Assignments',
  '/app/results': 'Results & Rank Board',
  '/app/fees': 'Fee Management',
  '/app/timetable': 'Smart Timetable',
  '/app/announcements': 'Announcements',
  '/app/analytics': 'Institution Analytics',
  '/app/ai-insights': 'AI Academic Insights',
  '/app/audit-logs': 'Security Audit Logs',
};

export const routeAccess = Object.entries(navigationByRole).reduce((access, [role, items]) => {
  items.forEach((item) => {
    access[item.path] = Array.from(new Set([...(access[item.path] || []), role]));
    if (role === 'ADMIN' && item.permission) access[`${item.path}:permission`] = [item.permission];
  });
  return access;
}, {});
