import { Download, Plus, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import PageHeader from '../components/common/PageHeader.jsx';
import DataTable from '../components/common/DataTable.jsx';
import Card from '../components/ui/Card.jsx';
import Input from '../components/ui/Input.jsx';
import Badge from '../components/ui/Badge.jsx';
import ProgressBar from '../components/ui/ProgressBar.jsx';
import Button from '../components/ui/Button.jsx';
import Avatar from '../components/ui/Avatar.jsx';
import Modal from '../components/ui/Modal.jsx';
import { useApp } from '../context/AppContext.jsx';
import { api } from '../services/api.js';
import { hasPermission } from '../utils/permissions.js';
import { riskTone, statusTone } from '../utils/statusStyles.js';
import { exportCsv } from '../utils/exporters.js';

export default function StudentsPage() {
  const { data, currentRole, currentUser, retryData } = useApp();
  const [query, setQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', phone: '', dateOfBirth: '', gender: '', address: '', bloodGroup: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const canCreate = currentRole === 'ADMIN' && hasPermission(currentUser, 'students:create') && hasPermission(currentUser, 'users:create');

  const students = useMemo(() => data.students.filter((student) =>
    [student.name, student.className, student.rollNo, student.parent].join(' ').toLowerCase().includes(query.toLowerCase())
  ), [data.students, query]);

  const columns = currentRole === 'PARENT' ? [
    {
      key: 'name',
      label: 'Linked child',
      render: (row) => (
        <div className="flex items-center gap-3">
          <Avatar name={row.name} size="sm" />
          <div>
            <p className="font-semibold text-on-surface">{row.name}</p>
            <p className="text-xs font-semibold text-on-surface-variant">{row.id}</p>
          </div>
        </div>
      ),
    },
    { key: 'className', label: 'Class' },
    { key: 'academicYear', label: 'Academic Year' },
    { key: 'classTeacher', label: 'Class Teacher' },
  ] : currentRole === 'STUDENT' ? [
    {
      key: 'name',
      label: 'Student profile',
      render: (row) => (
        <div className="flex items-center gap-3">
          <Avatar name={row.name} size="sm" />
          <div>
            <p className="font-semibold text-on-surface">{row.name}</p>
            <p className="text-xs font-semibold text-on-surface-variant">{row.id}</p>
          </div>
        </div>
      ),
    },
    { key: 'className', label: 'Class' },
    { key: 'academicYear', label: 'Academic Year' },
    { key: 'classTeacher', label: 'Class Teacher' },
    { key: 'contact', label: 'Contact' },
    { key: 'bloodGroup', label: 'Blood Group' },
  ] : [
    {
      key: 'name',
      label: 'Student',
      render: (row) => (
        <div className="flex items-center gap-3">
          <Avatar name={row.name} tone={row.risk === 'high' ? 'amber' : 'blue'} size="sm" />
          <div>
            <p className="font-semibold text-on-surface">{row.name}</p>
            <p className="text-xs font-semibold text-on-surface-variant">{row.id} / Roll {row.rollNo}</p>
          </div>
        </div>
      ),
    },
    { key: 'className', label: 'Class' },
    {
      key: 'attendance',
      label: 'Attendance',
      render: (row) => (
        <div className="min-w-36">
          <div className="mb-2 flex justify-between text-xs font-semibold text-on-surface-variant"><span>{row.attendance}%</span><span>{row.grade}</span></div>
          <ProgressBar value={row.attendance} tone={row.attendance < 70 ? 'rose' : row.attendance < 85 ? 'amber' : 'emerald'} />
        </div>
      ),
    },
    { key: 'risk', label: 'Risk', render: (row) => <Badge className={riskTone[row.risk]}>{row.risk}</Badge> },
    ...(currentRole === 'ADMIN' ? [
      { key: 'parent', label: 'Parent' },
      { key: 'fees', label: 'Fees', render: (row) => <Badge className={statusTone[row.fees]}>{row.fees}</Badge> },
    ] : []),
  ];

  const submit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setError('');
    try {
      const account = await api.post('/users', {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        password: form.password,
        phone: form.phone,
        role: 'STUDENT',
      });
      await api.post('/students', {
        userId: account.data.id,
        dateOfBirth: form.dateOfBirth || undefined,
        gender: form.gender || undefined,
        address: form.address || undefined,
        bloodGroup: form.bloodGroup || undefined,
      });
      setForm({ firstName: '', lastName: '', email: '', password: '', phone: '', dateOfBirth: '', gender: '', address: '', bloodGroup: '' });
      setModalOpen(false);
      retryData();
    } catch (submitError) {
      setError(submitError.message || 'Unable to create student.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Student module"
        title={currentRole === 'TEACHER' ? 'My Students' : currentRole === 'PARENT' ? 'My Children' : currentRole === 'STUDENT' ? 'My Profile' : 'Student Intelligence'}
        description={currentRole === 'TEACHER' ? 'Students from your assigned classes and sections only. Sensitive finance and parent details are hidden.' : currentRole === 'PARENT' ? 'Only active student profiles linked to your parent account are shown.' : currentRole === 'STUDENT' ? 'Your verified student profile, class, academic year, and class teacher details.' : 'Search, monitor, and manage students with attendance, grades, risk profile, parent details, and fee status.'}
        actionLabel={canCreate ? 'Add Student' : undefined}
        actionIcon={Plus}
        onAction={canCreate ? () => setModalOpen(true) : undefined}
      />
      <Card>
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {currentRole !== 'STUDENT' ? <Input icon={Search} placeholder="Search by name, class, roll no, parent..." value={query} onChange={(event) => setQuery(event.target.value)} className="md:w-96" /> : <p className="text-sm font-semibold text-on-surface-variant">Only your own profile is available here.</p>}
          {currentRole === 'ADMIN' && hasPermission(currentUser, 'reports:export') ? <Button className="w-full md:w-auto" variant="secondary" icon={Download} onClick={() => exportCsv('students.csv', students)}>Export List</Button> : null}
        </div>
        <DataTable columns={columns} rows={students} />
      </Card>
      <Modal open={modalOpen} title="Add Student" description="Create a student row for admissions and operational tracking." onClose={() => setModalOpen(false)}>
        <form className="grid gap-3" onSubmit={submit}>
          <div className="grid gap-3 sm:grid-cols-2"><Input placeholder="First name" value={form.firstName} onChange={(event) => setForm((value) => ({ ...value, firstName: event.target.value }))} required /><Input placeholder="Last name" value={form.lastName} onChange={(event) => setForm((value) => ({ ...value, lastName: event.target.value }))} required /></div>
          <Input type="email" placeholder="Student email" value={form.email} onChange={(event) => setForm((value) => ({ ...value, email: event.target.value }))} required />
          <Input type="password" placeholder="Temporary password" value={form.password} onChange={(event) => setForm((value) => ({ ...value, password: event.target.value }))} required />
          <Input placeholder="Phone" value={form.phone} onChange={(event) => setForm((value) => ({ ...value, phone: event.target.value }))} />
          <div className="grid gap-3 sm:grid-cols-2"><Input type="date" value={form.dateOfBirth} onChange={(event) => setForm((value) => ({ ...value, dateOfBirth: event.target.value }))} /><Input placeholder="Blood group" value={form.bloodGroup} onChange={(event) => setForm((value) => ({ ...value, bloodGroup: event.target.value }))} /></div>
          <select className="focus-ring h-11 rounded-lg border border-outline-variant/70 bg-surface-container-lowest px-4 text-sm font-semibold text-on-surface" value={form.gender} onChange={(event) => setForm((value) => ({ ...value, gender: event.target.value }))}><option value="">Gender</option><option value="MALE">Male</option><option value="FEMALE">Female</option><option value="OTHER">Other</option></select>
          <Input placeholder="Address" value={form.address} onChange={(event) => setForm((value) => ({ ...value, address: event.target.value }))} />
          {error ? <p className="rounded-lg bg-error-container p-3 text-sm font-semibold text-on-error-container">{error}</p> : null}
          <Button type="submit" variant="aurora" className="mt-2" disabled={isSaving}>{isSaving ? 'Creating...' : 'Create Student'}</Button>
        </form>
      </Modal>
    </div>
  );
}
