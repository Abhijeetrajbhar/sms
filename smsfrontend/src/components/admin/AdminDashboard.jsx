import {
  BookOpen,
  ClipboardCheck,
  GraduationCap,
  IndianRupee,
  Megaphone,
  RefreshCw,
  ShieldCheck,
  UserRoundCheck,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import PageHeader from '../common/PageHeader.jsx';
import StatCard from '../common/StatCard.jsx';
import Card from '../ui/Card.jsx';
import Badge from '../ui/Badge.jsx';
import Button from '../ui/Button.jsx';
import { formatCurrency } from '../../utils/formatters.js';
import { hasPermission } from '../../utils/permissions.js';

function EmptyState({ children }) {
  return <p className="rounded-xl border border-dashed border-outline-variant/60 bg-surface-container-low px-4 py-5 text-center text-sm font-semibold text-on-surface-variant">{children}</p>;
}

export default function AdminDashboard({ dashboard, currentUser, isLoading, error, onRetry }) {
  const totals = dashboard?.totals || {};
  const pending = dashboard?.pending || {};
  const quickActions = [
    ['Add Student', '/app/students', 'students:create'],
    ['Add Teacher', '/app/teachers', 'teachers:create'],
    ['Add Parent', '/app/parents', 'parents:create'],
    ['Create Class', '/app/classes', 'classes:manage'],
    ['Create Notice', '/app/announcements', 'notices:manage'],
    ['Manage Fees', '/app/fees', 'fees:view'],
    ['View Attendance', '/app/attendance', 'attendance:view'],
    ['View Reports', '/app/analytics', 'reports:view'],
  ].filter((item) => hasPermission(currentUser, item[2]));

  if (isLoading && !dashboard) {
    return <div className="page-shell"><Card><EmptyState>Loading the admin operations summary...</EmptyState></Card></div>;
  }

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Admin Workspace"
        title="School operations overview"
        description="Permission-scoped school totals, pending actions, finance, attendance, notices, and audit activity."
      />

      {error ? (
        <div role="alert" className="flex flex-col gap-3 rounded-xl bg-error-container px-4 py-3 text-sm font-semibold text-on-error-container sm:flex-row sm:items-center sm:justify-between">
          <span>{error}</span>
          <Button size="sm" variant="secondary" icon={RefreshCw} onClick={onRetry}>Retry</Button>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Students" value={`${totals.activeStudents || 0}/${totals.students || 0}`} icon={GraduationCap} tone="blue" />
        <StatCard title="Teachers" value={`${totals.activeTeachers || 0}/${totals.teachers || 0}`} icon={Users} tone="violet" />
        <StatCard title="Classes / Sections" value={`${totals.classes || 0} / ${totals.sections || 0}`} icon={BookOpen} tone="emerald" />
        <StatCard title="Today Attendance" value={`${dashboard?.attendance?.percentage || 0}%`} icon={ClipboardCheck} tone="amber" />
      </div>

      {quickActions.length ? (
        <Card>
          <p className="text-xs font-bold uppercase text-primary">Quick actions</p>
          <div className="mt-4 grid gap-2 min-[425px]:grid-cols-2 sm:grid-cols-3 xl:grid-cols-4">
            {quickActions.map(([label, path]) => <Link key={label} to={path}><Button className="w-full" variant="secondary">{label}</Button></Link>)}
          </div>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {dashboard?.fees ? (
          <Card>
            <div className="flex items-center justify-between gap-3"><h3 className="text-lg font-bold text-on-surface">Fee overview</h3><IndianRupee className="h-6 w-6 text-primary" /></div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-surface-container-low p-4"><p className="text-xs font-bold uppercase text-on-surface-variant">Collected</p><p className="mt-2 text-xl font-bold text-on-surface">{formatCurrency(dashboard.fees.collected)}</p></div>
              <div className="rounded-xl bg-surface-container-low p-4"><p className="text-xs font-bold uppercase text-on-surface-variant">Pending dues</p><p className="mt-2 text-xl font-bold text-on-surface">{formatCurrency(dashboard.fees.due)}</p></div>
            </div>
          </Card>
        ) : null}

        <Card>
          <div className="flex items-center justify-between gap-3"><h3 className="text-lg font-bold text-on-surface">Pending actions</h3><UserRoundCheck className="h-6 w-6 text-primary" /></div>
          <div className="mt-4 grid gap-3">
            {[
              ['Students without linked parent', pending.parentLinks],
              ['Teacher approvals', pending.teacherApprovals],
              ['Offline payment verification', pending.offlinePayments],
            ].filter((item) => item[1] !== null && item[1] !== undefined).map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-3 rounded-xl bg-surface-container-low p-4"><span className="text-sm font-semibold text-on-surface-variant">{label}</span><Badge tone={value ? 'amber' : 'emerald'}>{value}</Badge></div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-3"><h3 className="text-lg font-bold text-on-surface">Academic setup</h3><BookOpen className="h-6 w-6 text-primary" /></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-surface-container-low p-4"><p className="text-xs font-bold uppercase text-on-surface-variant">Subjects</p><p className="mt-2 text-xl font-bold text-on-surface">{totals.subjects || 0}</p></div>
            <div className="rounded-xl bg-surface-container-low p-4"><p className="text-xs font-bold uppercase text-on-surface-variant">Parents</p><p className="mt-2 text-xl font-bold text-on-surface">{totals.parents || 0}</p></div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">{(dashboard?.academicYears || []).map((year) => <Badge key={year} tone="blue">{year}</Badge>)}</div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <div className="flex items-center justify-between gap-3"><h3 className="text-lg font-bold text-on-surface">Recent admissions</h3><GraduationCap className="h-6 w-6 text-primary" /></div>
          <div className="mt-4 space-y-3">{dashboard?.recentAdmissions?.length ? dashboard.recentAdmissions.map((student) => (
            <div key={student.id} className="rounded-xl bg-surface-container-low p-4"><p className="font-bold text-on-surface">{student.user.firstName} {student.user.lastName}</p><p className="mt-1 text-sm text-on-surface-variant">{student.studentCode} / {student.class ? `${student.class.name} ${student.class.section}` : 'Unassigned'}</p></div>
          )) : <EmptyState>No recent admissions available.</EmptyState>}</div>
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-3"><h3 className="text-lg font-bold text-on-surface">Recent notices</h3><Megaphone className="h-6 w-6 text-primary" /></div>
          <div className="mt-4 space-y-3">{dashboard?.recentNotices?.length ? dashboard.recentNotices.map((notice) => (
            <div key={notice.id} className="rounded-xl bg-surface-container-low p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-bold text-on-surface">{notice.title}</p><Badge tone="blue">{notice.target}</Badge></div></div>
          )) : <EmptyState>No recent notices available.</EmptyState>}</div>
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-3"><h3 className="text-lg font-bold text-on-surface">Recent audit activity</h3><ShieldCheck className="h-6 w-6 text-primary" /></div>
          <div className="mt-4 space-y-3">{dashboard?.recentAudit?.length ? dashboard.recentAudit.map((log) => (
            <div key={log.id} className="rounded-xl bg-surface-container-low p-4"><p className="font-bold text-on-surface">{String(log.action).replaceAll('_', ' ')}</p><p className="mt-1 text-sm text-on-surface-variant">{log.actor.firstName} {log.actor.lastName} / {log.entity}</p></div>
          )) : <EmptyState>No audit activity available.</EmptyState>}</div>
        </Card>
      </div>
    </div>
  );
}
