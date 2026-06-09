import { BookOpen, Plus } from 'lucide-react';
import { useState } from 'react';
import PageHeader from '../components/common/PageHeader.jsx';
import Card from '../components/ui/Card.jsx';
import Badge from '../components/ui/Badge.jsx';
import ProgressBar from '../components/ui/ProgressBar.jsx';
import Button from '../components/ui/Button.jsx';
import Input from '../components/ui/Input.jsx';
import Modal from '../components/ui/Modal.jsx';
import { useApp } from '../context/AppContext.jsx';
import { api } from '../services/api.js';
import { hasPermission } from '../utils/permissions.js';

export default function ClassesPage() {
  const { data, currentRole, currentUser, retryData } = useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: '', section: '', gradeLevel: '', academicYear: '', capacity: 40, room: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const canManage = currentRole === 'ADMIN' && hasPermission(currentUser, 'classes:manage');

  const submit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setError('');
    try {
      await api.post('/classes', { ...form, capacity: Number(form.capacity) });
      setForm({ name: '', section: '', gradeLevel: '', academicYear: '', capacity: 40, room: '' });
      setModalOpen(false);
      retryData();
    } catch (submitError) {
      setError(submitError.message || 'Unable to create class.');
    } finally {
      setIsSaving(false);
    }
  };

  const archiveClass = async (id) => {
    setError('');
    try {
      await api.delete(`/classes/${id}`);
      retryData();
    } catch (archiveError) {
      setError(archiveError.message || 'Unable to archive class.');
    }
  };

  return (
    <div className="page-shell">
      <PageHeader eyebrow="Class operations" title={currentRole === 'TEACHER' ? 'My Classes' : 'Classes & Sections'} description={currentRole === 'TEACHER' ? 'Only classes and sections where you are the class teacher or an assigned subject teacher.' : 'Manage class, section, room, capacity, and academic year records without overwriting history.'} actionLabel={canManage ? 'Create Class' : undefined} actionIcon={Plus} onAction={() => setModalOpen(true)} />
      {error ? <p role="alert" className="rounded-xl bg-error-container p-4 text-sm font-semibold text-on-error-container">{error}</p> : null}
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {data.classes.map((item) => (
          <Card key={item.id} hover>
            <div className="flex items-start justify-between">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-oryx-500 to-cyan-400 text-white shadow-lg">
                <BookOpen className="h-6 w-6" />
              </div>
              <Badge tone="violet">Section {item.section}</Badge>
            </div>
            <h3 className="mt-5 text-2xl font-bold text-on-surface">Class {item.name}</h3>
            <p className="mt-1 text-sm font-semibold text-slate-500">Mentor: {item.mentor}</p>
            <div className="mt-6 grid grid-cols-1 gap-3 min-[425px]:grid-cols-3">
              <div className="rounded-xl bg-surface-container-low p-3 text-center ring-1 ring-outline-variant/40"><p className="text-xl font-bold text-on-surface">{item.students}</p><p className="text-xs font-semibold text-on-surface-variant">Students</p></div>
              <div className="rounded-xl bg-surface-container-low p-3 text-center ring-1 ring-outline-variant/40"><p className="text-xl font-bold text-on-surface">{item.subjects}</p><p className="text-xs font-semibold text-on-surface-variant">Subjects</p></div>
              <div className="rounded-xl bg-surface-container-low p-3 text-center ring-1 ring-outline-variant/40"><p className="text-xl font-bold text-on-surface">{item.room.split(' ').at(-1)}</p><p className="text-xs font-semibold text-on-surface-variant">Room</p></div>
            </div>
            <div className="mt-6">
              <div className="mb-2 flex justify-between text-sm font-semibold text-on-surface-variant"><span>Class Health</span><span>{item.health}%</span></div>
              <ProgressBar value={item.health} tone={item.health < 80 ? 'amber' : 'emerald'} />
            </div>
            {canManage ? <Button variant="danger" size="sm" className="mt-5 w-full sm:w-auto" onClick={() => archiveClass(item.id)}>Archive Class</Button> : null}
          </Card>
        ))}
      </div>
      <Modal open={modalOpen} title="Create Class" description="Add a classroom with mentor, room, and capacity details." onClose={() => setModalOpen(false)}>
        <form className="grid gap-3" onSubmit={submit}>
          <Input placeholder="Class name, e.g. Grade 10" value={form.name} onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))} required />
          <Input placeholder="Section" value={form.section} onChange={(event) => setForm((value) => ({ ...value, section: event.target.value }))} required />
          <Input placeholder="Grade level, e.g. 10" value={form.gradeLevel} onChange={(event) => setForm((value) => ({ ...value, gradeLevel: event.target.value }))} required />
          <Input placeholder="Academic year, e.g. 2026-2027" value={form.academicYear} onChange={(event) => setForm((value) => ({ ...value, academicYear: event.target.value }))} required />
          <Input type="number" min="1" placeholder="Capacity" value={form.capacity} onChange={(event) => setForm((value) => ({ ...value, capacity: event.target.value }))} required />
          <Input placeholder="Room" value={form.room} onChange={(event) => setForm((value) => ({ ...value, room: event.target.value }))} required />
          {error ? <p className="rounded-lg bg-error-container p-3 text-sm font-semibold text-on-error-container">{error}</p> : null}
          <Button type="submit" variant="aurora" disabled={isSaving}>{isSaving ? 'Creating...' : 'Create Class'}</Button>
        </form>
      </Modal>
    </div>
  );
}
