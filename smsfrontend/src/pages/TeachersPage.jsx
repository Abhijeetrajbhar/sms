import { Plus } from 'lucide-react';
import { useState } from 'react';
import PageHeader from '../components/common/PageHeader.jsx';
import Card from '../components/ui/Card.jsx';
import Avatar from '../components/ui/Avatar.jsx';
import Badge from '../components/ui/Badge.jsx';
import ProgressBar from '../components/ui/ProgressBar.jsx';
import Button from '../components/ui/Button.jsx';
import Input from '../components/ui/Input.jsx';
import Modal from '../components/ui/Modal.jsx';
import { useApp } from '../context/AppContext.jsx';
import { statusTone } from '../utils/statusStyles.js';
import { api } from '../services/api.js';
import { hasPermission } from '../utils/permissions.js';

export default function TeachersPage() {
  const { data, currentRole, currentUser, retryData } = useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', phone: '', qualification: '', specialization: '', experience: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const canCreate = currentRole === 'ADMIN' && hasPermission(currentUser, 'teachers:create') && hasPermission(currentUser, 'users:create');

  const submit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setError('');
    try {
      const account = await api.post('/users', { firstName: form.firstName, lastName: form.lastName, email: form.email, password: form.password, phone: form.phone, role: 'TEACHER' });
      await api.post('/teachers', { userId: account.data.id, qualification: form.qualification || undefined, specialization: form.specialization || undefined, experience: form.experience ? Number(form.experience) : undefined });
      setForm({ firstName: '', lastName: '', email: '', password: '', phone: '', qualification: '', specialization: '', experience: '' });
      setModalOpen(false);
      retryData();
    } catch (submitError) {
      setError(submitError.message || 'Unable to create teacher.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="page-shell">
      <PageHeader eyebrow="Faculty module" title="Faculty Operations" description="View teacher workload, subject ownership, assigned classes, and availability status." actionLabel={canCreate ? 'Add Teacher' : undefined} actionIcon={Plus} onAction={() => setModalOpen(true)} />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {data.teachers.map((teacher) => (
          <Card key={teacher.id} hover>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar name={teacher.name} tone="violet" />
                <div className="min-w-0">
                  <h3 className="break-words font-semibold text-on-surface">{teacher.name}</h3>
                  <p className="break-words text-sm font-semibold text-slate-400">{teacher.subject}</p>
                </div>
              </div>
              <Badge className={statusTone[teacher.status]}>{teacher.status.replace('_', ' ')}</Badge>
            </div>
            <div className="mt-6 grid grid-cols-1 gap-3 min-[375px]:grid-cols-2">
              <div className="rounded-xl bg-surface-container-low p-4 ring-1 ring-outline-variant/40">
                <p className="text-xs font-bold uppercase tracking-normal text-on-surface-variant">Experience</p>
                <p className="mt-2 font-semibold text-on-surface">{teacher.experience}</p>
              </div>
              <div className="rounded-xl bg-surface-container-low p-4 ring-1 ring-outline-variant/40">
                <p className="text-xs font-bold uppercase tracking-normal text-on-surface-variant">Classes</p>
                <p className="mt-2 font-semibold text-on-surface">{teacher.classes.length}</p>
              </div>
            </div>
            <div className="mt-5">
              <div className="mb-2 flex justify-between text-sm font-semibold text-on-surface-variant"><span>Workload</span><span>{teacher.workload}%</span></div>
              <ProgressBar value={teacher.workload} tone={teacher.workload > 82 ? 'amber' : 'blue'} />
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {teacher.classes.map((className) => <Badge key={className} tone="blue">{className}</Badge>)}
            </div>
          </Card>
        ))}
      </div>
      <Modal open={modalOpen} title="Add Teacher" description="Add a faculty member and assign class ownership labels." onClose={() => setModalOpen(false)}>
        <form className="grid gap-3" onSubmit={submit}>
          <div className="grid gap-3 sm:grid-cols-2"><Input placeholder="First name" value={form.firstName} onChange={(event) => setForm((value) => ({ ...value, firstName: event.target.value }))} required /><Input placeholder="Last name" value={form.lastName} onChange={(event) => setForm((value) => ({ ...value, lastName: event.target.value }))} required /></div>
          <Input type="email" placeholder="Teacher email" value={form.email} onChange={(event) => setForm((value) => ({ ...value, email: event.target.value }))} required />
          <Input type="password" placeholder="Temporary password" value={form.password} onChange={(event) => setForm((value) => ({ ...value, password: event.target.value }))} required />
          <Input placeholder="Phone" value={form.phone} onChange={(event) => setForm((value) => ({ ...value, phone: event.target.value }))} />
          <Input placeholder="Qualification" value={form.qualification} onChange={(event) => setForm((value) => ({ ...value, qualification: event.target.value }))} />
          <Input placeholder="Specialization" value={form.specialization} onChange={(event) => setForm((value) => ({ ...value, specialization: event.target.value }))} />
          <Input type="number" min="0" placeholder="Experience in years" value={form.experience} onChange={(event) => setForm((value) => ({ ...value, experience: event.target.value }))} />
          {error ? <p className="rounded-lg bg-error-container p-3 text-sm font-semibold text-on-error-container">{error}</p> : null}
          <Button type="submit" variant="aurora" disabled={isSaving}>{isSaving ? 'Creating...' : 'Create Teacher'}</Button>
        </form>
      </Modal>
    </div>
  );
}
