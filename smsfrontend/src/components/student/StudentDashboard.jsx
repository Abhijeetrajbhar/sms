import {
  Award,
  BellRing,
  BookOpen,
  CalendarCheck,
  CalendarDays,
  ClipboardCheck,
  Clock3,
  CreditCard,
  GraduationCap,
  IndianRupee,
  Megaphone,
  RefreshCw,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import PageHeader from '../common/PageHeader.jsx';
import StatCard from '../common/StatCard.jsx';
import Card from '../ui/Card.jsx';
import Badge from '../ui/Badge.jsx';
import Button from '../ui/Button.jsx';
import { formatCurrency } from '../../utils/formatters.js';

function studentFullName(user) {
  return [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Learner';
}

function EmptyFeed({ message }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.08] bg-black/20 py-8 px-4 text-center">
      <p className="font-mono text-xs text-slate-500">{message}</p>
    </div>
  );
}

export default function StudentDashboard({ dashboard, isLoading, error, onRetry }) {
  if (isLoading && !dashboard) {
    return (
      <div className="page-shell">
        <Card className="flex items-center justify-center py-16">
          <div className="flex items-center gap-3 font-mono text-xs text-slate-400">
            <RefreshCw className="h-4 w-4 animate-spin text-indigo-400" />
            Loading student portal...
          </div>
        </Card>
      </div>
    );
  }

  const profile = dashboard?.profile;
  const attendance = dashboard?.attendance?.summary || {};
  const assignments = dashboard?.assignments || [];
  const results = dashboard?.results || [];
  const invoices = dashboard?.fees?.invoices || [];
  const notices = dashboard?.notices || [];

  const dueAmount = invoices.reduce((sum, invoice) => sum + Number(invoice.dueAmount || 0), 0);
  const pendingAssignments = assignments.filter(
    (assignment) => !assignment.submissions?.length && new Date(assignment.dueDate) >= new Date()
  );
  const averageScore = results.length
    ? Math.round(results.reduce((sum, result) => sum + Number(result.percentage || 0), 0) / results.length)
    : 0;

  const dayOfWeek = (new Date().getDay() + 6) % 7;
  const todaySchedule = (dashboard?.timetable || []).filter((slot) => slot.dayOfWeek === dayOfWeek);

  const quickActions = [
    { label: 'Attendance', path: '/app/attendance', icon: ClipboardCheck },
    { label: 'Assignments', path: '/app/assignments', icon: BellRing },
    { label: 'My Grades', path: '/app/results', icon: Award },
    { label: 'Class Schedule', path: '/app/timetable', icon: CalendarDays },
    { label: 'Announcements', path: '/app/announcements', icon: Megaphone },
    { label: 'Fee Invoices', path: '/app/fees', icon: CreditCard },
  ];

  return (
    <div className="page-shell space-y-6">
      <PageHeader
        eyebrow="Student Portal"
        title={`Welcome, ${studentFullName(profile?.user)}`}
        description="View your daily schedule, exam results, pending assignments, and school announcements."
      />

      {error ? (
        <div role="alert" className="flex flex-col gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 font-mono text-xs text-rose-300 sm:flex-row sm:items-center sm:justify-between">
          <span>{error}</span>
          <Button size="sm" variant="secondary" icon={RefreshCw} onClick={onRetry}>Retry</Button>
        </div>
      ) : null}

      {!profile ? (
        <Card>
          <EmptyFeed message="No active student profile is linked to this account. Contact your school administrator." />
        </Card>
      ) : (
        <>
          {/* Student Status Badge Header */}
          <Card className="relative overflow-hidden p-5 border border-white/[0.12] bg-[#0c0f17]">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="grid h-12 w-12 place-items-center rounded-xl border border-indigo-500/30 bg-indigo-500/15 text-indigo-400">
                  <GraduationCap className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-white">
                      {profile.class ? `Class ${profile.class.name} ${profile.class.section}` : 'Unassigned Class'}
                    </h2>
                    <span className="font-mono text-[10px] rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-emerald-400">
                      ENROLLED
                    </span>
                  </div>
                  <p className="font-mono text-xs text-slate-400 mt-0.5">
                    Admission ID: {profile.studentCode} • Academic Year: {profile.class?.academicYear || 'Current Year'}
                  </p>
                </div>
              </div>

              <div className="font-mono text-xs text-slate-400">
                Class Mentor: <span className="font-bold text-white">{profile.class?.teacher?.user ? studentFullName(profile.class.teacher.user) : 'Faculty Lead'}</span>
              </div>
            </div>
          </Card>

          {/* Metric Telemetry Row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Attendance Rate"
              value={`${attendance.percentage || 0}%`}
              icon={ClipboardCheck}
              tone="emerald"
            />
            <StatCard
              title="Pending Homework"
              value={pendingAssignments.length}
              icon={BellRing}
              tone="blue"
            />
            <StatCard
              title="Term GPA Average"
              value={results.length ? `${averageScore}%` : 'N/A'}
              icon={Award}
              tone="violet"
            />
            <StatCard
              title="Tuition Balance"
              value={formatCurrency(dueAmount)}
              icon={IndianRupee}
              tone={dueAmount > 0 ? 'rose' : 'emerald'}
            />
          </div>

          {/* Quick Cockpit Launchers */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            {quickActions.map(({ label, path, icon: Icon }) => (
              <Link key={label} to={path}>
                <Card hover className="flex flex-col items-center justify-center gap-2 p-4 text-center">
                  <div className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-indigo-400">
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-200">{label}</span>
                </Card>
              </Link>
            ))}
          </div>

          {/* Timetable Schedule & Profile Identity */}
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)]">
            {/* Today's Schedule */}
            <Card className="p-5">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <Clock3 className="h-4 w-4 text-indigo-400" />
                  <h3 className="font-display text-base font-bold text-white">Today's Class Periods</h3>
                </div>
                <Link to="/app/timetable" className="font-mono text-[11px] text-indigo-400 hover:underline">
                  View Timetable
                </Link>
              </div>

              <div className="space-y-3">
                {todaySchedule.length > 0 ? (
                  todaySchedule.map((slot) => (
                    <div
                      key={slot.id}
                      className="flex flex-col gap-2 rounded-xl border border-white/[0.08] bg-black/20 p-3.5 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="text-sm font-bold text-white">{slot.subject?.name || 'Subject'}</p>
                        <p className="font-mono text-xs text-slate-400">
                          Faculty: {studentFullName(slot.teacher?.user)} • {slot.room || 'Room TBD'}
                        </p>
                      </div>
                      <span className="font-mono text-xs font-semibold rounded border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-1 text-indigo-300">
                        {slot.startTime} - {slot.endTime}
                      </span>
                    </div>
                  ))
                ) : (
                  <EmptyFeed message="No academic lectures scheduled for today." />
                )}
              </div>
            </Card>

            {/* Profile Identity Card */}
            <Card className="p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <UserRound className="h-4 w-4 text-sky-400" />
                    <h3 className="font-display text-base font-bold text-white">Student Record</h3>
                  </div>
                  <span className="font-mono text-[11px] text-slate-500">ID: {profile.studentCode}</span>
                </div>

                <div className="space-y-2.5 font-mono text-xs">
                  {[
                    { label: 'Assigned Classroom', value: profile.class?.room || 'Building A' },
                    { label: 'Homeroom Lead', value: profile.class?.teacher?.user ? studentFullName(profile.class.teacher.user) : 'Unassigned' },
                    { label: 'Emergency Blood Group', value: profile.bloodGroup || 'Not provided' },
                    { label: 'Published Exams', value: `${results.length} Completed` },
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-black/20 p-2.5">
                      <span className="text-slate-400">{item.label}</span>
                      <span className="font-bold text-white">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 border-t border-white/[0.06] pt-3 font-mono text-[11px] text-slate-500">
                Session security: Verified learner token
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
