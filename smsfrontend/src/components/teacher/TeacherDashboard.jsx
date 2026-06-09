import {
  Award,
  BellRing,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  Clock3,
  GraduationCap,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import PageHeader from '../common/PageHeader.jsx';
import StatCard from '../common/StatCard.jsx';
import Badge from '../ui/Badge.jsx';
import Card from '../ui/Card.jsx';
import Button from '../ui/Button.jsx';

function classLabel(item) {
  return item ? `${item.name}${item.section ? ` ${item.section}` : ''}` : 'Assigned class';
}

function EmptyState({ children }) {
  return <p className="rounded-xl border border-dashed border-outline-variant/60 bg-surface-container-low px-4 py-6 text-center text-sm font-semibold text-on-surface-variant">{children}</p>;
}

export default function TeacherDashboard({ dashboard, currentUser, isLoading }) {
  const assignedClasses = dashboard?.assignedClasses || [];
  const assignedSubjects = dashboard?.assignedSubjects || [];
  const todayTimetable = dashboard?.todayTimetable || [];
  const recentAssignments = dashboard?.recentAssignments || [];
  const notices = dashboard?.notices || [];
  const pendingAttendance = dashboard?.pendingAttendance || [];
  const pendingSubmissions = dashboard?.pendingSubmissions || [];
  const marksTasks = dashboard?.marksTasks || [];
  const attendance = dashboard?.attendance || {};

  const quickActions = [
    [ClipboardCheck, 'Mark Attendance', '/app/attendance'],
    [BellRing, 'Create Assignment', '/app/assignments'],
    [Award, 'Fill Marks', '/app/results'],
    [Users, 'View Students', '/app/students'],
    [CalendarDays, 'View Timetable', '/app/timetable'],
  ];

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Teacher workspace"
        title={`Good day, ${dashboard?.profile?.user?.firstName || currentUser?.name || 'Teacher'}`}
        description="Your classes, subjects, teaching tasks, and schedule. Only records assigned to you are shown."
      />

      {!dashboard && !isLoading ? (
        <Card><EmptyState>No active classes or subjects are assigned to this teacher profile yet.</EmptyState></Card>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Assigned Classes" value={assignedClasses.length} icon={BookOpen} tone="violet" />
        <StatCard title="My Students" value={dashboard?.studentCount || 0} icon={GraduationCap} tone="blue" />
        <StatCard title="Attendance Today" value={`${attendance.percentage || 0}%`} icon={ClipboardCheck} tone="emerald" />
        <StatCard title="Pending Reviews" value={pendingSubmissions.length} icon={BellRing} tone="amber" />
      </div>

      <Card>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase text-primary">Quick actions</p>
            <h2 className="mt-1 text-lg font-bold text-on-surface">Continue your teaching workflow</h2>
          </div>
          <div className="grid gap-2 min-[425px]:grid-cols-2 sm:grid-cols-3 xl:flex">
            {quickActions.map(([Icon, label, path]) => (
              <Link key={label} to={path} className="min-w-0">
                <Button className="w-full" variant="secondary" icon={Icon}>{label}</Button>
              </Link>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,.8fr)]">
        <Card>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div><p className="text-xs font-bold uppercase text-primary">Today</p><h2 className="mt-1 text-lg font-bold text-on-surface">My timetable</h2></div>
            <Clock3 className="h-6 w-6 text-primary" />
          </div>
          <div className="space-y-3">
            {todayTimetable.length ? todayTimetable.map((slot) => (
              <div key={slot.id} className="flex flex-col gap-3 rounded-xl border border-outline-variant/40 bg-surface-container-low p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><Badge tone="blue">{slot.startTime}-{slot.endTime}</Badge><Badge tone="violet">{classLabel(slot.class)}</Badge></div>
                  <p className="mt-2 font-bold text-on-surface">{slot.subject?.name || 'Subject'}</p>
                  <p className="text-sm text-on-surface-variant">{slot.room || 'Room not assigned'}</p>
                </div>
                <Link to="/app/attendance"><Button size="sm" variant="secondary">Mark Attendance</Button></Link>
              </div>
            )) : <EmptyState>No timetable classes today.</EmptyState>}
          </div>
        </Card>

        <Card>
          <p className="text-xs font-bold uppercase text-primary">Teacher profile</p>
          <h2 className="mt-1 text-lg font-bold text-on-surface">{currentUser?.name}</h2>
          <div className="mt-4 grid gap-3">
            {[
              ['Employee ID', dashboard?.profile?.employeeCode],
              ['Specialization', dashboard?.profile?.specialization],
              ['Qualification', dashboard?.profile?.qualification],
              ['Experience', dashboard?.profile?.experience !== null && dashboard?.profile?.experience !== undefined ? `${dashboard.profile.experience} years` : null],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-surface-container-low p-3">
                <p className="text-xs font-bold uppercase text-on-surface-variant">{label}</p>
                <p className="mt-1 font-semibold text-on-surface">{value || 'Not provided'}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="text-lg font-bold text-on-surface">Assigned classes and subjects</h2>
          <div className="mt-4 space-y-3">
            {assignedSubjects.length ? assignedSubjects.map((assignment) => (
              <div key={assignment.id} className="flex flex-col gap-2 rounded-xl bg-surface-container-low p-4 sm:flex-row sm:items-center sm:justify-between">
                <div><p className="font-bold text-on-surface">{assignment.subject?.name}</p><p className="text-sm text-on-surface-variant">{classLabel(assignment.class)} / {assignment.class?.academicYear}</p></div>
                <Badge tone={assignedClasses.find((item) => item.id === assignment.class?.id)?.isClassTeacher ? 'emerald' : 'blue'}>
                  {assignedClasses.find((item) => item.id === assignment.class?.id)?.isClassTeacher ? 'Class teacher' : 'Subject teacher'}
                </Badge>
              </div>
            )) : <EmptyState>No subjects assigned.</EmptyState>}
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-bold text-on-surface">Pending teaching tasks</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-amber-50 p-4 text-amber-800"><p className="text-xs font-bold uppercase">Attendance</p><p className="mt-2 text-2xl font-extrabold">{pendingAttendance.length}</p></div>
            <div className="rounded-xl bg-primary/10 p-4 text-primary"><p className="text-xs font-bold uppercase">Submissions</p><p className="mt-2 text-2xl font-extrabold">{pendingSubmissions.length}</p></div>
            <div className="rounded-xl bg-emerald-50 p-4 text-emerald-800"><p className="text-xs font-bold uppercase">Marks groups</p><p className="mt-2 text-2xl font-extrabold">{marksTasks.filter((item) => item.status !== 'LOCKED').length}</p></div>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="text-lg font-bold text-on-surface">My recent assignments</h2>
          <div className="mt-4 space-y-3">
            {recentAssignments.length ? recentAssignments.map((assignment) => (
              <div key={assignment.id} className="rounded-xl border border-outline-variant/40 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2"><Badge tone="blue">{assignment.subject?.name}</Badge><Badge tone={assignment.isPublished ? 'emerald' : 'amber'}>{assignment.isPublished ? 'Published' : 'Draft'}</Badge></div>
                <p className="mt-3 font-bold text-on-surface">{assignment.title}</p>
                <p className="mt-1 text-sm text-on-surface-variant">{classLabel(assignment.class)} / Due {String(assignment.dueDate).slice(0, 10)}</p>
              </div>
            )) : <EmptyState>No assignments created yet.</EmptyState>}
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-bold text-on-surface">Relevant notices</h2>
          <div className="mt-4 space-y-3">
            {notices.length ? notices.map((notice) => (
              <div key={notice.id} className="rounded-xl border border-outline-variant/40 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2"><Badge tone="amber">{notice.target}</Badge><span className="text-xs font-semibold text-on-surface-variant">{String(notice.createdAt).slice(0, 10)}</span></div>
                <p className="mt-3 font-bold text-on-surface">{notice.title}</p>
                <p className="mt-1 line-clamp-2 text-sm leading-6 text-on-surface-variant">{notice.content}</p>
              </div>
            )) : <EmptyState>No relevant notices.</EmptyState>}
          </div>
        </Card>
      </div>
    </div>
  );
}
