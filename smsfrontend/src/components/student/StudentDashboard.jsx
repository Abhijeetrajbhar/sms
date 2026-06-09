import {
  Award,
  BellRing,
  CalendarDays,
  ClipboardCheck,
  GraduationCap,
  IndianRupee,
  Megaphone,
  RefreshCw,
  UserRound,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import PageHeader from '../common/PageHeader.jsx';
import StatCard from '../common/StatCard.jsx';
import Card from '../ui/Card.jsx';
import Badge from '../ui/Badge.jsx';
import Button from '../ui/Button.jsx';
import { formatCurrency } from '../../utils/formatters.js';

const quickActions = [
  ['My Profile', '/app/students', UserRound],
  ['Attendance', '/app/attendance', ClipboardCheck],
  ['Assignments', '/app/assignments', BellRing],
  ['Results', '/app/results', Award],
  ['Timetable', '/app/timetable', CalendarDays],
  ['Notices', '/app/announcements', Megaphone],
];

function name(user) {
  return [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Student';
}

function EmptyState({ children }) {
  return <p className="rounded-xl border border-dashed border-outline-variant/60 bg-surface-container-low px-4 py-5 text-center text-sm font-semibold text-on-surface-variant">{children}</p>;
}

export default function StudentDashboard({ dashboard, isLoading, error, onRetry }) {
  if (isLoading && !dashboard) {
    return <div className="page-shell"><Card><EmptyState>Loading your student workspace...</EmptyState></Card></div>;
  }

  const profile = dashboard?.profile;
  const attendance = dashboard?.attendance?.summary || {};
  const assignments = dashboard?.assignments || [];
  const results = dashboard?.results || [];
  const invoices = dashboard?.fees?.invoices || [];
  const notices = dashboard?.notices || [];
  const dueAmount = invoices.reduce((sum, invoice) => sum + Number(invoice.dueAmount || 0), 0);
  const pendingAssignments = assignments.filter((assignment) => !assignment.submissions?.length && new Date(assignment.dueDate) >= new Date());
  const averageScore = results.length
    ? Math.round(results.reduce((sum, result) => sum + Number(result.percentage || 0), 0) / results.length)
    : 0;
  const dayOfWeek = (new Date().getDay() + 6) % 7;
  const todaySchedule = (dashboard?.timetable || []).filter((slot) => slot.dayOfWeek === dayOfWeek);

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Student Workspace"
        title={`Welcome, ${name(profile?.user)}`}
        description="Your attendance, published assignments and results, class timetable, fees, and relevant notices."
      />

      {error ? (
        <div role="alert" className="flex flex-col gap-3 rounded-xl bg-error-container px-4 py-3 text-sm font-semibold text-on-error-container sm:flex-row sm:items-center sm:justify-between">
          <span>{error}</span>
          <Button size="sm" variant="secondary" icon={RefreshCw} onClick={onRetry}>Retry</Button>
        </div>
      ) : null}

      {!profile ? <Card><EmptyState>No active student profile is linked to this account. Contact the school administrator.</EmptyState></Card> : (
        <>
          <Card className="overflow-hidden bg-gradient-to-br from-primary/10 via-surface-container-lowest to-secondary/10">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase text-primary">My class</p>
                <h2 className="mt-1 text-xl font-bold text-on-surface sm:text-2xl">{profile.class ? `Class ${profile.class.name} ${profile.class.section}` : 'Class not assigned'}</h2>
                <p className="mt-1 text-sm font-semibold text-on-surface-variant">
                  {profile.class?.academicYear || 'Academic year not available'} / Admission {profile.studentCode}
                </p>
              </div>
              <Badge tone={profile.class ? 'emerald' : 'amber'}>{profile.class ? 'Active student' : 'Assignment pending'}</Badge>
            </div>
          </Card>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard title="Attendance" value={`${attendance.percentage || 0}%`} icon={ClipboardCheck} tone="emerald" />
            <StatCard title="Assignments Due" value={pendingAssignments.length} icon={BellRing} tone="blue" />
            <StatCard title="Published Average" value={results.length ? `${averageScore}%` : 'N/A'} icon={Award} tone="violet" />
            <StatCard title="Fee Due" value={formatCurrency(dueAmount)} icon={IndianRupee} tone={dueAmount ? 'rose' : 'emerald'} />
          </div>

          <div className="grid gap-3 min-[425px]:grid-cols-2 sm:grid-cols-3 xl:grid-cols-6">
            {quickActions.map(([label, path, Icon]) => (
              <Link key={label} to={path} className="min-w-0">
                <Card hover className="grid min-h-24 place-items-center gap-2 p-3 text-center">
                  <Icon className="h-5 w-5 text-primary" />
                  <span className="text-sm font-bold text-on-surface">{label}</span>
                </Card>
              </Link>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,.9fr)]">
            <Card>
              <div className="flex items-center justify-between gap-3">
                <div><p className="text-xs font-bold uppercase text-primary">Today</p><h3 className="mt-1 text-lg font-bold text-on-surface">My timetable</h3></div>
                <CalendarDays className="h-6 w-6 text-primary" />
              </div>
              <div className="mt-4 space-y-3">
                {todaySchedule.length ? todaySchedule.map((slot) => (
                  <div key={slot.id} className="flex flex-col gap-2 rounded-xl bg-surface-container-low p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-bold text-on-surface">{slot.subject?.name || 'Subject'}</p>
                      <p className="text-sm font-semibold text-on-surface-variant">{name(slot.teacher?.user)} / {slot.room || 'Room TBD'}</p>
                    </div>
                    <Badge tone="blue">{slot.startTime}-{slot.endTime}</Badge>
                  </div>
                )) : <EmptyState>No timetable classes today.</EmptyState>}
              </div>
            </Card>

            <Card>
              <div className="flex items-center gap-3">
                <GraduationCap className="h-6 w-6 text-primary" />
                <div><p className="text-xs font-bold uppercase text-primary">My profile</p><h3 className="mt-1 text-lg font-bold text-on-surface">{name(profile.user)}</h3></div>
              </div>
              <div className="mt-4 grid gap-2 text-sm">
                {[
                  ['Admission number', profile.studentCode],
                  ['Class teacher', profile.class?.teacher?.user ? name(profile.class.teacher.user) : 'Not assigned'],
                  ['Room', profile.class?.room],
                  ['Blood group', profile.bloodGroup],
                ].map(([label, value]) => (
                  <div key={label} className="flex flex-wrap justify-between gap-2 rounded-lg bg-surface-container-low px-3 py-2">
                    <span className="font-semibold text-on-surface-variant">{label}</span>
                    <span className="font-bold text-on-surface">{value || 'Not available'}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <div className="flex items-center justify-between gap-3"><h3 className="text-lg font-bold text-on-surface">My assignments</h3><BellRing className="h-6 w-6 text-primary" /></div>
              <div className="mt-4 space-y-3">
                {assignments.length ? assignments.slice(0, 5).map((assignment) => (
                  <div key={assignment.id} className="rounded-xl bg-surface-container-low p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-bold text-on-surface">{assignment.title}</p>
                      <Badge tone={assignment.submissions?.length ? 'emerald' : 'amber'}>{assignment.submissions?.[0]?.status || 'Pending'}</Badge>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-on-surface-variant">{assignment.subject?.name || 'Subject'} / Due {String(assignment.dueDate).slice(0, 10)}</p>
                  </div>
                )) : <EmptyState>No published assignments for your class.</EmptyState>}
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between gap-3"><h3 className="text-lg font-bold text-on-surface">Relevant notices</h3><Megaphone className="h-6 w-6 text-primary" /></div>
              <div className="mt-4 space-y-3">
                {notices.length ? notices.slice(0, 5).map((notice) => (
                  <div key={notice.id} className="rounded-xl bg-surface-container-low p-4">
                    <p className="font-bold text-on-surface">{notice.title}</p>
                    <p className="mt-1 line-clamp-2 text-sm leading-6 text-on-surface-variant">{notice.content}</p>
                  </div>
                )) : <EmptyState>No school or class notices are available.</EmptyState>}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
