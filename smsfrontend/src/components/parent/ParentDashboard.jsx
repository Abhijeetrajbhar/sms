import {
  Award,
  BellRing,
  CalendarDays,
  ClipboardCheck,
  Download,
  GraduationCap,
  IndianRupee,
  Megaphone,
  RefreshCw,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import PageHeader from '../common/PageHeader.jsx';
import StatCard from '../common/StatCard.jsx';
import Card from '../ui/Card.jsx';
import Badge from '../ui/Badge.jsx';
import Button from '../ui/Button.jsx';
import { formatCurrency } from '../../utils/formatters.js';

const quickActions = [
  ['Attendance', '/app/attendance', ClipboardCheck],
  ['Pay Fees', '/app/fees', IndianRupee],
  ['Assignments', '/app/assignments', BellRing],
  ['Results', '/app/results', Award],
  ['Timetable', '/app/timetable', CalendarDays],
  ['Notices', '/app/announcements', Megaphone],
];

function name(user) {
  return [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Student';
}

function EmptyState({ children }) {
  return <p className="rounded-xl bg-surface-container-low p-4 text-sm font-semibold text-on-surface-variant">{children}</p>;
}

export default function ParentDashboard({
  dashboard,
  selectedChildId,
  onSelectChild,
  isLoading,
  error,
  onRetry,
}) {
  if (isLoading && !dashboard) {
    return <div className="page-shell"><Card><EmptyState>Loading your family workspace...</EmptyState></Card></div>;
  }

  const children = dashboard?.children || [];
  const child = dashboard?.selectedChild;
  const attendance = dashboard?.attendance?.summary || {};
  const invoices = dashboard?.fees?.invoices || [];
  const receipts = dashboard?.fees?.receipts || [];
  const assignments = dashboard?.assignments || [];
  const results = dashboard?.results || [];
  const notices = dashboard?.notices || [];
  const dueAmount = invoices.reduce((sum, invoice) => sum + Number(invoice.dueAmount || 0), 0);
  const pendingAssignments = assignments.filter((assignment) => !assignment.submissions?.length && new Date(assignment.dueDate) >= new Date());
  const averageScore = results.length
    ? Math.round(results.reduce((sum, result) => sum + Number(result.percentage || 0), 0) / results.length)
    : 0;
  const dayOfWeek = (new Date().getDay() + 6) % 7;
  const todaySchedule = (dashboard?.timetable || []).filter((slot) => slot.dayOfWeek === dayOfWeek);
  const latestAttendance = dashboard?.attendance?.records?.[0];

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Parent Workspace"
        title="Your child at a glance"
        description="Attendance, fees, assignments, published results, timetable, and notices for the selected linked child."
      />

      {error ? (
        <div role="alert" className="flex flex-col gap-3 rounded-xl bg-error-container px-4 py-3 text-sm font-semibold text-on-error-container sm:flex-row sm:items-center sm:justify-between">
          <span>{error}</span>
          <Button size="sm" variant="secondary" icon={RefreshCw} onClick={onRetry}>Retry</Button>
        </div>
      ) : null}

      <Card className="overflow-hidden bg-gradient-to-br from-primary/10 via-surface-container-lowest to-secondary/10">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase text-primary">Linked children</p>
            <h2 className="mt-1 text-xl font-bold text-on-surface sm:text-2xl">{child ? name(child.user) : 'No linked child'}</h2>
            <p className="mt-1 text-sm font-semibold text-on-surface-variant">
              {child?.class ? `Class ${child.class.name} ${child.class.section} / ${child.class.academicYear}` : 'Ask the school administrator to verify and link a student profile.'}
            </p>
          </div>
          {children.length ? (
            <label className="grid gap-1 text-xs font-bold uppercase text-on-surface-variant">
              Select child
              <select
                className="focus-ring min-h-11 min-w-56 rounded-lg border border-outline-variant/70 bg-surface-container-lowest px-4 text-sm font-semibold normal-case text-on-surface"
                value={selectedChildId || child?.id || ''}
                onChange={(event) => onSelectChild(event.target.value)}
              >
                {children.map((item) => (
                  <option key={item.id} value={item.id}>{name(item.user)} / {item.studentCode}</option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
      </Card>

      {!child ? <Card><EmptyState>No active linked child is available for this parent account.</EmptyState></Card> : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard title="Attendance" value={`${attendance.percentage || 0}%`} icon={ClipboardCheck} tone="emerald" />
            <StatCard title="Fee Due" value={formatCurrency(dueAmount)} icon={IndianRupee} tone={dueAmount ? 'rose' : 'emerald'} />
            <StatCard title="Assignments Due" value={pendingAssignments.length.toLocaleString('en-IN')} icon={BellRing} tone="blue" />
            <StatCard title="Published Average" value={results.length ? `${averageScore}%` : 'N/A'} icon={Award} tone="violet" />
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
                <div>
                  <p className="text-xs font-bold uppercase text-primary">Important alerts</p>
                  <h3 className="mt-1 text-lg font-bold text-on-surface">Needs attention</h3>
                </div>
                <BellRing className="h-6 w-6 text-amber-500" />
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-surface-container-low p-4">
                  <p className="text-xs font-bold uppercase text-on-surface-variant">Latest attendance</p>
                  <p className="mt-2 font-bold capitalize text-on-surface">{latestAttendance?.status?.toLowerCase().replaceAll('_', ' ') || 'Not marked yet'}</p>
                </div>
                <div className="rounded-xl bg-surface-container-low p-4">
                  <p className="text-xs font-bold uppercase text-on-surface-variant">Fee balance</p>
                  <p className="mt-2 font-bold text-on-surface">{dueAmount ? formatCurrency(dueAmount) : 'No fee due'}</p>
                </div>
                <div className="rounded-xl bg-surface-container-low p-4">
                  <p className="text-xs font-bold uppercase text-on-surface-variant">Assignments pending</p>
                  <p className="mt-2 font-bold text-on-surface">{pendingAssignments.length || 'None'}</p>
                </div>
                <div className="rounded-xl bg-surface-container-low p-4">
                  <p className="text-xs font-bold uppercase text-on-surface-variant">Latest result</p>
                  <p className="mt-2 font-bold text-on-surface">{results[0] ? `${results[0].subject?.name || 'Subject'}: ${results[0].percentage}%` : 'No result published'}</p>
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-center gap-3">
                <GraduationCap className="h-6 w-6 text-primary" />
                <div>
                  <p className="text-xs font-bold uppercase text-primary">Child profile</p>
                  <h3 className="mt-1 text-lg font-bold text-on-surface">{name(child.user)}</h3>
                </div>
              </div>
              <div className="mt-4 grid gap-2 text-sm">
                {[
                  ['Admission number', child.studentCode],
                  ['Class', child.class ? `${child.class.name} ${child.class.section}` : 'Unassigned'],
                  ['Academic year', child.class?.academicYear],
                  ['Class teacher', child.class?.teacher?.user ? name(child.class.teacher.user) : 'Not assigned'],
                  ['Blood group', child.bloodGroup],
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
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-bold text-on-surface">Today&apos;s timetable</h3>
                <CalendarDays className="h-6 w-6 text-primary" />
              </div>
              <div className="mt-4 space-y-3">
                {todaySchedule.length ? todaySchedule.map((slot) => (
                  <div key={slot.id} className="flex flex-col gap-2 rounded-xl bg-surface-container-low p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-bold text-on-surface">{slot.subject.name}</p>
                      <p className="text-sm font-semibold text-on-surface-variant">{name(slot.teacher.user)} / {slot.room || 'Room TBD'}</p>
                    </div>
                    <Badge tone="blue">{slot.startTime}-{slot.endTime}</Badge>
                  </div>
                )) : <EmptyState>No timetable classes today.</EmptyState>}
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-bold text-on-surface">Recent assignments</h3>
                <BellRing className="h-6 w-6 text-primary" />
              </div>
              <div className="mt-4 space-y-3">
                {assignments.length ? assignments.slice(0, 4).map((assignment) => (
                  <div key={assignment.id} className="rounded-xl bg-surface-container-low p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-bold text-on-surface">{assignment.title}</p>
                      <Badge tone={assignment.submissions?.length ? 'emerald' : 'amber'}>{assignment.submissions?.[0]?.status || 'Pending'}</Badge>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-on-surface-variant">{assignment.subject.name} / Due {String(assignment.dueDate).slice(0, 10)}</p>
                  </div>
                )) : <EmptyState>No assignments for this child.</EmptyState>}
              </div>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-bold text-on-surface">Fees and receipts</h3>
                <IndianRupee className="h-6 w-6 text-primary" />
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-surface-container-low p-4">
                  <p className="text-xs font-bold uppercase text-on-surface-variant">Invoices</p>
                  <p className="mt-2 text-xl font-bold text-on-surface">{invoices.length}</p>
                </div>
                <div className="rounded-xl bg-surface-container-low p-4">
                  <p className="text-xs font-bold uppercase text-on-surface-variant">Receipts available</p>
                  <p className="mt-2 text-xl font-bold text-on-surface">{receipts.length}</p>
                </div>
              </div>
              <Link to="/app/fees"><Button className="mt-4 w-full sm:w-auto" variant="secondary" icon={Download}>View payments and receipts</Button></Link>
            </Card>

            <Card>
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-bold text-on-surface">Relevant notices</h3>
                <Megaphone className="h-6 w-6 text-primary" />
              </div>
              <div className="mt-4 space-y-3">
                {notices.length ? notices.slice(0, 4).map((notice) => (
                  <div key={notice.id} className="rounded-xl bg-surface-container-low p-4">
                    <p className="font-bold text-on-surface">{notice.title}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-on-surface-variant">{notice.content}</p>
                  </div>
                )) : <EmptyState>No relevant notices.</EmptyState>}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
