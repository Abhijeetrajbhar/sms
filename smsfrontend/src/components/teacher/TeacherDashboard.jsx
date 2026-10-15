import {
  Award,
  BellRing,
  BookOpen,
  CalendarCheck,
  CalendarDays,
  ClipboardCheck,
  Clock3,
  GraduationCap,
  Layers,
  RefreshCw,
  Sparkles,
  UserCheck,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import PageHeader from '../common/PageHeader.jsx';
import StatCard from '../common/StatCard.jsx';
import Card from '../ui/Card.jsx';
import Badge from '../ui/Badge.jsx';
import Button from '../ui/Button.jsx';

function classLabel(item) {
  return item ? `${item.name}${item.section ? ` ${item.section}` : ''}` : 'Assigned Class';
}

function EmptyFeed({ message }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.08] bg-black/20 py-8 px-4 text-center">
      <p className="font-mono text-xs text-slate-500">{message}</p>
    </div>
  );
}

export default function TeacherDashboard({ dashboard, currentUser, isLoading, error, onRetry }) {
  const assignedClasses = dashboard?.assignedClasses || [];
  const assignedSubjects = dashboard?.assignedSubjects || [];
  const todayTimetable = dashboard?.todayTimetable || [];
  const pendingSubmissions = dashboard?.pendingSubmissions || [];
  const attendance = dashboard?.attendance || {};
  const profile = dashboard?.profile;

  const quickActions = [
    { label: 'Mark Attendance', path: '/app/attendance', icon: ClipboardCheck },
    { label: 'Create Assignment', path: '/app/assignments', icon: BellRing },
    { label: 'Record Marks', path: '/app/results', icon: Award },
    { label: 'Student Roster', path: '/app/students', icon: Users },
    { label: 'Class Timetable', path: '/app/timetable', icon: CalendarDays },
  ];

  if (isLoading && !dashboard) {
    return (
      <div className="page-shell">
        <Card className="flex items-center justify-center py-16">
          <div className="flex items-center gap-3 font-mono text-xs text-slate-400">
            <RefreshCw className="h-4 w-4 animate-spin text-indigo-400" />
            Loading faculty cockpit...
          </div>
        </Card>
      </div>
    );
  }

  const teacherName = profile?.user?.firstName || currentUser?.name || 'Faculty Member';

  return (
    <div className="page-shell space-y-6">
      <PageHeader
        eyebrow="Educator Cockpit"
        title={`Welcome back, ${teacherName}`}
        description="Assigned classes, daily lecture timetable, roll-call records, and assignment evaluation queues."
      />

      {error ? (
        <div role="alert" className="flex flex-col gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 font-mono text-xs text-rose-300 sm:flex-row sm:items-center sm:justify-between">
          <span>{error}</span>
          <Button size="sm" variant="secondary" icon={RefreshCw} onClick={onRetry}>Retry</Button>
        </div>
      ) : null}

      {/* KPI Telemetry Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Assigned Classes"
          value={assignedClasses.length}
          icon={BookOpen}
          tone="violet"
        />
        <StatCard
          title="Enrolled Learners"
          value={dashboard?.studentCount || 0}
          icon={GraduationCap}
          tone="blue"
        />
        <StatCard
          title="Today Roll-Call"
          value={`${attendance.percentage || 0}%`}
          icon={ClipboardCheck}
          tone="emerald"
        />
        <StatCard
          title="Pending Reviews"
          value={pendingSubmissions.length}
          icon={BellRing}
          tone="amber"
        />
      </div>

      {/* Command Palette Action Bar */}
      <Card className="p-4 sm:p-5">
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] mb-4">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <p className="font-mono text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Teaching Actions
            </p>
          </div>
          <span className="font-mono text-[11px] text-slate-500">Quick Access</span>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-5">
          {quickActions.map(({ label, path, icon: Icon }) => (
            <Link key={label} to={path} className="group">
              <div className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 transition hover:border-indigo-500/40 hover:bg-indigo-500/10">
                <div className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-300 group-hover:text-indigo-400">
                  <Icon className="h-4 w-4" />
                </div>
                <span className="truncate text-xs font-semibold text-slate-200 group-hover:text-white">
                  {label}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </Card>

      {/* Timetable Schedule & Faculty Profile Details */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(300px,0.7fr)]">
        {/* Today's Schedule */}
        <Card className="p-5">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 mb-4">
            <div className="flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-indigo-400" />
              <h3 className="font-display text-base font-bold text-white">Today's Class Schedule</h3>
            </div>
            <Link to="/app/timetable" className="font-mono text-[11px] text-indigo-400 hover:underline">
              Full Week Timetable
            </Link>
          </div>

          <div className="space-y-3">
            {todayTimetable.length > 0 ? (
              todayTimetable.map((slot) => (
                <div
                  key={slot.id}
                  className="flex flex-col gap-3 rounded-xl border border-white/[0.08] bg-black/20 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[11px] rounded border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 text-indigo-300 font-semibold">
                        {slot.startTime} - {slot.endTime}
                      </span>
                      <span className="font-mono text-[11px] rounded border border-white/10 bg-white/[0.04] px-2 py-0.5 text-slate-300">
                        {classLabel(slot.class)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-bold text-white">{slot.subject?.name || 'Subject'}</p>
                    <p className="font-mono text-xs text-slate-400">Location: {slot.room || 'Room not assigned'}</p>
                  </div>
                  <Link to="/app/attendance">
                    <Button size="sm" variant="secondary" icon={ClipboardCheck}>
                      Mark Roll
                    </Button>
                  </Link>
                </div>
              ))
            ) : (
              <EmptyFeed message="No classes scheduled on your timetable today." />
            )}
          </div>
        </Card>

        {/* Faculty Profile Card */}
        <Card className="p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 mb-4">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-emerald-400" />
                <h3 className="font-display text-base font-bold text-white">Faculty Credentials</h3>
              </div>
              <span className="font-mono text-[10px] rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-emerald-400">
                ACTIVE
              </span>
            </div>

            <div className="space-y-3">
              {[
                { label: 'Employee ID', value: profile?.employeeCode },
                { label: 'Specialization', value: profile?.specialization },
                { label: 'Academic Qualification', value: profile?.qualification },
                { label: 'Teaching Experience', value: profile?.experience ? `${profile.experience} Years` : null },
              ].map((item, idx) => (
                <div key={idx} className="rounded-xl border border-white/[0.06] bg-black/20 p-3">
                  <p className="font-mono text-[10px] uppercase text-slate-500">{item.label}</p>
                  <p className="mt-0.5 text-xs font-semibold text-slate-200">
                    {item.value || 'Not registered'}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 border-t border-white/[0.06] pt-3 font-mono text-[11px] text-slate-500">
            Account verified: {currentUser?.email}
          </div>
        </Card>
      </div>

      {/* Assigned Classes and Subjects Matrix */}
      <Card className="p-5">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-sky-400" />
            <h3 className="font-display text-base font-bold text-white">Assigned Classes & Subjects</h3>
          </div>
          <span className="font-mono text-xs text-slate-500">{assignedSubjects.length} Allocations</span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {assignedSubjects.length > 0 ? (
            assignedSubjects.map((assignment) => {
              const isClassTeacher = assignedClasses.some(
                (c) => c.id === assignment.class?.id && c.isClassTeacher
              );
              return (
                <div
                  key={assignment.id}
                  className="flex flex-col justify-between rounded-xl border border-white/[0.08] bg-black/20 p-4 transition hover:border-white/20"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold text-white">{assignment.subject?.name}</p>
                      <span
                        className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded border ${
                          isClassTeacher
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                            : 'border-sky-500/30 bg-sky-500/10 text-sky-300'
                        }`}
                      >
                        {isClassTeacher ? 'Class Lead' : 'Subject Faculty'}
                      </span>
                    </div>
                    <p className="mt-2 font-mono text-xs text-slate-400">
                      {classLabel(assignment.class)}
                    </p>
                    <p className="font-mono text-[11px] text-slate-500">
                      Term: {assignment.class?.academicYear || 'Current Year'}
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full">
              <EmptyFeed message="No classes or subjects currently assigned to your roster." />
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
