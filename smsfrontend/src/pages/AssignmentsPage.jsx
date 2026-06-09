import { Plus } from 'lucide-react';
import { useState } from 'react';
import { api } from '../services/api.js';
import PageHeader from '../components/common/PageHeader.jsx';
import Card from '../components/ui/Card.jsx';
import Badge from '../components/ui/Badge.jsx';
import ProgressBar from '../components/ui/ProgressBar.jsx';
import Button from '../components/ui/Button.jsx';
import Input from '../components/ui/Input.jsx';
import Modal from '../components/ui/Modal.jsx';
import { useApp } from '../context/AppContext.jsx';
import { percentage } from '../utils/formatters.js';
import { statusTone } from '../utils/statusStyles.js';
import { hasPermission } from '../utils/permissions.js';

export default function AssignmentsPage() {
  const { data, currentRole, currentUser, addAssignment, removeAssignment, retryData } = useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const mappings = data.teacherDashboard?.assignedSubjects || [];
  const [form, setForm] = useState({ title: '', description: '', mappingId: '', subject: '', className: '', dueDate: '', maxMarks: 100, isPublished: true, total: 1 });
  const canManage = currentRole === 'TEACHER' || (currentRole === 'ADMIN' && hasPermission(currentUser, 'assignments:manage'));

  const submit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setError('');
    try {
      if (currentRole === 'TEACHER') {
        const mapping = mappings.find((item) => item.id === form.mappingId);
        if (!mapping) throw new Error('Select an assigned class and subject.');
        await api.post('/assignments', {
          title: form.title,
          description: form.description,
          classId: mapping.class.id,
          subjectId: mapping.subject.id,
          dueDate: form.dueDate,
          maxMarks: Number(form.maxMarks),
          isPublished: form.isPublished,
        });
        retryData();
      } else {
        await addAssignment(form);
      }
      setForm({ title: '', description: '', mappingId: '', subject: '', className: '', dueDate: '', maxMarks: 100, isPublished: true, total: 1 });
      setModalOpen(false);
    } catch (submitError) {
      setError(submitError.message || 'Assignment could not be created.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="page-shell">
      <PageHeader eyebrow="Academic workflow" title={currentRole === 'TEACHER' ? 'My Assignments' : currentRole === 'PARENT' ? 'Child Assignments' : currentRole === 'STUDENT' ? 'My Assignments' : 'Assignments'} description={currentRole === 'TEACHER' ? 'Create and manage assignments only for your assigned class-subject combinations.' : currentRole === 'PARENT' ? 'Published assignments, submission status, marks, and feedback for the selected linked child.' : currentRole === 'STUDENT' ? 'Published assignments for your class, with your submission status, marks, and feedback.' : 'Create, track, and grade assignments with live submission progress.'} actionLabel={canManage ? 'New Assignment' : undefined} actionIcon={Plus} onAction={() => setModalOpen(true)} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {data.assignments.map((assignment) => {
          const progress = percentage(assignment.submitted, assignment.total);
          return (
            <Card key={assignment.id} hover>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Badge tone="blue">{assignment.subject}</Badge>
                <Badge className={statusTone[assignment.status]}>{assignment.status}</Badge>
              </div>
              <h3 className="mt-5 text-lg font-bold leading-7 text-on-surface sm:min-h-16">{assignment.title}</h3>
              <p className="text-sm font-semibold text-on-surface-variant">Class {assignment.className} / Due {assignment.dueDate}</p>
              {['PARENT', 'STUDENT'].includes(currentRole) ? <p className="mt-2 line-clamp-2 text-sm text-on-surface-variant">{assignment.description}</p> : null}
              <div className="mt-7 rounded-xl bg-surface-container-low p-4 ring-1 ring-outline-variant/40">
                <div className="mb-2 flex justify-between text-sm font-semibold text-on-surface-variant"><span>Submitted</span><span>{assignment.submitted}/{assignment.total}</span></div>
                <ProgressBar value={progress} tone={progress < 50 ? 'rose' : progress < 80 ? 'amber' : 'emerald'} />
              </div>
              {canManage ? <Button variant="danger" size="sm" className="mt-5 w-full sm:w-auto" onClick={() => removeAssignment(assignment.id)}>Remove</Button> : null}
            </Card>
          );
        })}
        {!data.assignments.length ? <Card className="sm:col-span-2 xl:col-span-3"><p className="text-sm font-semibold text-on-surface-variant">{currentRole === 'STUDENT' ? 'No published assignments found for your class.' : 'No published assignments found for the selected child.'}</p></Card> : null}
      </div>
      <Modal open={modalOpen} title="New Assignment" description="Create an assignment card for class tracking." onClose={() => setModalOpen(false)}>
        <form className="grid gap-3" onSubmit={submit}>
          <Input placeholder="Assignment title" value={form.title} onChange={(event) => setForm((value) => ({ ...value, title: event.target.value }))} required />
          <textarea className="focus-ring min-h-28 w-full rounded-lg border border-outline-variant/70 bg-surface-container-lowest px-4 py-3 text-sm font-semibold text-on-surface" placeholder="Description and instructions" value={form.description} onChange={(event) => setForm((value) => ({ ...value, description: event.target.value }))} required />
          {currentRole === 'TEACHER' ? (
            <select className="focus-ring min-h-11 rounded-lg border border-outline-variant/70 bg-surface-container-lowest px-4 text-sm font-semibold text-on-surface" value={form.mappingId} onChange={(event) => setForm((value) => ({ ...value, mappingId: event.target.value }))} required>
              <option value="">Select assigned class and subject</option>
              {mappings.map((item) => <option key={item.id} value={item.id}>{item.subject.name} / {item.class.name} {item.class.section}</option>)}
            </select>
          ) : (
            <>
              <Input placeholder="Subject" value={form.subject} onChange={(event) => setForm((value) => ({ ...value, subject: event.target.value }))} required />
              <Input placeholder="Class" value={form.className} onChange={(event) => setForm((value) => ({ ...value, className: event.target.value }))} required />
            </>
          )}
          <Input type="date" value={form.dueDate} onChange={(event) => setForm((value) => ({ ...value, dueDate: event.target.value }))} required />
          <Input type="number" min="1" placeholder={currentRole === 'TEACHER' ? 'Maximum marks' : 'Total students'} value={currentRole === 'TEACHER' ? form.maxMarks : form.total} onChange={(event) => setForm((value) => ({ ...value, [currentRole === 'TEACHER' ? 'maxMarks' : 'total']: event.target.value }))} />
          {currentRole === 'TEACHER' ? <label className="flex min-h-11 items-center gap-3 rounded-lg bg-surface-container-low px-4 text-sm font-semibold text-on-surface"><input className="h-5 w-5" type="checkbox" checked={form.isPublished} onChange={(event) => setForm((value) => ({ ...value, isPublished: event.target.checked }))} />Publish immediately</label> : null}
          {error ? <p className="rounded-lg bg-error-container px-3 py-2 text-sm font-semibold text-on-error-container">{error}</p> : null}
          <Button type="submit" variant="aurora" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Assignment'}</Button>
        </form>
      </Modal>
    </div>
  );
}
