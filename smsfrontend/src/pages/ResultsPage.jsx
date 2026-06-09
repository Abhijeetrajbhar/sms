import { Award, Download } from 'lucide-react';
import PageHeader from '../components/common/PageHeader.jsx';
import DataTable from '../components/common/DataTable.jsx';
import Card from '../components/ui/Card.jsx';
import Badge from '../components/ui/Badge.jsx';
import Button from '../components/ui/Button.jsx';
import Avatar from '../components/ui/Avatar.jsx';
import { useApp } from '../context/AppContext.jsx';
import { downloadMarksheet, exportCsv } from '../utils/exporters.js';
import { getScopedStudent, getStudentResults } from '../utils/studentScope.js';
import TeacherMarksWorkspace from '../components/teacher/TeacherMarksWorkspace.jsx';
import { hasPermission } from '../utils/permissions.js';

export default function ResultsPage() {
  const { data, currentRole, currentUser, publishResults } = useApp();
  if (currentRole === 'TEACHER') return <TeacherMarksWorkspace data={data} />;
  const scopedStudent = getScopedStudent(data, currentUser, currentRole);
  const isPersonalView = ['STUDENT', 'PARENT'].includes(currentRole);
  const canPublish = currentRole === 'TEACHER' || (currentRole === 'ADMIN' && hasPermission(currentUser, 'results:publish'));
  const canExport = currentRole === 'ADMIN' && hasPermission(currentUser, 'reports:export');
  const rows = isPersonalView ? getStudentResults(data, scopedStudent) : data.results;
  const topResult = isPersonalView ? rows[0] : data.results.find((item) => item.rank === 1) || data.results[0];
  const personalColumns = [
    { key: 'subject', label: 'Subject' },
    { key: 'examType', label: 'Exam' },
    { key: 'term', label: 'Term' },
    { key: 'total', label: 'Marks' },
    { key: 'percentage', label: 'Score', render: (row) => `${row.percentage || 0}%` },
    { key: 'grade', label: 'Grade', render: (row) => <Badge tone={String(row.grade).includes('A') ? 'emerald' : String(row.grade).includes('B') ? 'blue' : 'amber'}>{row.grade}</Badge> },
  ];
  const adminColumns = [
    { key: 'rank', label: 'Rank', render: (row) => <Badge tone={row.rank <= 3 ? 'amber' : 'blue'}>#{row.rank}</Badge> },
    { key: 'student', label: 'Student' },
    { key: 'math', label: 'Math' },
    { key: 'physics', label: 'Physics' },
    { key: 'english', label: 'English' },
    { key: 'chemistry', label: 'Chemistry' },
    { key: 'biology', label: 'Biology' },
    { key: 'total', label: 'Total' },
    { key: 'grade', label: 'Grade', render: (row) => <Badge tone={row.grade.includes('A') ? 'emerald' : row.grade.includes('B') ? 'blue' : 'rose'}>{row.grade}</Badge> },
  ];
  const columns = currentRole === 'PARENT' ? personalColumns : adminColumns;

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Examination cell"
        title={currentRole === 'PARENT' ? 'Child Results' : isPersonalView ? 'My Result & ID Card' : 'Results & Rank Board'}
        description={currentRole === 'PARENT' ? 'Published marks and academic history for the selected linked child only.' : isPersonalView ? 'Personal marksheet summary and student identity card for the signed-in learner.' : 'Visualize student marks, grade quality, subject performance, and rank positioning.'}
        actionLabel={canPublish ? 'Publish Result' : undefined}
        actionIcon={Award}
        onAction={canPublish ? publishResults : undefined}
      />
      {isPersonalView ? (
        <Card>
          <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
            <div className="rounded-[24px] border border-outline-variant/50 bg-surface-container-low p-5 dark:border-white/10 dark:bg-white/5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Badge tone="blue">Student ID</Badge>
                <span className="text-xs font-bold uppercase text-primary dark:text-cyan-200">{scopedStudent?.id}</span>
              </div>
              <div className="mt-6 grid place-items-center">
                <Avatar name={scopedStudent?.name} size="lg" className="h-28 w-28 rounded-[28px] text-3xl" />
              </div>
              <div className="mt-5 text-center">
                <h3 className="text-xl font-bold text-on-surface dark:text-white">{scopedStudent?.name || 'Student'}</h3>
                <p className="mt-1 text-sm font-semibold text-on-surface-variant dark:text-slate-300">CampusOryx School</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ['Unique ID', scopedStudent?.id],
                ['Roll No', scopedStudent?.rollNo],
                ['Class', scopedStudent?.className],
                ['Phone', scopedStudent?.contact],
                ['Address', scopedStudent?.address],
                ['Latest Grade', rows[0]?.grade || scopedStudent?.grade || 'N/A'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-surface-container-low p-4 ring-1 ring-outline-variant/40 dark:bg-white/5 dark:ring-white/10">
                  <p className="text-xs font-bold uppercase text-on-surface-variant dark:text-slate-300">{label}</p>
                  <p className="mt-2 break-words font-semibold text-on-surface dark:text-white">{value || 'Not available'}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>
      ) : null}
      <Card>
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-xl font-bold text-on-surface">{currentRole === 'PARENT' ? 'Published results' : 'Mid-Term Examination'}</h3>
            <p className="text-sm font-semibold text-slate-400 dark:text-slate-300">{isPersonalView ? 'Only your result is visible in this portal.' : 'Class-wise consolidated result table'}</p>
          </div>
          {canExport ? <div className="grid w-full gap-2 sm:flex sm:w-auto sm:flex-wrap">
            <Button variant="secondary" icon={Download} onClick={() => exportCsv('results.csv', data.results)}>Export Results</Button>
            <Button variant="secondary" icon={Download} onClick={() => downloadMarksheet('marksheet.txt', topResult)}>Download Marksheet</Button>
          </div> : null}
        </div>
        <DataTable columns={columns} rows={rows} emptyText={isPersonalView ? 'No result found for this student' : 'No result records found'} />
      </Card>
    </div>
  );
}
