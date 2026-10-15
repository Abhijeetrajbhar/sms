import { Link2, Plus, RefreshCw, KeyRound } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import PageHeader from '../components/common/PageHeader.jsx';
import DataTable from '../components/common/DataTable.jsx';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import Modal from '../components/ui/Modal.jsx';
import Input from '../components/ui/Input.jsx';
import CredentialSlipModal from '../components/common/CredentialSlipModal.jsx';
import { api, onboardingApi } from '../services/api.js';
import { useApp } from '../context/AppContext.jsx';
import { hasPermission } from '../utils/permissions.js';

function generateRandomParentPassword() {
  return `Parent#${Math.floor(1000 + Math.random() * 9000)}`;
}

const initialParentForm = {
  mode: 'NEW', // 'NEW' or 'EXISTING'
  userId: '',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  occupation: '',
  relation: 'Parent',
  emergencyContact: '',
  studentId: '',
  credentialDelivery: 'EMAIL_INVITE',
  temporaryPassword: generateRandomParentPassword(),
};

export default function ParentsPage() {
  const { data, currentUser, retryData } = useApp();
  const [parents, setParents] = useState([]);
  const [parentUsers, setParentUsers] = useState([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState(initialParentForm);
  const [link, setLink] = useState({ parentId: '', studentId: '' });
  const [slipModalOpen, setSlipModalOpen] = useState(false);
  const [slipData, setSlipData] = useState(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const [parentResponse, userResponse] = await Promise.all([
        api.get('/parents?limit=100'),
        hasPermission(currentUser, 'users:view') ? api.get('/users?role=PARENT&limit=100') : Promise.resolve({ data: [] }),
      ]);
      const parentRows = parentResponse.data?.data || parentResponse.data;
      const userRows = userResponse.data?.data || userResponse.data;
      setParents(Array.isArray(parentRows) ? parentRows : []);
      setParentUsers(Array.isArray(userRows) ? userRows : []);
    } catch (loadError) {
      setError(loadError.message || 'Unable to load parents.');
    }
  }, [currentUser]);

  useEffect(() => { load(); }, [load]);

  const handleCreateParent = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setError('');

    try {
      if (form.mode === 'EXISTING' && form.userId) {
        // Complete profile for existing registered user
        const res = await api.post('/parents', {
          userId: form.userId,
          occupation: form.occupation || undefined,
          relation: form.relation || undefined,
          emergencyContact: form.emergencyContact || undefined,
        });
        const parentProfileId = res.data?.id;
        if (form.studentId && parentProfileId) {
          const student = data.students?.find((s) => s.backendId === form.studentId);
          if (student?.backendId) {
            await api.post(`/students/${student.backendId}/link-parent`, { parentId: parentProfileId });
          }
        }
        await api.post(`/users/${form.userId}/invite`);
        setNotice('Parent profile created and invitation dispatched.');
        setCreateOpen(false);
        setForm({ ...initialParentForm, temporaryPassword: generateRandomParentPassword() });
        await load();
        retryData();
      } else {
        // Atomic single-transaction onboarding
        const selectedStudent = data.students?.find((s) => s.backendId === form.studentId);
        const response = await onboardingApi.onboardParent({
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: form.phone || undefined,
          relation: form.relation || undefined,
          occupation: form.occupation || undefined,
          emergencyContact: form.emergencyContact || undefined,
          studentId: selectedStudent?.backendId || undefined,
          credentialDelivery: form.credentialDelivery,
          temporaryPassword: form.credentialDelivery === 'TEMP_PASSWORD' ? form.temporaryPassword : undefined,
        });

        const resData = response.data;
        setSlipData({
          name: `${form.firstName} ${form.lastName}`,
          email: form.email,
          role: 'PARENT',
          className: selectedStudent ? `Linked to ${selectedStudent.name}` : undefined,
          credentialDelivery: form.credentialDelivery,
          temporaryPassword: resData?.temporaryPassword,
          activationUrl: resData?.activationUrl,
        });

        setCreateOpen(false);
        setSlipModalOpen(true);
        setNotice(response.message || 'Parent record onboarded successfully.');
        setForm({ ...initialParentForm, temporaryPassword: generateRandomParentPassword() });
        await load();
        retryData();
      }
    } catch (saveError) {
      setError(saveError.message || 'Unable to onboard parent record.');
    } finally {
      setIsSaving(false);
    }
  };

  const linkStudent = async (event) => {
    event.preventDefault();
    try {
      const student = data.students.find((item) => item.backendId === link.studentId);
      const parent = parents.find((item) => item.id === link.parentId);
      if (!student) throw new Error('Select a valid student.');
      await api.post(`/students/${student.backendId}/link-parent`, { parentId: link.parentId });
      if (parent?.user?.status === 'PENDING_VERIFICATION') {
        await api.post(`/users/${parent.userId}/invite`);
      }
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
      <PageHeader eyebrow="Family records" title="Parent Management" description="Create parent profiles and link verified parent records to one or more students." actionLabel={hasPermission(currentUser, 'parents:create') ? 'Onboard Parent' : undefined} actionIcon={Plus} onAction={() => setCreateOpen(true)} />
      {error ? <div role="alert" className="flex flex-col gap-3 rounded-xl bg-error-container p-4 text-sm font-semibold text-on-error-container sm:flex-row sm:items-center sm:justify-between"><span>{error}</span><Button size="sm" variant="secondary" icon={RefreshCw} onClick={load}>Retry</Button></div> : null}
      {notice ? <div role="status" className="rounded-xl border border-emerald-300/50 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300"><p>{notice}</p></div> : null}
      {hasPermission(currentUser, 'parents:link-student') ? <Card><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-bold uppercase text-primary">Parent-student linking</p><p className="mt-1 text-sm font-semibold text-on-surface-variant">Existing duplicate links are rejected by the backend.</p></div><Button variant="secondary" icon={Link2} onClick={() => setLinkOpen(true)}>Link Student</Button></div></Card> : null}
      <Card><DataTable columns={columns} rows={parents} emptyText="No parent profiles found" /></Card>

      {/* Unified Parent Onboarding Modal */}
      <Modal open={createOpen} size="lg" title="Onboard Parent / Guardian" description="Register guardian credentials and link to their student in one step." onClose={() => setCreateOpen(false)}>
        <form className="grid gap-4" onSubmit={handleCreateParent}>
          {parentUsers.length > 0 ? (
            <div className="flex gap-4 border-b border-outline-variant/40 pb-3">
              <label className="flex cursor-pointer items-center gap-2 text-xs font-bold">
                <input type="radio" name="parentMode" checked={form.mode === 'NEW'} onChange={() => setForm((v) => ({ ...v, mode: 'NEW' }))} />
                Create New Parent Identity
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-xs font-bold">
                <input type="radio" name="parentMode" checked={form.mode === 'EXISTING'} onChange={() => setForm((v) => ({ ...v, mode: 'EXISTING' }))} />
                Select Existing Pending User
              </label>
            </div>
          ) : null}

          {form.mode === 'EXISTING' ? (
            <div>
              <label className="text-xs font-semibold text-on-surface-variant">Select pending parent account</label>
              <select className="focus-ring mt-1 min-h-11 w-full rounded-lg border border-outline-variant/70 bg-surface-container-lowest px-4 text-sm font-semibold text-on-surface" value={form.userId} onChange={(event) => setForm((value) => ({ ...value, userId: event.target.value }))} required>
                <option value="">Select parent user...</option>
                {parentUsers.map((user) => <option key={user.id} value={user.id}>{user.firstName} {user.lastName} / {user.email}</option>)}
              </select>
            </div>
          ) : (
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-primary">Parent Identity</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input placeholder="First name" value={form.firstName} onChange={(event) => setForm((value) => ({ ...value, firstName: event.target.value }))} required />
                <Input placeholder="Last name" value={form.lastName} onChange={(event) => setForm((value) => ({ ...value, lastName: event.target.value }))} required />
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Input type="email" placeholder="Parent email" value={form.email} onChange={(event) => setForm((value) => ({ ...value, email: event.target.value }))} required />
                <Input placeholder="Phone number" value={form.phone} onChange={(event) => setForm((value) => ({ ...value, phone: event.target.value }))} />
              </div>
            </div>
          )}

          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-primary">Relationship & Family Details</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <Input placeholder="Relation (e.g. Mother, Father)" value={form.relation} onChange={(event) => setForm((value) => ({ ...value, relation: event.target.value }))} />
              <Input placeholder="Occupation" value={form.occupation} onChange={(event) => setForm((value) => ({ ...value, occupation: event.target.value }))} />
              <Input placeholder="Emergency contact" value={form.emergencyContact} onChange={(event) => setForm((value) => ({ ...value, emergencyContact: event.target.value }))} />
            </div>

            <div className="mt-3">
              <label className="text-xs font-semibold text-on-surface-variant">Link to Student (optional)</label>
              <select className="focus-ring mt-1 min-h-11 w-full rounded-lg border border-outline-variant/70 bg-surface-container-lowest px-4 text-sm font-semibold text-on-surface" value={form.studentId} onChange={(event) => setForm((value) => ({ ...value, studentId: event.target.value }))}>
                <option value="">Select a student to link...</option>
                {(data.students || []).map((student) => <option key={student.backendId} value={student.backendId}>{student.name} / Class: {student.className || 'General'}</option>)}
              </select>
            </div>
          </div>

          {form.mode === 'NEW' ? (
            <div className="rounded-xl border border-indigo-500/20 bg-indigo-50/40 p-4 dark:border-indigo-500/10 dark:bg-indigo-950/20">
              <p className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">Credential Delivery Strategy</p>
              <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
                <label className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 text-xs font-semibold transition ${form.credentialDelivery === 'EMAIL_INVITE' ? 'border-primary bg-primary/10 text-primary' : 'border-outline-variant/50 bg-surface-container-lowest text-on-surface'}`}>
                  <input type="radio" name="credentialDelivery" value="EMAIL_INVITE" checked={form.credentialDelivery === 'EMAIL_INVITE'} onChange={() => setForm((v) => ({ ...v, credentialDelivery: 'EMAIL_INVITE' }))} className="mt-0.5" />
                  <div>
                    <span className="font-bold">Email Invitation Link</span>
                    <p className="mt-0.5 text-[11px] font-normal opacity-80">Sends a 48-hour secure token via email for self-service password setup.</p>
                  </div>
                </label>
                <label className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 text-xs font-semibold transition ${form.credentialDelivery === 'TEMP_PASSWORD' ? 'border-primary bg-primary/10 text-primary' : 'border-outline-variant/50 bg-surface-container-lowest text-on-surface'}`}>
                  <input type="radio" name="credentialDelivery" value="TEMP_PASSWORD" checked={form.credentialDelivery === 'TEMP_PASSWORD'} onChange={() => setForm((v) => ({ ...v, credentialDelivery: 'TEMP_PASSWORD' }))} className="mt-0.5" />
                  <div>
                    <span className="font-bold">Temporary Password & Slip</span>
                    <p className="mt-0.5 text-[11px] font-normal opacity-80">Generates instant credentials with printable access slip.</p>
                  </div>
                </label>
              </div>
            </div>
          ) : null}

          {error ? <p role="alert" className="rounded-lg bg-error-container p-3 text-xs font-semibold text-on-error-container">{error}</p> : null}

          <div className="mt-2 flex justify-end gap-2 border-t border-outline-variant/40 pt-4">
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button type="submit" variant="aurora" disabled={isSaving}>{isSaving ? 'Saving...' : 'Complete Parent Onboarding'}</Button>
          </div>
        </form>
      </Modal>

      {/* Link Existing Parent to Student Modal */}
      <Modal open={linkOpen} title="Link Parent to Student" description="Link an existing parent profile to an active student." onClose={() => setLinkOpen(false)}>
        <form className="grid gap-3" onSubmit={linkStudent}>
          <select className="focus-ring min-h-11 rounded-lg border border-outline-variant/70 bg-surface-container-lowest px-4 text-sm font-semibold text-on-surface" value={link.parentId} onChange={(event) => setLink((value) => ({ ...value, parentId: event.target.value }))} required><option value="">Select parent</option>{parents.map((parent) => <option key={parent.id} value={parent.id}>{parent.user?.firstName} {parent.user?.lastName}</option>)}</select>
          <select className="focus-ring min-h-11 rounded-lg border border-outline-variant/70 bg-surface-container-lowest px-4 text-sm font-semibold text-on-surface" value={link.studentId} onChange={(event) => setLink((value) => ({ ...value, studentId: event.target.value }))} required><option value="">Select student</option>{data.students.map((student) => <option key={student.backendId} value={student.backendId}>{student.name} / {student.id}</option>)}</select>
          <Button type="submit" variant="aurora">Link Parent and Student</Button>
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
