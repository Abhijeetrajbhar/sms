import { AlertTriangle, BarChart3, BrainCircuit, ClipboardCheck, GraduationCap, IndianRupee, Users } from 'lucide-react';
import PageHeader from '../components/common/PageHeader.jsx';
import StatCard from '../components/common/StatCard.jsx';
import Card from '../components/ui/Card.jsx';
import Badge from '../components/ui/Badge.jsx';
import Donut from '../components/charts/Donut.jsx';
import ProgressBar from '../components/ui/ProgressBar.jsx';
import { useApp } from '../context/AppContext.jsx';
import { formatCurrency, percentage } from '../utils/formatters.js';
import { riskTone } from '../utils/statusStyles.js';
import { getScopedStudent, getStudentFees, getStudentResults } from '../utils/studentScope.js';
import TeacherDashboard from '../components/teacher/TeacherDashboard.jsx';
import ParentDashboard from '../components/parent/ParentDashboard.jsx';
import StudentDashboard from '../components/student/StudentDashboard.jsx';
import AdminDashboard from '../components/admin/AdminDashboard.jsx';

function average(values) {
  const cleanValues = values.map(Number).filter((value) => Number.isFinite(value));
  if (!cleanValues.length) return 0;
  return Math.round(cleanValues.reduce((sum, value) => sum + value, 0) / cleanValues.length);
}

function statusBreakdown(rows = []) {
  return rows.reduce((summary, row) => {
    const key = String(row.status || 'unknown').toLowerCase();
    return { ...summary, [key]: (summary[key] || 0) + 1 };
  }, {});
}

