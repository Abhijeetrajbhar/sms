import { Award, RefreshCw, Save } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import PageHeader from '../common/PageHeader.jsx';
import DataTable from '../common/DataTable.jsx';
import Badge from '../ui/Badge.jsx';
import Button from '../ui/Button.jsx';
import Card from '../ui/Card.jsx';
import { api } from '../../services/api.js';
import { statusTone } from '../../utils/statusStyles.js';

const selectClass = 'focus-ring min-h-11 w-full rounded-lg border border-outline-variant/70 bg-surface-container-lowest px-4 text-base font-semibold text-on-surface sm:text-sm';

export default function TeacherMarksWorkspace({ data }) {
  const mappings = useMemo(() => data.teacherDashboard?.assignedSubjects || [], [data.teacherDashboard?.assignedSubjects]);
  const [mappingId, setMappingId] = useState(mappings[0]?.id || '');
  const [examType, setExamType] = useState('Mid-Term');
  const [term, setTerm] = useState('Term 1');
  const selected = mappings.find((item) => item.id === mappingId);
  const [academicYear, setAcademicYear] = useState(selected?.class?.academicYear || '2025-2026');
  const [students, setStudents] = useState([]);
  const [entries, setEntries] = useState({});
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!mappingId && mappings.length) {
      setMappingId(mappings[0].id);
      setAcademicYear(mappings[0].class?.academicYear || academicYear);
    }
  }, [academicYear, mappingId, mappings]);

  const loadHistory = async () => {
    try {
      const response = await api.get('/results/teacher/marks/history?limit=100');
      setHistory(Array.isArray(response.data) ? response.data : []);
    } catch {
      setHistory([]);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const loadStudents = async () => {
    if (!selected) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        classId: selected.class.id,
        subjectId: selected.subject.id,
        examType,
        term,
        academicYear,
      });
      const response = await api.get(`/results/teacher/marks/students?${params}`);
      const rows = Array.isArray(response.data) ? response.data : [];
      setStudents(rows);
      setEntries(Object.fromEntries(rows.map((student) => [student.id, {
        marksObtained: student.result?.marksObtained ?? '',
        maxMarks: student.result?.maxMarks ?? 100,
        remarks: student.result?.remarks || '',
        status: student.result?.status || 'DRAFT',
      }])));
      setNotice(rows.length ? 'Student list loaded. Save drafts before final submission.' : 'No active students found for this class.');
    } catch (loadError) {
      setError(loadError.message || 'Marks entry students could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  const update = (studentId, field, value) => {
    setEntries((current) => ({ ...current, [studentId]: { ...current[studentId], [field]: value } }));
  };

  const payload = () => ({
    classId: selected.class.id,
    subjectId: selected.subject.id,
    examType,
    term,
    academicYear,
    entries: students.flatMap((student) => {
      const entry = entries[student.id] || {};
      const rawMarks = String(entry.marksObtained ?? '').trim();
      if (!rawMarks) return [];

      const marksObtained = Number(rawMarks);
      const maxMarks = Number(entry.maxMarks || 100);
      const studentName = `${student.user.firstName || ''} ${student.user.lastName || ''}`.trim() || student.studentCode;

      if (!Number.isFinite(marksObtained) || !Number.isFinite(maxMarks) || maxMarks <= 0) {
        throw new Error(`Enter valid marks for ${studentName}.`);
      }
      if (marksObtained < 0 || marksObtained > maxMarks) {
        throw new Error(`${studentName}'s marks must be between 0 and ${maxMarks}.`);
      }

      return [{
        studentId: student.id,
        marksObtained,
        maxMarks,
        ...(entry.remarks ? { remarks: entry.remarks } : {}),
      }];
    }),
  });

  const saveDraft = async () => {
    setSaving(true);
    setError('');
    try {
      if (!selected) throw new Error('Select an assigned class and subject.');
      let draftPayload;
      try {
        draftPayload = payload();
      } catch (validationError) {
        throw new Error(validationError.message || 'Invalid marks entry.');
      }
      if (!draftPayload.entries.length) throw new Error('Enter marks for at least one student before saving.');
      await api.post('/results/teacher/marks/save-draft', draftPayload);
      setNotice('Draft marks saved. You can continue editing until final submission.');
      await Promise.all([loadStudents(), loadHistory()]);
    } catch (saveError) {
      setError(saveError.message || 'Draft marks could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const submitFinal = async () => {
    if (!window.confirm('Submit these marks as final? Teachers cannot edit them after submission.')) return;
    setSaving(true);
    setError('');
    try {
      if (!selected) throw new Error('Select an assigned class and subject.');
      await api.post('/results/teacher/marks/submit-final', {
        classId: selected.class.id,
        subjectId: selected.subject.id,
        examType,
        term,
        academicYear,
      });
      setNotice('Marks submitted for admin review and locking.');
      await Promise.all([loadStudents(), loadHistory()]);
    } catch (submitError) {
      setError(submitError.message || 'Final marks could not be submitted.');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { key: 'student', label: 'Student', render: (row) => `${row.student?.user?.firstName || ''} ${row.student?.user?.lastName || ''}`.trim() },
    { key: 'class', label: 'Class', render: (row) => `${row.class?.name || ''} ${row.class?.section || ''}`.trim() },
    { key: 'subject', label: 'Subject', render: (row) => row.subject?.name },
    { key: 'examType', label: 'Exam' },
    { key: 'marksObtained', label: 'Marks', render: (row) => `${row.marksObtained}/${row.maxMarks}` },
    { key: 'status', label: 'Status', render: (row) => <Badge className={statusTone[String(row.status).toLowerCase()] || statusTone.info}>{row.status}</Badge> },
  ];

  return (
    <div className="page-shell">
      <PageHeader eyebrow="Teacher marks entry" title="Marks Entry" description="Enter marks only for your assigned class-subject combinations. Drafts remain editable until final submission." />
      <Card>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <label className="text-xs font-bold text-on-surface-variant">Assigned subject
            <select className={`${selectClass} mt-1.5`} value={mappingId} onChange={(event) => { const next = mappings.find((item) => item.id === event.target.value); setMappingId(event.target.value); setAcademicYear(next?.class?.academicYear || academicYear); setStudents([]); }}>
              <option value="">Select assignment</option>
              {mappings.map((item) => <option key={item.id} value={item.id}>{item.subject.name} / {item.class.name} {item.class.section}</option>)}
            </select>
          </label>
          <label className="text-xs font-bold text-on-surface-variant">Exam<input className={`${selectClass} mt-1.5`} value={examType} onChange={(event) => setExamType(event.target.value)} /></label>
          <label className="text-xs font-bold text-on-surface-variant">Term<input className={`${selectClass} mt-1.5`} value={term} onChange={(event) => setTerm(event.target.value)} /></label>
          <label className="text-xs font-bold text-on-surface-variant">Academic year<input className={`${selectClass} mt-1.5`} value={academicYear} onChange={(event) => setAcademicYear(event.target.value)} /></label>
          <Button className="self-end" variant="secondary" icon={RefreshCw} disabled={!selected || loading} onClick={loadStudents}>{loading ? 'Loading...' : 'Load Students'}</Button>
        </div>
      </Card>

      {notice ? <p role="status" className="rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm font-semibold text-on-surface">{notice}</p> : null}
      {error ? <p role="alert" className="rounded-xl bg-error-container px-4 py-3 text-sm font-semibold text-on-error-container">{error}</p> : null}

      <Card>
        <h2 className="mb-4 text-lg font-bold text-on-surface">Student marks</h2>
        <div className="space-y-3">
          {students.map((student) => {
            const locked = entries[student.id]?.status !== 'DRAFT';
            return (
              <div key={student.id} className="grid gap-3 rounded-xl border border-outline-variant/40 bg-surface-container-low p-3 sm:grid-cols-[minmax(0,1fr)_130px_130px_minmax(0,1fr)] sm:items-center">
                <div><p className="font-bold text-on-surface">{student.user.firstName} {student.user.lastName}</p><p className="text-xs text-on-surface-variant">{student.studentCode}</p></div>
                <input className={selectClass} type="number" min="0" max={entries[student.id]?.maxMarks || 100} step="0.01" disabled={locked} placeholder="Marks" value={entries[student.id]?.marksObtained ?? ''} onChange={(event) => update(student.id, 'marksObtained', event.target.value)} />
                <input className={selectClass} type="number" min="1" step="0.01" disabled={locked} value={entries[student.id]?.maxMarks || 100} onChange={(event) => update(student.id, 'maxMarks', event.target.value)} />
                <input className={selectClass} disabled={locked} placeholder="Optional remarks" value={entries[student.id]?.remarks || ''} onChange={(event) => update(student.id, 'remarks', event.target.value)} />
              </div>
            );
          })}
          {!students.length ? <p className="rounded-xl border border-dashed border-outline-variant/60 p-8 text-center text-sm font-semibold text-on-surface-variant">Choose an assigned subject and load students to begin marks entry.</p> : null}
        </div>
        <div className="mt-5 grid gap-2 sm:flex">
          <Button icon={Save} disabled={!students.length || saving} onClick={saveDraft}>{saving ? 'Saving...' : 'Save Draft'}</Button>
          <Button variant="aurora" icon={Award} disabled={!students.length || saving} onClick={submitFinal}>Submit Final</Button>
        </div>
      </Card>

      <Card><h2 className="mb-4 text-lg font-bold text-on-surface">My marks history</h2><DataTable columns={columns} rows={history} emptyText="No marks entries found for your assigned subjects" /></Card>
    </div>
  );
}
