import { ClipboardCheck, Download } from 'lucide-react';
import PageHeader from '../components/common/PageHeader.jsx';
import DataTable from '../components/common/DataTable.jsx';
import Card from '../components/ui/Card.jsx';
import Badge from '../components/ui/Badge.jsx';
import ProgressBar from '../components/ui/ProgressBar.jsx';
import Button from '../components/ui/Button.jsx';
import { useApp } from '../context/AppContext.jsx';
import { statusTone } from '../utils/statusStyles.js';
import { exportCsv } from '../utils/exporters.js';
import { getScopedStudent, getStudentAttendanceRows } from '../utils/studentScope.js';
import TeacherAttendanceWorkspace from '../components/teacher/TeacherAttendanceWorkspace.jsx';
import { hasPermission } from '../utils/permissions.js';

export default function AttendancePage() {
  const { data, currentRole, currentUser } = useApp();
  if (currentRole === 'TEACHER') return <TeacherAttendanceWorkspace data={data} />;
  const scopedStudent = getScopedStudent(data, currentUser, currentRole);
  const isPersonalView = ['STUDENT', 'PARENT'].includes(currentRole);
  const rows = isPersonalView ? getStudentAttendanceRows(data, scopedStudent) : data.attendance.today;
  const presentValue = scopedStudent?.attendance || 0;
  const personalMonthly = { present: presentValue, absent: Math.max(0, 100 - presentValue) };
  const monthlyRows = currentRole === 'PARENT'
    ? data.attendance.monthly
    : isPersonalView ? personalMonthly : data.attendance.monthly;
  const canExport = currentRole === 'ADMIN' && hasPermission(currentUser, 'reports:export');
  const columns = [
    { key: 'student', label: 'Student' },
    { key: 'className', label: 'Class' },
    { key: 'status', label: 'Status', render: (row) => <Badge className={statusTone[row.status]}>{row.status}</Badge> },
    { key: 'time', label: 'Marked At', render: (row) => row.time || '-' },
  ];

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Daily attendance"
        title={currentRole === 'PARENT' ? 'Child Attendance' : isPersonalView ? 'My Attendance' : 'Attendance Control'}
        description={currentRole === 'PARENT' ? 'Daily attendance and summary for the selected linked child only.' : isPersonalView ? 'Personal attendance status, class, and marked time for the signed-in student.' : 'Mark, audit, and review attendance quality with parent-ready status visibility.'}
        actionLabel={canExport ? 'Export Attendance' : undefined}
        actionIcon={Download}
        onAction={canExport ? () => exportCsv('attendance-sheet.csv', rows) : undefined}
      />
      <div className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
        <Card>
          <div className="flex items-start gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-400 text-white">
              <ClipboardCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-on-surface">{isPersonalView ? 'Student Attendance' : 'Monthly Attendance Mix'}</h3>
              <p className="break-words text-sm font-semibold text-slate-400">{isPersonalView ? `${scopedStudent?.name || 'Student'} / ${scopedStudent?.className || 'Class not assigned'}` : 'Present, absent, late, and excused records'}</p>
            </div>
          </div>
          <div className="mt-6 space-y-5">
            {Object.entries(monthlyRows).filter(([label]) => !['percentage', 'total'].includes(label)).map(([label, value]) => (
              <div key={label}>
                <div className="mb-2 flex justify-between text-sm font-semibold capitalize text-on-surface-variant"><span>{label}</span><span>{value}</span></div>
                <ProgressBar value={isPersonalView ? value : (value / 847) * 100} tone={label === 'present' ? 'emerald' : label === 'absent' ? 'rose' : label === 'late' ? 'amber' : 'blue'} />
              </div>
            ))}
          </div>
          {canExport ? <Button className="mt-7 w-full" variant="aurora" onClick={() => exportCsv('attendance-session.csv', rows)}>Export Current Session</Button> : null}
        </Card>
        <Card>
          <DataTable columns={columns} rows={rows} emptyText={isPersonalView ? 'No attendance record found for this student today' : 'No attendance records found'} />
        </Card>
      </div>
    </div>
  );
}
