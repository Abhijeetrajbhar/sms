import { BookOpen, Plus, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import PageHeader from '../components/common/PageHeader.jsx';
import DataTable from '../components/common/DataTable.jsx';
import Card from '../components/ui/Card.jsx';
import Badge from '../components/ui/Badge.jsx';
import Button from '../components/ui/Button.jsx';
import Input from '../components/ui/Input.jsx';
import Modal from '../components/ui/Modal.jsx';
import { api } from '../services/api.js';
import { useApp } from '../context/AppContext.jsx';
import { hasPermission } from '../utils/permissions.js';

export default function AcademicSetupPage() {
  const { data, currentUser } = useApp();
  const [subjects, setSubjects] = useState([]);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', description: '', credits: 1 });

  const load = async () => {
    setError('');
    try {
      const response = await api.get('/subjects');
      const rows = response.data?.data || response.data;
      setSubjects(Array.isArray(rows) ? rows : []);
    } catch (loadError) {
      setError(loadError.message || 'Unable to load academic setup.');
    }
  };
  useEffect(() => { load(); }, []);

  const createSubject = async (event) => {
    event.preventDefault();
    try {
      await api.post('/subjects', { ...form, credits: Number(form.credits) });
      setForm({ name: '', code: '', description: '', credits: 1 });
      setOpen(false);
      await load();
    } catch (saveError) {
      setError(saveError.message || 'Unable to create subject.');
    }
  };

  const columns = [
    { key: 'name', label: 'Subject' },
    { key: 'code', label: 'Code', render: (row) => <Badge tone="blue">{row.code}</Badge> },
    { key: 'credits', label: 'Credits' },
    { key: 'description', label: 'Description', render: (row) => row.description || 'Not provided' },
  ];

  return (
    <div className="page-shell">
      <PageHeader eyebrow="Academic configuration" title="Academic Setup" description="Manage subjects and review the academic years, classes, and sections already used by school records." actionLabel={hasPermission(currentUser, 'subjects:manage') ? 'Create Subject' : undefined} actionIcon={Plus} onAction={() => setOpen(true)} />
      {error ? <div role="alert" className="flex flex-col gap-3 rounded-xl bg-error-container p-4 text-sm font-semibold text-on-error-container sm:flex-row sm:items-center sm:justify-between"><span>{error}</span><Button size="sm" variant="secondary" icon={RefreshCw} onClick={load}>Retry</Button></div> : null}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="flex items-center gap-3"><BookOpen className="h-6 w-6 text-primary" /><h2 className="text-lg font-bold text-on-surface">Academic years in use</h2></div>
          <div className="mt-4 flex flex-wrap gap-2">{data.dashboardAnalytics?.academicYears?.length ? data.dashboardAnalytics.academicYears.map((year) => <Badge key={year} tone="blue">{year}</Badge>) : <p className="text-sm text-on-surface-variant">No academic year records found.</p>}</div>
          <p className="mt-4 text-sm leading-6 text-on-surface-variant">Academic years remain attached to existing classes, fees, results, assignments, and timetables so historical records are not overwritten.</p>
        </Card>
        <Card>
          <h2 className="text-lg font-bold text-on-surface">Class and section records</h2>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">{data.classes.map((item) => <div key={item.id} className="rounded-xl bg-surface-container-low p-3"><p className="font-bold text-on-surface">Class {item.name} / {item.section}</p><p className="mt-1 text-xs text-on-surface-variant">{item.students} students / {item.subjects} subjects</p></div>)}</div>
        </Card>
      </div>
      <Card><DataTable columns={columns} rows={subjects} emptyText="No subjects found" /></Card>
      <Modal open={open} title="Create Subject" description="Subject codes must be unique." onClose={() => setOpen(false)}>
        <form className="grid gap-3" onSubmit={createSubject}>
          <Input placeholder="Subject name" value={form.name} onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))} required />
          <Input placeholder="Unique subject code" value={form.code} onChange={(event) => setForm((value) => ({ ...value, code: event.target.value.toUpperCase() }))} required />
          <Input placeholder="Description" value={form.description} onChange={(event) => setForm((value) => ({ ...value, description: event.target.value }))} />
          <Input type="number" min="1" value={form.credits} onChange={(event) => setForm((value) => ({ ...value, credits: event.target.value }))} required />
          <Button type="submit" variant="aurora">Create Subject</Button>
        </form>
      </Modal>
    </div>
  );
}
