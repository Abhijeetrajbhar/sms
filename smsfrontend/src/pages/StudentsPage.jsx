import { Download, Plus, Search, RefreshCw, KeyRound, Mail, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import PageHeader from '../components/common/PageHeader.jsx';
import DataTable from '../components/common/DataTable.jsx';
import Card from '../components/ui/Card.jsx';
import Input from '../components/ui/Input.jsx';
import Badge from '../components/ui/Badge.jsx';
import ProgressBar from '../components/ui/ProgressBar.jsx';
import Button from '../components/ui/Button.jsx';
import Avatar from '../components/ui/Avatar.jsx';
import Modal from '../components/ui/Modal.jsx';
import CredentialSlipModal from '../components/common/CredentialSlipModal.jsx';
import { useApp } from '../context/AppContext.jsx';
import { api, onboardingApi } from '../services/api.js';
import { hasPermission } from '../utils/permissions.js';
import { riskTone, statusTone } from '../utils/statusStyles.js';
import { exportCsv } from '../utils/exporters.js';

function generateRandomPassword() {
  return `Oryx#${Math.floor(1000 + Math.random() * 9000)}`;
}

const initialForm = {
  userId: '',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  dateOfBirth: '',
  gender: '',
  address: '',
  bloodGroup: '',
  classId: '',
  credentialDelivery: 'TEMP_PASSWORD',
  temporaryPassword: generateRandomPassword(),
};

export default function StudentsPage() {
  const { data, currentRole, currentUser, retryData } = useApp();
  const [query, setQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [notice, setNotice] = useState('');
  const [activationLink, setActivationLink] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [slipModalOpen, setSlipModalOpen] = useState(false);
  const [slipData, setSlipData] = useState(null);

  const canCreate = currentRole === 'ADMIN' && hasPermission(currentUser, 'students:create') && hasPermission(currentUser, 'users:create');

  useEffect(() => {
    if (!canCreate || !modalOpen) return;
    api.get('/users?role=STUDENT&status=PENDING_VERIFICATION&profileMissing=true&limit=100')
      .then((response) => {
        const rows = response.data?.data || response.data;
        setPendingUsers(Array.isArray(rows) ? rows : []);
      })
      .catch(() => setPendingUsers([]));
  }, [canCreate, modalOpen]);

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
      if (form.userId) {
        // Complete legacy pending account
        await api.post('/students', {
          userId: form.userId,
          dateOfBirth: form.dateOfBirth || undefined,
          gender: form.gender || undefined,
          address: form.address || undefined,
          bloodGroup: form.bloodGroup || undefined,
        });
        if (form.classId) {
          const studentProfileRes = await api.get(`/users/${form.userId}`);
          const profileId = studentProfileRes.data?.studentProfile?.id;
          if (profileId) await api.post(`/students/${profileId}/assign-class`, { classId: form.classId });
        }
        const invitation = await api.post(`/users/${form.userId}/invite`);
        setNotice(invitation.message || 'Student profile created and invitation prepared.');
        setActivationLink(invitation.data?.activationUrl || '');
        setModalOpen(false);
        setForm({ ...initialForm, temporaryPassword: generateRandomPassword() });
        retryData();
      } else {
        // Atomic single-transaction onboarding
        const response = await onboardingApi.onboardStudent({
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: form.phone || undefined,
          dateOfBirth: form.dateOfBirth || undefined,
          gender: form.gender || undefined,
          address: form.address || undefined,
          bloodGroup: form.bloodGroup || undefined,
          classId: form.classId || undefined,
          credentialDelivery: form.credentialDelivery,
          temporaryPassword: form.credentialDelivery === 'TEMP_PASSWORD' ? form.temporaryPassword : undefined,
        });

        const resData = response.data;
        const assignedClass = data.classes?.find((c) => c.id === form.classId);
        const classNameText = assignedClass ? `${assignedClass.name} - Section ${assignedClass.section}` : '';

        setSlipData({
          name: `${form.firstName} ${form.lastName}`,
          email: form.email,
          code: resData?.student?.studentCode,
          role: 'STUDENT',
          className: classNameText,
          credentialDelivery: form.credentialDelivery,
          temporaryPassword: resData?.temporaryPassword,
          activationUrl: resData?.activationUrl,
        });

        setModalOpen(false);
        setSlipModalOpen(true);
        setNotice(response.message || 'Student admission registered successfully.');
        setForm({ ...initialForm, temporaryPassword: generateRandomPassword() });
        retryData();
      }
    } catch (submitError) {
      setError(submitError.message || 'Unable to complete student admission.');
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
        actionLabel={canCreate ? 'New Admission' : undefined}
        actionIcon={Plus}
        onAction={canCreate ? () => setModalOpen(true) : undefined}
      />
      {notice ? (
        <div role="status" className="rounded-xl border border-emerald-300/50 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
          <p>{notice}</p>
          {activationLink ? (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-xs text-on-surface-variant">Activation link:</span>
              <a className="break-all font-mono text-xs text-primary underline" href={activationLink}>{activationLink}</a>
            </div>
          ) : null}
        </div>
      ) : null}
      <Card>
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {currentRole !== 'STUDENT' ? <Input icon={Search} placeholder="Search by name, class, roll no, parent..." value={query} onChange={(event) => setQuery(event.target.value)} className="md:w-96" /> : <p className="text-sm font-semibold text-on-surface-variant">Only your own profile is available here.</p>}
          {currentRole === 'ADMIN' && hasPermission(currentUser, 'reports:export') ? <Button className="w-full md:w-auto" variant="secondary" icon={Download} onClick={() => exportCsv('students.csv', students)}>Export List</Button> : null}
        </div>
        <DataTable columns={columns} rows={students} />
      </Card>

      {/* Unified Student Admission Modal */}
      <Modal open={modalOpen} size="lg" title="Student Admission & Onboarding" description="Enroll student, assign academic class, and generate credentials atomically in a single step." onClose={() => setModalOpen(false)}>
        <form className="grid gap-4" onSubmit={submit}>
          {pendingUsers.length > 0 ? (
            <div className="rounded-xl border border-outline-variant/40 bg-surface-container-low p-3">
              <label className="text-xs font-bold text-on-surface-variant">Link existing pending user (optional)</label>
              <select
                className="focus-ring mt-1.5 h-10 w-full rounded-lg border border-outline-variant/70 bg-surface-container-lowest px-3 text-xs font-semibold text-on-surface"
                value={form.userId}
                onChange={(event) => {
                  const user = pendingUsers.find((item) => item.id === event.target.value);
                  setForm((value) => ({
                    ...value,
                    userId: event.target.value,
                    firstName: user?.firstName || '',
                    lastName: user?.lastName || '',
                    email: user?.email || '',
                    phone: user?.phone || '',
                  }));
                }}
              >
                <option value="">Enroll a new student identity (default)</option>
                {pendingUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    Complete pending: {user.firstName} {user.lastName} ({user.email})
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {/* Identity Fields */}
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-primary">Student Identity</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input placeholder="First name" value={form.firstName} onChange={(event) => setForm((value) => ({ ...value, firstName: event.target.value }))} required disabled={Boolean(form.userId)} />
              <Input placeholder="Last name" value={form.lastName} onChange={(event) => setForm((value) => ({ ...value, lastName: event.target.value }))} required disabled={Boolean(form.userId)} />
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Input type="email" placeholder="Student email" value={form.email} onChange={(event) => setForm((value) => ({ ...value, email: event.target.value }))} required disabled={Boolean(form.userId)} />
              <Input placeholder="Phone (optional)" value={form.phone} onChange={(event) => setForm((value) => ({ ...value, phone: event.target.value }))} disabled={Boolean(form.userId)} />
            </div>
          </div>

          {/* Academic & Class Placement */}
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-primary">Academic Placement</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-on-surface-variant">Class & Section</label>
                <select
                  className="focus-ring mt-1 h-11 w-full rounded-lg border border-outline-variant/70 bg-surface-container-lowest px-3 text-sm font-semibold text-on-surface"
                  value={form.classId}
                  onChange={(event) => setForm((value) => ({ ...value, classId: event.target.value }))}
                >
                  <option value="">Select class & section...</option>
                  {(data.classes || []).map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} - Section {cls.section} ({cls.mentor})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-on-surface-variant">Date of Birth</label>
                <Input type="date" value={form.dateOfBirth} onChange={(event) => setForm((value) => ({ ...value, dateOfBirth: event.target.value }))} className="mt-1" />
              </div>
            </div>
          </div>

          {/* Personal Details */}
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-primary">Personal Details</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <select className="focus-ring h-11 rounded-lg border border-outline-variant/70 bg-surface-container-lowest px-3 text-sm font-semibold text-on-surface" value={form.gender} onChange={(event) => setForm((value) => ({ ...value, gender: event.target.value }))}>
                <option value="">Select Gender</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
              <Input placeholder="Blood group (e.g. O+, A+)" value={form.bloodGroup} onChange={(event) => setForm((value) => ({ ...value, bloodGroup: event.target.value }))} />
            </div>
            <Input placeholder="Residential address" value={form.address} onChange={(event) => setForm((value) => ({ ...value, address: event.target.value }))} className="mt-3" />
          </div>

          {/* Credential Delivery Mode */}
          {!form.userId ? (
            <div className="rounded-xl border border-indigo-500/20 bg-indigo-50/40 p-4 dark:border-indigo-500/10 dark:bg-indigo-950/20">
              <p className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">Credential Delivery Strategy</p>
              <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
                <label className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 text-xs font-semibold transition ${form.credentialDelivery === 'TEMP_PASSWORD' ? 'border-primary bg-primary/10 text-primary' : 'border-outline-variant/50 bg-surface-container-lowest text-on-surface'}`}>
                  <input
                    type="radio"
                    name="credentialDelivery"
                    value="TEMP_PASSWORD"
                    checked={form.credentialDelivery === 'TEMP_PASSWORD'}
                    onChange={() => setForm((v) => ({ ...v, credentialDelivery: 'TEMP_PASSWORD' }))}
                    className="mt-0.5"
                  />
                  <div>
                    <span className="font-bold">Temporary Password & Slip</span>
                    <p className="mt-0.5 text-[11px] font-normal opacity-80">Generates instant login credentials with printable admission slip (forced change on first login).</p>
                  </div>
                </label>

                <label className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 text-xs font-semibold transition ${form.credentialDelivery === 'EMAIL_INVITE' ? 'border-primary bg-primary/10 text-primary' : 'border-outline-variant/50 bg-surface-container-lowest text-on-surface'}`}>
                  <input
                    type="radio"
                    name="credentialDelivery"
                    value="EMAIL_INVITE"
                    checked={form.credentialDelivery === 'EMAIL_INVITE'}
                    onChange={() => setForm((v) => ({ ...v, credentialDelivery: 'EMAIL_INVITE' }))}
                    className="mt-0.5"
                  />
                  <div>
                    <span className="font-bold">Email Activation Link</span>
                    <p className="mt-0.5 text-[11px] font-normal opacity-80">Sends a 48-hour secure token via email for self-service password setup.</p>
                  </div>
                </label>
              </div>

              {form.credentialDelivery === 'TEMP_PASSWORD' ? (
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex-1">
                    <Input
                      placeholder="Temporary Password"
                      value={form.temporaryPassword}
                      onChange={(e) => setForm((v) => ({ ...v, temporaryPassword: e.target.value }))}
                      required
                    />
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    icon={RefreshCw}
                    onClick={() => setForm((v) => ({ ...v, temporaryPassword: generateRandomPassword() }))}
                  >
                    Shuffle
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}

          {error ? <p role="alert" className="rounded-lg bg-error-container p-3 text-xs font-semibold text-on-error-container">{error}</p> : null}

          <div className="mt-2 flex justify-end gap-2 border-t border-outline-variant/40 pt-4">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="aurora" disabled={isSaving}>
              {isSaving ? 'Enrolling Student...' : 'Complete Admission'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Credential Slip Modal */}
      <CredentialSlipModal
        open={slipModalOpen}
        data={slipData}
        onClose={() => setSlipModalOpen(false)}
      />
    </div>
  );
}
