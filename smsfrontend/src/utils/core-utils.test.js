import { describe, expect, it } from 'vitest';
import { formatCurrency, getInitials, percentage } from './formatters.js';
import { hasPermission, isSuperAdmin } from './permissions.js';
import { getScopedStudent, getStudentAttendanceRows, getStudentFees, getStudentResults } from './studentScope.js';
import { riskTone, statusTone } from './statusStyles.js';
import { navigationByRole } from '../constants/navigation.js';

describe('formatters', () => {
  it('handles initials, percentages, and Indian Rupee formatting safely', () => {
    expect(getInitials('  Meena   Krishnan ')).toBe('MK');
    expect(getInitials('Single')).toBe('S');
    expect(getInitials('')).toBe('');
    expect(percentage(3, 4)).toBe(75);
    expect(percentage(3, 0)).toBe(0);

    const formatted = formatCurrency(50000);
    expect(formatted).toContain('50,000');
  });
});

describe('admin permissions', () => {
  it('honors explicit permissions and super-admin access', () => {
    expect(hasPermission({ role: 'ADMIN', permissions: ['fees:view'] }, 'fees:view')).toBe(true);
    expect(hasPermission({ role: 'ADMIN', permissions: [] }, 'fees:view')).toBe(false);
    expect(isSuperAdmin({ role: 'ADMIN', isSuperAdmin: true })).toBe(true);
    expect(isSuperAdmin({ role: 'ADMIN', isSuperAdmin: false })).toBe(false);
    expect(isSuperAdmin({ role: 'TEACHER', isSuperAdmin: true })).toBe(false);
    expect(hasPermission({ role: 'ADMIN', isSuperAdmin: true }, 'audit:view')).toBe(true);
  });
});

describe('student scoping', () => {
  const dummyStudents = [
    { backendId: 'std_01', name: 'Student One', classId: 'cls_A' },
    { backendId: 'std_02', name: 'Student Two', classId: 'cls_B' },
  ];

  it('correctly resolves scoped student for PARENT role', () => {
    const data = {
      students: dummyStudents,
      parentDashboard: {
        selectedChild: { id: 'std_02' },
      },
    };
    const scoped = getScopedStudent(data, { id: 'usr_p1' }, 'PARENT');
    expect(scoped).toEqual(dummyStudents[1]);
  });

  it('correctly resolves scoped student for STUDENT role', () => {
    const data = { students: dummyStudents };
    const scoped = getScopedStudent(data, { id: 'std_01' }, 'STUDENT');
    expect(scoped).toEqual(dummyStudents[0]);
  });

  it('filters attendance, results, and fees strictly by student.backendId', () => {
    const student = dummyStudents[0];
    const data = {
      attendance: {
        today: [
          { studentId: 'std_01', status: 'present' },
          { studentId: 'std_02', status: 'absent' },
        ],
      },
      results: [
        { studentId: 'std_01', subject: 'Math', marks: 95 },
        { studentId: 'std_02', subject: 'Math', marks: 60 },
      ],
      fees: [
        { studentId: 'std_01', amount: 5000, status: 'paid' },
        { studentId: 'std_02', amount: 4000, status: 'unpaid' },
      ],
    };

    expect(getStudentAttendanceRows(data, student)).toHaveLength(1);
    expect(getStudentResults(data, student)).toHaveLength(1);
    expect(getStudentFees(data, student)).toHaveLength(1);
    expect(getStudentFees(data, null)).toHaveLength(0);
  });
});

describe('status and risk tones', () => {
  it('contains expected styling tones for key statuses and risk levels', () => {
    expect(riskTone.low).toBeDefined();
    expect(riskTone.high).toBeDefined();
    expect(statusTone.paid).toContain('emerald');
    expect(statusTone.unpaid).toContain('slate');
    expect(statusTone.overdue).toContain('rose');
  });
});

describe('navigation roles matrix', () => {
  it('configures distinct navigation menus with valid paths for all 4 roles', () => {
    const roles = ['ADMIN', 'TEACHER', 'STUDENT', 'PARENT'];
    roles.forEach((role) => {
      const items = navigationByRole[role];
      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBeGreaterThan(0);
      items.forEach((item) => {
        expect(item.label).toBeDefined();
        expect(item.path.startsWith('/app/')).toBe(true);
      });
    });

    // ADMIN must have critical management routes
    const adminPaths = navigationByRole.ADMIN.map((i) => i.path);
    expect(adminPaths).toContain('/app/dashboard');
    expect(adminPaths).toContain('/app/users');
    expect(adminPaths).toContain('/app/students');
    expect(adminPaths).toContain('/app/teachers');
    expect(adminPaths).toContain('/app/classes');
    expect(adminPaths).toContain('/app/admissions');
    expect(adminPaths).toContain('/app/fees');
    expect(adminPaths).toContain('/app/timetable');
    expect(adminPaths).toContain('/app/results');
    expect(adminPaths).toContain('/app/audit-logs');
  });
});

describe('entity mappers', () => {
  it('normalizes users and maps student entities reliably', async () => {
    const { fullName, normalizeUser, mapStudent, createEmptyAppData } = await import('../services/mappers.js');

    expect(fullName({ firstName: 'Maya', lastName: 'Patel' })).toBe('Maya Patel');
    expect(fullName({ email: 'staff@school.org' })).toBe('staff@school.org');
    expect(fullName(null)).toBe('Unassigned');

    const normalized = normalizeUser({ id: 'u1', firstName: 'Admin', lastName: 'User', role: 'ADMIN' });
    expect(normalized.name).toBe('Admin User');
    expect(normalized.permissions).toEqual([]);
    expect(normalized.isSuperAdmin).toBe(false);

    const empty = createEmptyAppData();
    expect(empty.students).toEqual([]);
    expect(empty.adminStats.totalStudents).toBe(0);

    const rawStudent = {
      id: 'st_001',
      studentCode: 'STD-1001',
      user: { firstName: 'Rohan', lastName: 'Sharma' },
      class: { name: 'Grade 10', section: 'B' },
      attendancePercentage: 88.4,
      riskLevel: 'LOW',
    };
    const mapped = mapStudent(rawStudent);
    expect(mapped.name).toBe('Rohan Sharma');
    expect(mapped.className).toBe('Grade 10 B');
    expect(mapped.attendance).toBe(88);
    expect(mapped.risk).toBe('low');
  });
});