export default function DashboardPage() {
  const { data, currentRole, currentUser, isDataLoading, dataError, retryData, selectedChildId, setSelectedChildId } = useApp();
  if (currentRole === 'ADMIN') {
    return <AdminDashboard dashboard={data.dashboardAnalytics} currentUser={currentUser} isLoading={isDataLoading} error={dataError} onRetry={retryData} />;
  }
  if (currentRole === 'TEACHER') {
    return <TeacherDashboard dashboard={data.teacherDashboard} currentUser={currentUser} isLoading={isDataLoading} />;
  }
  if (currentRole === 'PARENT') {
    return (
      <ParentDashboard
        dashboard={data.parentDashboard}
        selectedChildId={selectedChildId}
        onSelectChild={setSelectedChildId}
        isLoading={isDataLoading}
        error={dataError}
        onRetry={retryData}
      />
    );
  }
  if (currentRole === 'STUDENT') {
    return (
      <StudentDashboard
        dashboard={data.studentDashboard}
        isLoading={isDataLoading}
        error={dataError}
        onRetry={retryData}
      />
    );
  }
  const analytics = data.dashboardAnalytics || {};
  const scopedStudent = getScopedStudent(data, currentUser, currentRole);
  const scopedResults = getStudentResults(data, scopedStudent);
  const scopedFees = getStudentFees(data, scopedStudent);
  const scopedAssignments = data.assignments.filter((item) => !scopedStudent?.className || item.className === scopedStudent.className);
  const isPersonalRole = ['STUDENT', 'PARENT'].includes(currentRole);
  const visibleFees = isPersonalRole ? scopedFees : data.fees;
  const collected = visibleFees.reduce((sum, fee) => sum + Number(fee.paid || 0), 0);
  const totalFee = visibleFees.reduce((sum, fee) => sum + Number(fee.amount || 0), 0);

  const attendanceRows = data.attendance?.today || [];
  const localAttendance = statusBreakdown(attendanceRows);
  const localAttendanceRate = average(data.students.map((student) => student.attendance));
  const attendanceRate = analytics.attendance?.percentage ?? analytics.attendanceOverview?.percentage ?? localAttendanceRate;
  const feeCollectionRate = analytics.fees?.collectionRate ?? percentage(collected, totalFee);
  const totalStudents = analytics.totals?.students ?? data.students.length;
  const totalTeachers = analytics.totals?.teachers ?? data.teachers.length;
  const totalClasses = analytics.totals?.classes ?? data.classes.length;
  const atRiskStudents = data.students.filter((item) => item.risk && item.risk !== 'low').length;
  const attendanceBreakdown = analytics.attendance || analytics.attendanceOverview || localAttendance;
  const attendanceTotal = Object.entries(attendanceBreakdown)
    .filter(([key]) => !['percentage', 'total'].includes(key))
    .reduce((sum, [, value]) => sum + Number(value || 0), 0);
  const riskStudents = data.students.filter((item) => item.risk && item.risk !== 'low').slice(0, 4);

  const roleCopy = {
    ADMIN: {
      title: 'Institution operations overview',
      description: 'Live school records from attendance, students, teachers, fees, classes, and risk indicators.',
    },
    TEACHER: {
      title: 'Teaching and class performance',
      description: 'Current class, assignment, attendance, and student support indicators.',
    },
    STUDENT: {
      title: 'Your academic progress',
      description: 'Your attendance, assignments, results, and fee status from your student record.',
    },
    PARENT: {
      title: 'Your child progress overview',
      description: 'Current attendance, results, assignments, and fee status for your linked child.',
    },
  };

  const roleStats = {
    ADMIN: [
      ['Students', totalStudents.toLocaleString('en-IN'), GraduationCap, 'blue'],
      ['Teachers', totalTeachers.toLocaleString('en-IN'), Users, 'violet'],
      ['Attendance', `${attendanceRate}%`, ClipboardCheck, 'emerald'],
      ['Risk Alerts', atRiskStudents.toLocaleString('en-IN'), AlertTriangle, 'rose'],
    ],
    TEACHER: [
      ['Assigned Classes', (analytics.assignedClasses?.length ?? data.classes.length).toLocaleString('en-IN'), Users, 'violet'],
      ['Assignments', (analytics.totalAssignments ?? data.assignments.filter((item) => item.status === 'active').length).toLocaleString('en-IN'), GraduationCap, 'blue'],
      ['Attendance', `${attendanceRate}%`, ClipboardCheck, 'emerald'],
      ['At Risk', atRiskStudents.toLocaleString('en-IN'), AlertTriangle, 'rose'],
    ],
    STUDENT: [
      ['Attendance', `${analytics.attendance?.percentage ?? scopedStudent?.attendance ?? 0}%`, ClipboardCheck, 'emerald'],
      ['Assignments Due', (analytics.assignments?.missing ?? scopedAssignments.filter((item) => item.status === 'active').length).toLocaleString('en-IN'), GraduationCap, 'blue'],
      ['Average Score', `${analytics.academic?.averageScore ?? scopedResults[0]?.total ?? 'N/A'}`, BarChart3, 'violet'],
      ['Fee Status', scopedFees[0]?.status || 'pending', IndianRupee, 'amber'],
    ],
    PARENT: [
      ['Child Attendance', `${analytics.children?.[0]?.attendancePercentage ?? scopedStudent?.attendance ?? 0}%`, ClipboardCheck, 'emerald'],
      ['Assignments Due', scopedAssignments.filter((item) => item.status === 'active').length.toLocaleString('en-IN'), GraduationCap, 'blue'],
      ['Average Score', `${analytics.children?.[0]?.averageScore ?? scopedResults[0]?.total ?? 'N/A'}`, BarChart3, 'violet'],
      ['Pending Fees', scopedFees.filter((item) => item.status !== 'paid').length.toLocaleString('en-IN'), IndianRupee, 'amber'],
    ],
  };

  const performanceMetrics = [
    {
      label: 'Enrollment',
      value: totalStudents.toLocaleString('en-IN'),
      caption: `${totalClasses} classes`,
      progress: totalClasses ? Math.min(100, Math.round((totalStudents / Math.max(totalClasses * 40, 1)) * 100)) : 0,
      tone: 'blue',
      pill: 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-indigo-100',
    },
    {
      label: 'Attendance',
      value: `${attendanceRate}%`,
      caption: `${attendanceTotal} records`,
      progress: attendanceRate,
      tone: 'emerald',
      pill: 'bg-emerald-50 text-tertiary dark:bg-emerald-400/15 dark:text-emerald-100',
    },
    {
      label: 'Fee Collection',
      value: `${feeCollectionRate}%`,
      caption: formatCurrency(collected),
      progress: feeCollectionRate,
      tone: 'amber',
      pill: 'bg-amber-50 text-amber-700 dark:bg-amber-400/15 dark:text-amber-100',
    },
  ];

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow={`${currentRole} Workspace`}
        title={(roleCopy[currentRole] || roleCopy.ADMIN).title}
        description={(roleCopy[currentRole] || roleCopy.ADMIN).description}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={data.dashboardAnalytics ? 'emerald' : 'amber'}>
          {data.dashboardAnalytics ? 'Live analytics' : 'Record-derived fallback'}
        </Badge>
        {isDataLoading ? <Badge tone="blue">Refreshing</Badge> : null}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {(roleStats[currentRole] || roleStats.ADMIN).map(([title, value, Icon, tone]) => (
          <StatCard key={title} title={title} value={value} icon={Icon} tone={tone} />
        ))}
      </div>

      <div className={currentRole === 'STUDENT' ? 'grid gap-4' : 'grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(280px,.85fr)]'}>
        {currentRole !== 'STUDENT' ? (
          <Card className="overflow-hidden p-0">
            <div className="border-b border-outline-variant/40 px-4 py-4 dark:border-white/10 sm:px-5">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <p className="text-xs font-bold uppercase text-primary dark:text-indigo-200">Performance pulse</p>
                  <h3 className="mt-1 text-lg font-bold text-on-surface dark:text-white">Current KPI Snapshot</h3>
                </div>
                <Badge tone="blue">Auto refresh</Badge>
              </div>
            </div>
            <div className="grid grid-cols-1 divide-y divide-outline-variant/40 dark:divide-white/10 md:grid-cols-3 md:divide-x md:divide-y-0">
              {performanceMetrics.map((metric) => (
                <div key={metric.label} className="min-w-0 p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-on-surface-variant dark:text-slate-300">{metric.label}</p>
                      <p className="mt-1 truncate text-2xl font-bold text-on-surface dark:text-white">{metric.value}</p>
                    </div>
                    <span className={`max-w-[8rem] shrink-0 truncate rounded-full px-2.5 py-1 text-[11px] font-bold ${metric.pill}`}>{metric.caption}</span>
                  </div>
                  <div className="mt-5">
                    <ProgressBar value={metric.progress} tone={metric.tone} className="h-2.5 bg-surface-container-high dark:bg-white/10" />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ) : null}

        <Card>
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase text-primary">{currentRole === 'ADMIN' ? 'Financial view' : 'Account status'}</p>
              <h3 className="mt-1 text-lg font-bold text-on-surface dark:text-white">{currentRole === 'ADMIN' ? 'Term Fee Collection' : 'Fee Progress'}</h3>
            </div>
            <IndianRupee className="h-7 w-7 shrink-0 text-amber-500" />
          </div>
          <div className="mt-6 flex items-center justify-center">
            <Donut value={percentage(collected, totalFee)} label="Collected" stroke="#f59e0b" />
          </div>
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-emerald-50 p-4 ring-1 ring-emerald-100 dark:bg-emerald-400/10 dark:ring-emerald-300/20">
              <p className="text-xs font-bold uppercase text-emerald-600 dark:text-emerald-200">Collected</p>
              <p className="mt-2 text-lg font-bold text-on-surface dark:text-white">{formatCurrency(collected)}</p>
            </div>
            <div className="rounded-xl bg-amber-50 p-4 ring-1 ring-amber-100 dark:bg-amber-400/10 dark:ring-amber-300/20">
              <p className="text-xs font-bold uppercase text-amber-600 dark:text-amber-200">Pending</p>
              <p className="mt-2 text-lg font-bold text-on-surface dark:text-white">{formatCurrency(totalFee - collected)}</p>
            </div>
          </div>
        </Card>
      </div>

      {currentRole !== 'STUDENT' ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase text-primary">Student support</p>
                <h3 className="mt-1 text-lg font-bold text-on-surface dark:text-white">Current risk indicators</h3>
              </div>
              <BrainCircuit className="h-7 w-7 shrink-0 text-violet-500" />
            </div>
            <div className="mt-5 space-y-3">
              {riskStudents.length ? riskStudents.map((item) => (
                <div key={item.id} className="rounded-xl border border-outline-variant/40 bg-surface-container-low p-4 dark:border-white/10 dark:bg-white/5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-semibold text-on-surface dark:text-white">{item.name}</h4>
                        <Badge className={riskTone[item.risk]}>{item.risk} risk</Badge>
                      </div>
                      <p className="mt-1 text-sm text-on-surface-variant dark:text-slate-300">{item.className} / Attendance {item.attendance}%</p>
                    </div>
                    <Badge tone={item.attendance < 70 ? 'rose' : 'amber'}>{item.grade}</Badge>
                  </div>
                </div>
              )) : (
                <p className="rounded-xl bg-surface-container-low p-4 text-sm font-semibold text-on-surface-variant dark:bg-white/5 dark:text-slate-300">No current risk records found.</p>
              )}
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase text-primary">Today</p>
                <h3 className="mt-1 text-lg font-bold text-on-surface dark:text-white">Attendance Snapshot</h3>
              </div>
              <BarChart3 className="h-7 w-7 shrink-0 text-oryx-500" />
            </div>
            <div className="mt-5 space-y-4">
              {Object.entries(attendanceBreakdown)
                .filter(([label]) => !['percentage', 'total'].includes(label))
                .map(([label, value]) => (
                  <div key={label}>
                    <div className="mb-2 flex justify-between gap-3 text-sm font-semibold capitalize text-on-surface-variant dark:text-slate-300">
                      <span>{label}</span>
                      <span>{value}</span>
                    </div>
                    <ProgressBar value={attendanceTotal ? (Number(value) / attendanceTotal) * 100 : 0} tone={label === 'present' ? 'emerald' : label === 'absent' ? 'rose' : 'amber'} />
                  </div>
                ))}
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
