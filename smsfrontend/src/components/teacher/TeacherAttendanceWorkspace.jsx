import { ClipboardCheck, RefreshCw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import PageHeader from '../common/PageHeader.jsx';
import DataTable from '../common/DataTable.jsx';
import Badge from '../ui/Badge.jsx';
import Button from '../ui/Button.jsx';
import Card from '../ui/Card.jsx';
import { api } from '../../services/api.js';
import { statusTone } from '../../utils/statusStyles.js';

const statuses = ['PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'EXCUSED'];
const selectClass = 'focus-ring min-h-11 w-full rounded-lg border border-outline-variant/70 bg-surface-container-lowest px-4 text-base font-semibold text-on-surface sm:text-sm';

export default function TeacherAttendanceWorkspace({ data }) {
  const classes = useMemo(() => data.teacherDashboard?.assignedClasses || [], [data.teacherDashboard?.assignedClasses]);
  const mappings = useMemo(() => data.teacherDashboard?.assignedSubjects || [], [data.teacherDashboard?.assignedSubjects]);
  const [classId, setClassId] = useState(classes[0]?.id || '');
  const [subjectId, setSubjectId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [entries, setEntries] = useState({});
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const selectedClass = useMemo(() => classes.find((item) => item.id === classId), [classId, classes]);
  const subjectsForClass = useMemo(
    () => mappings.filter((item) => item.class?.id === classId && item.status !== 'INACTIVE'),
    [classId, mappings]
  );
  const requiresSubject = Boolean(selectedClass && !selectedClass.isClassTeacher);
  const subjectReady = !requiresSubject || Boolean(subjectId);

  useEffect(() => {
    if (!classId && classes.length) setClassId(classes[0].id);
  }, [classId, classes]);

  useEffect(() => {
    if (!classId) {
      setSubjectId('');
      return;
    }

    const hasSelectedSubject = subjectsForClass.some((item) => item.subject?.id === subjectId);
    if (requiresSubject && !hasSelectedSubject) {
      setSubjectId(subjectsForClass[0]?.subject?.id || '');
    } else if (subjectId && !hasSelectedSubject) {
      setSubjectId('');
    }
  }, [classId, requiresSubject, subjectId, subjectsForClass]);

  const students = useMemo(() => data.students.filter((student) => student.backendId && (
    !classId || data.teacherDashboard?.students?.find((item) => item.id === student.backendId)?.classId === classId
  )), [classId, data.students, data.teacherDashboard?.students]);

  const loadHistory = async () => {
    if (!classId || !date || !subjectReady) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ date });
      if (subjectId) params.set('subjectId', subjectId);
      const response = await api.get(`/attendance/class/${classId}?${params}`);
      const rows = Array.isArray(response.data) ? response.data : [];
      setHistory(rows);
      setEntries(Object.fromEntries(rows.map((row) => [row.studentId, { status: row.status, remarks: row.remarks || '' }])));
      setNotice(rows.length ? 'Attendance is already recorded for this date. Existing records are shown below.' : 'No attendance has been marked for this class and date.');
    } catch (loadError) {
      setError(loadError.message || 'Attendance history could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  const updateEntry = (studentId, field, value) => {
    setEntries((current) => ({
      ...current,
      [studentId]: { status: current[studentId]?.status || 'PRESENT', remarks: current[studentId]?.remarks || '', [field]: value },
    }));
  };

  const markAllPresent = () => {
    setEntries(Object.fromEntries(students.map((student) => [student.backendId, { status: 'PRESENT', remarks: '' }])));
  };

  const submit = async () => {
    if (!classId || !students.length || !subjectReady) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await api.post('/attendance/bulk', {
        classId,
        ...(subjectId ? { subjectId } : {}),
        date,
        entries: students.map((student) => ({
          studentId: student.backendId,
          status: entries[student.backendId]?.status || 'PRESENT',
          ...(entries[student.backendId]?.remarks ? { remarks: entries[student.backendId].remarks } : {}),
        })),
      });
      setNotice(`Attendance marked successfully for ${students.length} students.`);
      await loadHistory();
    } catch (submitError) {
      setError(submitError.message || 'Attendance could not be submitted.');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { key: 'student', label: 'Student', render: (row) => `${row.student?.user?.firstName || ''} ${row.student?.user?.lastName || ''}`.trim() },
    { key: 'status', label: 'Status', render: (row) => <Badge className={statusTone[String(row.status).toLowerCase()] || statusTone.info}>{String(row.status).replaceAll('_', ' ')}</Badge> },
    { key: 'remarks', label: 'Remarks', render: (row) => row.remarks || '-' },
  ];

  return (
    <div className="page-shell">
      <PageHeader eyebrow="Teacher attendance" title="Mark Attendance" description="Attendance is limited to your assigned classes and active students." />
      <Card>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_220px_auto]">
          <label className="text-xs font-bold text-on-surface-variant">Assigned class
            <select className={`${selectClass} mt-1.5`} value={classId} onChange={(event) => { setClassId(event.target.value); setSubjectId(''); setHistory([]); setEntries({}); }}>
              <option value="">Select assigned class</option>
              {classes.map((item) => <option key={item.id} value={item.id}>{item.name} {item.section} / {item.academicYear}</option>)}
            </select>
          </label>
          <label className="text-xs font-bold text-on-surface-variant">Subject
            <select className={`${selectClass} mt-1.5`} value={subjectId} onChange={(event) => { setSubjectId(event.target.value); setHistory([]); setEntries({}); }} required={requiresSubject} disabled={!classId || (!requiresSubject && !subjectsForClass.length)}>
              {!requiresSubject ? <option value="">Daily attendance</option> : null}
              {subjectsForClass.map((item) => <option key={item.id} value={item.subject.id}>{item.subject.name}</option>)}
            </select>
          </label>
          <label className="text-xs font-bold text-on-surface-variant">Date
            <input className={`${selectClass} mt-1.5`} type="date" max={new Date().toISOString().slice(0, 10)} value={date} onChange={(event) => { setDate(event.target.value); setHistory([]); setEntries({}); }} />
          </label>
          <Button className="self-end" variant="secondary" icon={RefreshCw} disabled={!classId || !subjectReady || loading} onClick={loadHistory}>{loading ? 'Loading...' : 'Check History'}</Button>
        </div>
      </Card>

      {notice ? <p role="status" className="rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm font-semibold text-on-surface">{notice}</p> : null}
      {error ? <p role="alert" className="rounded-xl bg-error-container px-4 py-3 text-sm font-semibold text-on-error-container">{error}</p> : null}

      <Card>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="text-lg font-bold text-on-surface">Student attendance</h2><p className="text-sm text-on-surface-variant">{students.length ? `${students.length} active students` : 'Choose an assigned class to begin'}</p></div>
          <Button variant="secondary" icon={ClipboardCheck} disabled={!students.length || !subjectReady || history.length > 0} onClick={markAllPresent}>Mark All Present</Button>
        </div>
        <div className="space-y-3">
          {students.map((student) => (
            <div key={student.backendId} className="grid gap-3 rounded-xl border border-outline-variant/40 bg-surface-container-low p-3 sm:grid-cols-[minmax(0,1fr)_180px_minmax(0,1fr)] sm:items-center">
              <div><p className="font-bold text-on-surface">{student.name}</p><p className="text-xs text-on-surface-variant">{student.id} / {student.className}</p></div>
              <select className={selectClass} value={entries[student.backendId]?.status || 'PRESENT'} disabled={history.length > 0} onChange={(event) => updateEntry(student.backendId, 'status', event.target.value)}>
                {statuses.map((status) => <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>)}
              </select>
              <input className={selectClass} placeholder="Optional remarks" disabled={history.length > 0} value={entries[student.backendId]?.remarks || ''} onChange={(event) => updateEntry(student.backendId, 'remarks', event.target.value)} />
            </div>
          ))}
          {!students.length ? <p className="rounded-xl border border-dashed border-outline-variant/60 p-8 text-center text-sm font-semibold text-on-surface-variant">No active students are assigned to this class.</p> : null}
          {students.length && !subjectReady ? <p className="rounded-xl border border-dashed border-outline-variant/60 p-8 text-center text-sm font-semibold text-on-surface-variant">Choose an assigned subject before marking attendance.</p> : null}
        </div>
        <Button className="mt-5 w-full sm:w-auto" variant="aurora" disabled={!students.length || !subjectReady || saving || history.length > 0} onClick={submit}>{saving ? 'Submitting...' : 'Submit Attendance'}</Button>
      </Card>

      {history.length ? <Card><h2 className="mb-4 text-lg font-bold text-on-surface">Recorded attendance</h2><DataTable columns={columns} rows={history} /></Card> : null}
    </div>
  );
}
