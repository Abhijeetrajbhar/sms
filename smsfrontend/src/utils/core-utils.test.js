import { describe, expect, it } from 'vitest';
import { getInitials, percentage } from './formatters.js';
import { hasPermission, isSuperAdmin } from './permissions.js';

describe('formatters', () => {
  it('handles initials and percentages safely', () => {
    expect(getInitials('  Meena   Krishnan ')).toBe('MK');
    expect(percentage(3, 4)).toBe(75);
    expect(percentage(3, 0)).toBe(0);
  });
});

describe('admin permissions', () => {
  it('honors explicit permissions and super-admin access', () => {
    expect(hasPermission({ role: 'ADMIN', permissions: ['fees:view'] }, 'fees:view')).toBe(true);
    expect(hasPermission({ role: 'ADMIN', permissions: [] }, 'fees:view')).toBe(false);
    expect(isSuperAdmin({ role: 'ADMIN', isSuperAdmin: true })).toBe(true);
    expect(hasPermission({ role: 'ADMIN', isSuperAdmin: true }, 'audit:view')).toBe(true);
  });
});
