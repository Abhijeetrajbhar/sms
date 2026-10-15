import { CalendarDays, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
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

const types = ['TERM', 'HOLIDAY', 'EXAM', 'EVENT'];
const tones = { TERM: 'violet', HOLIDAY: 'rose', EXAM: 'amber', EVENT: 'blue' };
const initialForm = { title: '', description: '', type: 'EVENT', academicYear: '', startDate: '', endDate: '', classId: '', isPublished: true };

export default function AcademicCalendarPage() {
  const { currentUser, data } = useApp();
  const [events, setEvents] = useState([]);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [filter, setFilter] = useState('');
  const canManage = hasPermission(currentUser, 'calendar:manage');

  const load = useCallback(async () => {
    setError('');
    try { const response = await api.get(`/calendar?limit=100${filter ? `&type=${filter}` : ''}`); const rows = response.data?.data || response.data; setEvents(Array.isArray(rows) ? rows : []); }
    catch (loadError) { setError(loadError.message || 'Unable to load calendar events.'); }
  }, [filter]);
  useEffect(() => { load(); }, [load]);

  const save = async (event) => {
    event.preventDefault();
    try {
      await api.post('/calendar', { ...form, classId: form.classId || undefined, description: form.description || undefined, startDate: new Date(`${form.startDate}T00:00:00.000Z`).toISOString(), endDate: new Date(`${form.endDate}T00:00:00.000Z`).toISOString() });
      setOpen(false); setForm(initialForm); await load();
    } catch (saveError) { setError(saveError.message || 'Unable to create calendar event.'); }
  };
  const remove = async (id) => { try { await api.delete(`/calendar/${id}`); await load(); } catch (deleteError) { setError(deleteError.message || 'Unable to delete calendar event.'); } };

  const columns = [
    { key: 'title', label: 'Event', render: (row) => <div><p className="font-bold text-on-surface">{row.title}</p><p className="text-xs text-on-surface-variant">{row.description || 'No description'}</p></div> },
    { key: 'type', label: 'Type', render: (row) => <Badge tone={tones[row.type] || 'slate'}>{row.type}</Badge> },
    { key: 'dates', label: 'Dates', render: (row) => <span className="text-sm font-semibold">{new Date(row.startDate).toLocaleDateString()} - {new Date(row.endDate).toLocaleDateString()}</span> },
    { key: 'academicYear', label: 'Year' },
    { key: 'visibility', label: 'Visibility', render: (row) => <Badge tone={row.isPublished ? 'emerald' : 'slate'}>{row.isPublished ? 'Published' : 'Draft'}</Badge> },
    { key: 'actions', label: '', render: (row) => canManage ? <Button aria-label={`Delete ${row.title}`} size="sm" variant="secondary" icon={Trash2} onClick={() => remove(row.id)}>Delete</Button> : null },
  ];

  return <div className="page-shell">
    <PageHeader eyebrow="Institution planning" title="Academic Calendar" description="Publish terms, holidays, school events, and examination dates across role portals." actionLabel={canManage ? 'Add Calendar Event' : undefined} actionIcon={Plus} onAction={() => setOpen(true)} />
    {error ? <div role="alert" className="flex flex-col gap-3 rounded-xl bg-error-container p-4 text-sm font-semibold text-on-error-container sm:flex-row sm:items-center sm:justify-between"><span>{error}</span><Button size="sm" variant="secondary" icon={RefreshCw} onClick={load}>Retry</Button></div> : null}
    <Card><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><CalendarDays className="h-6 w-6 text-primary" /><div><p className="font-bold text-on-surface">School-wide schedule</p><p className="text-sm text-on-surface-variant">Class-specific events are automatically scoped for teachers.</p></div></div><select aria-label="Filter calendar event type" className="focus-ring min-h-11 rounded-lg border border-outline-variant/70 bg-surface-container-lowest px-3 text-sm font-semibold text-on-surface" value={filter} onChange={(event) => setFilter(event.target.value)}><option value="">All event types</option>{types.map((type) => <option key={type}>{type}</option>)}</select></div></Card>
    <Card><DataTable columns={columns} rows={events} emptyText="No calendar events found." /></Card>
    <Modal open={open} title="Add Calendar Event" description="Draft events are visible only to administrators until published." onClose={() => setOpen(false)}>
      <form className="grid gap-3" onSubmit={save}>
        <Input label="Title" value={form.title} onChange={(event) => setForm((value) => ({ ...value, title: event.target.value }))} required />
        <Input label="Description" value={form.description} onChange={(event) => setForm((value) => ({ ...value, description: event.target.value }))} />
        <div className="grid gap-3 sm:grid-cols-2"><select aria-label="Event type" className="focus-ring min-h-11 rounded-lg border border-outline-variant/70 bg-surface-container-lowest px-3 text-sm font-semibold text-on-surface" value={form.type} onChange={(event) => setForm((value) => ({ ...value, type: event.target.value }))}>{types.map((type) => <option key={type}>{type}</option>)}</select><Input label="Academic year" placeholder="2026-2027" value={form.academicYear} onChange={(event) => setForm((value) => ({ ...value, academicYear: event.target.value }))} required /></div>
        <div className="grid gap-3 sm:grid-cols-2"><Input label="Start date" type="date" value={form.startDate} onChange={(event) => setForm((value) => ({ ...value, startDate: event.target.value }))} required /><Input label="End date" type="date" value={form.endDate} onChange={(event) => setForm((value) => ({ ...value, endDate: event.target.value }))} required /></div>
        <select aria-label="Optional class scope" className="focus-ring min-h-11 rounded-lg border border-outline-variant/70 bg-surface-container-lowest px-3 text-sm font-semibold text-on-surface" value={form.classId} onChange={(event) => setForm((value) => ({ ...value, classId: event.target.value }))}><option value="">All school</option>{data.classes.map((item) => <option key={item.id} value={item.id}>Class {item.name} {item.section}</option>)}</select>
        <label className="flex items-center gap-2 text-sm font-semibold text-on-surface"><input type="checkbox" checked={form.isPublished} onChange={(event) => setForm((value) => ({ ...value, isPublished: event.target.checked }))} /> Publish immediately</label>
        <Button type="submit" variant="aurora">Create Calendar Event</Button>
      </form>
    </Modal>
  </div>;
}
