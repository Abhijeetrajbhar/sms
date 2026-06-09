import { Link2, Plus, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import PageHeader from '../components/common/PageHeader.jsx';
import DataTable from '../components/common/DataTable.jsx';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import Modal from '../components/ui/Modal.jsx';
import Input from '../components/ui/Input.jsx';
import { api } from '../services/api.js';
import { useApp } from '../context/AppContext.jsx';
import { hasPermission } from '../utils/permissions.js';

export default function ParentsPage() {
  const { data, currentUser, retryData } = useApp();
  const [parents, setParents] = useState([]);
  const [parentUsers, setParentUsers] = useState([]);
  const [error, setError] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [form, setForm] = useState({ userId: '', occupation: '', relation: '', emergencyContact: '' });
  const [link, setLink] = useState({ parentId: '', studentId: '' });

  const load = useCallback(async () => {
    setError('');
    try {
      const [parentResponse, userResponse] = await Promise.all([
        api.get('/parents?limit=100'),
        hasPermission(currentUser, 'users:view') ? api.get('/users?role=PARENT&limit=100') : Promise.resolve({ data: [] }),
      ]);
      setParents(Array.isArray(parentResponse.data) ? parentResponse.data : []);
      setParentUsers(Array.isArray(userResponse.data) ? userResponse.data : []);
    } catch (loadError) {
      setError(loadError.message || 'Unable to load parents.');
    }
  }, [currentUser]);

  useEffect(() => { load(); }, [load]);

  const createParent = async (event) => {
    event.preventDefault();
    try {
      await api.post('/parents', form);
      setCreateOpen(false);
      setForm({ userId: '', occupation: '', relation: '', emergencyContact: '' });
      await load();
    } catch (saveError) {
      setError(saveError.message || 'Unable to create parent profile.');
    }
  };

  const linkStudent = async (event) => {
    event.preventDefault();
    try {
      const student = data.students.find((item) => item.backendId === link.studentId);
      if (!student) throw new Error('Select a valid student.');
      await api.post(`/students/${student.backendId}/link-parent`, { parentId: link.parentId });
      setLinkOpen(false);
      setLink({ parentId: '', studentId: '' });
      retryData();
    } catch (linkError) {
      setError(linkError.message || 'Unable to link parent and student.');
    }
  };

  const columns = [
    { key: 'name', label: 'Parent', render: (row) => <div><p className="font-bold text-on-surface">{row.user?.firstName} {row.user?.lastName}</p><p className="text-xs text-on-surface-variant">{row.user?.email}</p></div> },
    { key: 'relation', label: 'Relation', render: (row) => row.relation || 'Not specified' },
    { key: 'occupation', label: 'Occupation', render: (row) => row.occupation || 'Not specified' },
    { key: 'emergencyContact', label: 'Emergency Contact', render: (row) => row.emergencyContact || row.user?.phone || 'Not available' },
  ];

  return (
    <div className="page-shell">
      <PageHeader eyebrow="Family records" title="Parent Management" description="Create parent profiles and link verified parent records to one or more students." actionLabel={hasPermission(currentUser, 'parents:create') ? 'Create Parent Profile' : undefined} actionIcon={Plus} onAction={() => setCreateOpen(true)} />
      {error ? <div role="alert" className="flex flex-col gap-3 rounded-xl bg-error-container p-4 text-sm font-semibold text-on-error-container sm:flex-row sm:items-center sm:justify-between"><span>{error}</span><Button size="sm" variant="secondary" icon={RefreshCw} onClick={load}>Retry</Button></div> : null}
      {hasPermission(currentUser, 'parents:link-student') ? <Card><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-bold uppercase text-primary">Parent-student linking</p><p className="mt-1 text-sm font-semibold text-on-surface-variant">Existing duplicate links are rejected by the backend.</p></div><Button variant="secondary" icon={Link2} onClick={() => setLinkOpen(true)}>Link Student</Button></div></Card> : null}
      <Card><DataTable columns={columns} rows={parents} emptyText="No parent profiles found" /></Card>

      <Modal open={createOpen} title="Create Parent Profile" description="Select an existing parent-role user account." onClose={() => setCreateOpen(false)}>
        <form className="grid gap-3" onSubmit={createParent}>
          <select className="focus-ring min-h-11 rounded-lg border border-outline-variant/70 bg-surface-container-lowest px-4 text-sm font-semibold text-on-surface" value={form.userId} onChange={(event) => setForm((value) => ({ ...value, userId: event.target.value }))} required><option value="">Select parent user</option>{parentUsers.map((user) => <option key={user.id} value={user.id}>{user.firstName} {user.lastName} / {user.email}</option>)}</select>
          <Input placeholder="Relation" value={form.relation} onChange={(event) => setForm((value) => ({ ...value, relation: event.target.value }))} />
          <Input placeholder="Occupation" value={form.occupation} onChange={(event) => setForm((value) => ({ ...value, occupation: event.target.value }))} />
          <Input placeholder="Emergency contact" value={form.emergencyContact} onChange={(event) => setForm((value) => ({ ...value, emergencyContact: event.target.value }))} />
          <Button type="submit" variant="aurora">Create Parent Profile</Button>
        </form>
      </Modal>

      <Modal open={linkOpen} title="Link Parent to Student" description="Link an existing parent profile to an active student." onClose={() => setLinkOpen(false)}>
        <form className="grid gap-3" onSubmit={linkStudent}>
          <select className="focus-ring min-h-11 rounded-lg border border-outline-variant/70 bg-surface-container-lowest px-4 text-sm font-semibold text-on-surface" value={link.parentId} onChange={(event) => setLink((value) => ({ ...value, parentId: event.target.value }))} required><option value="">Select parent</option>{parents.map((parent) => <option key={parent.id} value={parent.id}>{parent.user?.firstName} {parent.user?.lastName}</option>)}</select>
          <select className="focus-ring min-h-11 rounded-lg border border-outline-variant/70 bg-surface-container-lowest px-4 text-sm font-semibold text-on-surface" value={link.studentId} onChange={(event) => setLink((value) => ({ ...value, studentId: event.target.value }))} required><option value="">Select student</option>{data.students.map((student) => <option key={student.backendId} value={student.backendId}>{student.name} / {student.id}</option>)}</select>
          <Button type="submit" variant="aurora">Link Parent and Student</Button>
        </form>
      </Modal>
    </div>
  );
}
