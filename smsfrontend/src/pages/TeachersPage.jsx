import { Plus, RefreshCw, KeyRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import PageHeader from '../components/common/PageHeader.jsx';
import Card from '../components/ui/Card.jsx';
import Avatar from '../components/ui/Avatar.jsx';
import Badge from '../components/ui/Badge.jsx';
import ProgressBar from '../components/ui/ProgressBar.jsx';
import Button from '../components/ui/Button.jsx';
import Input from '../components/ui/Input.jsx';
import Modal from '../components/ui/Modal.jsx';
import CredentialSlipModal from '../components/common/CredentialSlipModal.jsx';
import { useApp } from '../context/AppContext.jsx';
import { statusTone } from '../utils/statusStyles.js';
import { api, onboardingApi } from '../services/api.js';
import { hasPermission } from '../utils/permissions.js';

function generateRandomFacultyPassword() {
  return `Faculty#${Math.floor(1000 + Math.random() * 9000)}`;
}

const initialTeacherForm = {
  userId: '',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  qualification: '',
  specialization: '',
  experience: '',
  credentialDelivery: 'EMAIL_INVITE',
  temporaryPassword: generateRandomFacultyPassword(),
};

export default function TeachersPage() {
  const { data, currentRole, currentUser, retryData } = useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(initialTeacherForm);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [notice, setNotice] = useState('');
  const [activationLink, setActivationLink] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [slipModalOpen, setSlipModalOpen] = useState(false);
  const [slipData, setSlipData] = useState(null);

  const canCreate = currentRole === 'ADMIN' && hasPermission(currentUser, 'teachers:create') && hasPermission(currentUser, 'users:create');

  useEffect(() => {
    if (!canCreate || !modalOpen) return;
    api.get('/users?role=TEACHER&status=PENDING_VERIFICATION&profileMissing=true&limit=100')
      .then((response) => {
        const rows = response.data?.data || response.data;
        setPendingUsers(Array.isArray(rows) ? rows : []);
      })
      .catch(() => setPendingUsers([]));
  }, [canCreate, modalOpen]);

  const submit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setError('');

    try {
      if (form.userId) {
        // Complete legacy pending account
        await api.post('/teachers', {
          userId: form.userId,
          qualification: form.qualification || undefined,
          specialization: form.specialization || undefined,
          experience: form.experience ? Number(form.experience) : undefined,
        });
        const invitation = await api.post(`/users/${form.userId}/invite`);
        setNotice(invitation.message || 'Teacher account created and invitation prepared.');
        setActivationLink(invitation.data?.activationUrl || '');
        setModalOpen(false);
        setForm({ ...initialTeacherForm, temporaryPassword: generateRandomFacultyPassword() });
        retryData();
      } else {
        // Atomic single-transaction onboarding
        const response = await onboardingApi.onboardTeacher({
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: form.phone || undefined,
          qualification: form.qualification || undefined,
          specialization: form.specialization || undefined,
          experience: form.experience ? Number(form.experience) : undefined,
          credentialDelivery: form.credentialDelivery,
          temporaryPassword: form.credentialDelivery === 'TEMP_PASSWORD' ? form.temporaryPassword : undefined,
        });

        const resData = response.data;
        setSlipData({
          name: `${form.firstName} ${form.lastName}`,
          email: form.email,
          code: resData?.teacher?.employeeCode,
          role: 'FACULTY',
          credentialDelivery: form.credentialDelivery,
          temporaryPassword: resData?.temporaryPassword,
          activationUrl: resData?.activationUrl,
        });

        setModalOpen(false);
        setSlipModalOpen(true);
        setNotice(response.message || 'Faculty member onboarded successfully.');
        setForm({ ...initialTeacherForm, temporaryPassword: generateRandomFacultyPassword() });
        retryData();
      }
    } catch (submitError) {
      setError(submitError.message || 'Unable to onboard faculty member.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="page-shell">
      <PageHeader eyebrow="Faculty module" title="Faculty Operations" description="View teacher workload, subject ownership, assigned classes, and availability status." actionLabel={canCreate ? 'Add Teacher' : undefined} actionIcon={Plus} onAction={() => setModalOpen(true)} />
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

      {/* Teacher Onboarding Modal */}
      <Modal open={modalOpen} size="lg" title="Add Faculty Member" description="Enroll faculty identity, academic qualifications, and configure credential delivery." onClose={() => setModalOpen(false)}>
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
                <option value="">Enroll a new faculty identity (default)</option>
                {pendingUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    Complete pending: {user.firstName} {user.lastName} ({user.email})
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-primary">Faculty Identity</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input placeholder="First name" value={form.firstName} onChange={(event) => setForm((value) => ({ ...value, firstName: event.target.value }))} required disabled={Boolean(form.userId)} />
              <Input placeholder="Last name" value={form.lastName} onChange={(event) => setForm((value) => ({ ...value, lastName: event.target.value }))} required disabled={Boolean(form.userId)} />
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Input type="email" placeholder="Teacher email" value={form.email} onChange={(event) => setForm((value) => ({ ...value, email: event.target.value }))} required disabled={Boolean(form.userId)} />
              <Input placeholder="Phone" value={form.phone} onChange={(event) => setForm((value) => ({ ...value, phone: event.target.value }))} disabled={Boolean(form.userId)} />
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-primary">Academic Qualifications</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <Input placeholder="Qualification (e.g. M.Sc., B.Ed.)" value={form.qualification} onChange={(event) => setForm((value) => ({ ...value, qualification: event.target.value }))} />
              <Input placeholder="Specialization (e.g. Mathematics)" value={form.specialization} onChange={(event) => setForm((value) => ({ ...value, specialization: event.target.value }))} />
              <Input type="number" min="0" placeholder="Experience (years)" value={form.experience} onChange={(event) => setForm((value) => ({ ...value, experience: event.target.value }))} />
            </div>
          </div>

          {!form.userId ? (
            <div className="rounded-xl border border-indigo-500/20 bg-indigo-50/40 p-4 dark:border-indigo-500/10 dark:bg-indigo-950/20">
              <p className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">Credential Delivery Strategy</p>
              <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
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
                    <span className="font-bold">Email Invitation Link</span>
                    <p className="mt-0.5 text-[11px] font-normal opacity-80">Sends a 48-hour secure token via email for self-service password creation.</p>
                  </div>
                </label>

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
                    <p className="mt-0.5 text-[11px] font-normal opacity-80">Generates instant login credentials with printable appointment slip.</p>
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
                    onClick={() => setForm((v) => ({ ...v, temporaryPassword: generateRandomFacultyPassword() }))}
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
            <Button type="submit" variant="aurora" disabled={isSaving}>{isSaving ? 'Creating...' : 'Create Teacher'}</Button>
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
