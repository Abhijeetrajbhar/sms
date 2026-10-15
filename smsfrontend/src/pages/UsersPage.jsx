import { Copy, MailCheck, Plus, RefreshCw, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import PageHeader from '../components/common/PageHeader.jsx';
import DataTable from '../components/common/DataTable.jsx';
import Card from '../components/ui/Card.jsx';
import Badge from '../components/ui/Badge.jsx';
import Button from '../components/ui/Button.jsx';
import Input from '../components/ui/Input.jsx';
import Modal from '../components/ui/Modal.jsx';
import { api, onboardingApi } from '../services/api.js';
import { useApp } from '../context/AppContext.jsx';
import { hasPermission, isSuperAdmin } from '../utils/permissions.js';

const emptyForm = { firstName: '', lastName: '', email: '', phone: '', role: 'STUDENT' };

export default function UsersPage() {
  const { currentUser } = useApp();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [permissionUser, setPermissionUser] = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [activationLink, setActivationLink] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/users?limit=100');
      const rows = response.data?.data || response.data;
      setUsers(Array.isArray(rows) ? rows : []);
    } catch (loadError) {
      setError(loadError.message || 'Unable to load users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const createUser = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const response = await api.post('/users', form);
      setNotice(response.message || 'User invitation created.');
      setActivationLink(response.data?.activationUrl || '');
      setForm(emptyForm);
      setCreateOpen(false);
      await load();
    } catch (saveError) {
      setError(saveError.message || 'Unable to create user.');
    } finally {
      setSaving(false);
    }
  };

  const copyActivationLink = async (user) => {
    setSaving(true);
    setError('');
    try {
      const response = await onboardingApi.getActivationLink(user.id);
      const link = response.data?.activationUrl;
      if (link) {
        await navigator.clipboard.writeText(link);
        setNotice(`Activation link for ${user.firstName} copied to clipboard!`);
        setActivationLink(link);
      }
    } catch (linkError) {
      setError(linkError.message || 'Unable to retrieve activation link.');
    } finally {
      setSaving(false);
    }
  };

  const inviteUser = async (user) => {
    setSaving(true);
    setError('');
    setNotice('');
    setActivationLink('');
    try {
      const response = await api.post(`/users/${user.id}/invite`);
      setNotice(response.message || 'Invitation created.');
      setActivationLink(response.data?.activationUrl || '');
      await load();
    } catch (inviteError) {
      setError(inviteError.message || 'Unable to send account invitation.');
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (user, status) => {
    setError('');
    try {
      await api.patch(`/users/${user.id}/status`, { status });
      await load();
    } catch (updateError) {
      setError(updateError.message || 'Unable to update user status.');
    }
  };

  const openPermissions = async (user) => {
    try {
      const response = await api.get('/users/permissions/catalog');
      setCatalog(Array.isArray(response.data) ? response.data : []);
      setPermissionUser({ ...user, permissions: user.permissions || [] });
    } catch (permissionError) {
      setError(permissionError.message || 'Unable to load permissions.');
    }
  };

  const savePermissions = async () => {
    setSaving(true);
    try {
      await api.patch(`/users/${permissionUser.id}/permissions`, {
        permissions: permissionUser.permissions,
        isSuperAdmin: permissionUser.isSuperAdmin,
      });
      setPermissionUser(null);
      await load();
    } catch (saveError) {
      setError(saveError.message || 'Unable to update permissions.');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { key: 'name', label: 'User', render: (row) => <div><p className="font-bold text-on-surface">{row.firstName} {row.lastName}</p><p className="text-xs text-on-surface-variant">{row.email}</p></div> },
    { key: 'role', label: 'Role', render: (row) => <Badge tone={row.role === 'ADMIN' ? 'violet' : 'blue'}>{row.role}</Badge> },
    { key: 'status', label: 'Status', render: (row) => <Badge tone={row.status === 'ACTIVE' ? 'emerald' : 'amber'}>{row.status.replaceAll('_', ' ')}</Badge> },
    { key: 'lastLoginAt', label: 'Last Login', render: (row) => row.lastLoginAt ? String(row.lastLoginAt).slice(0, 16).replace('T', ' ') : 'Never' },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          {hasPermission(currentUser, 'users:update') && row.id !== currentUser.id && row.status === 'PENDING_VERIFICATION' ? (
            <>
              <Button size="sm" icon={MailCheck} disabled={saving} onClick={() => inviteUser(row)}>{row.emailVerifyExpires ? 'Resend Invite' : 'Approve & Invite'}</Button>
              <Button size="sm" variant="secondary" icon={Copy} disabled={saving} onClick={() => copyActivationLink(row)}>Copy Link</Button>
            </>
          ) : null}
          {hasPermission(currentUser, 'users:update') && row.id !== currentUser.id && row.status !== 'PENDING_VERIFICATION' ? (
            <Button size="sm" variant="secondary" onClick={() => updateStatus(row, row.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE')}>{row.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}</Button>
          ) : null}
          {isSuperAdmin(currentUser) && row.role === 'ADMIN' ? <Button size="sm" variant="secondary" icon={ShieldCheck} onClick={() => openPermissions(row)}>Permissions</Button> : null}
        </div>
      ),
    },
  ];

  return (
    <div className="page-shell">
      <PageHeader eyebrow="Administration" title="Users & Roles" description="Approve access requests, invite school users, control status, and manage admin permissions without handling user passwords." actionLabel={hasPermission(currentUser, 'users:create') ? 'Invite User' : undefined} actionIcon={Plus} onAction={() => setCreateOpen(true)} />
      {error ? <div role="alert" className="flex flex-col gap-3 rounded-xl bg-error-container p-4 text-sm font-semibold text-on-error-container sm:flex-row sm:items-center sm:justify-between"><span>{error}</span><Button size="sm" variant="secondary" icon={RefreshCw} onClick={load}>Retry</Button></div> : null}
      {notice ? <div role="status" className="rounded-xl border border-emerald-300/50 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300"><p>{notice}</p>{activationLink ? <a className="mt-2 block break-all font-mono text-xs text-primary underline" href={activationLink}>{activationLink}</a> : null}</div> : null}
      <Card><DataTable columns={columns} rows={users} emptyText={loading ? 'Loading users...' : 'No users found'} /></Card>

      <Modal open={createOpen} title="Create School Identity" description="Create an administrative account or general user identity." onClose={() => setCreateOpen(false)}>
        <form className="grid gap-3" onSubmit={createUser}>
          <div className="rounded-xl border border-indigo-500/20 bg-indigo-50/50 p-3 text-xs leading-5 text-indigo-900 dark:border-indigo-500/10 dark:bg-indigo-950/20 dark:text-indigo-200">
            <span className="font-bold">Recommended workflow:</span> For Students with class assignment & temporary credential slips, visit <strong>Student Intelligence &rarr; New Admission</strong>. For Faculty with qualifications & workload, visit <strong>Faculty Operations &rarr; Add Teacher</strong>.
          </div>
          <div className="grid gap-3 sm:grid-cols-2"><Input placeholder="First name" value={form.firstName} onChange={(event) => setForm((value) => ({ ...value, firstName: event.target.value }))} required /><Input placeholder="Last name" value={form.lastName} onChange={(event) => setForm((value) => ({ ...value, lastName: event.target.value }))} required /></div>
          <Input type="email" placeholder="Email" value={form.email} onChange={(event) => setForm((value) => ({ ...value, email: event.target.value }))} required />
          <Input placeholder="Phone" value={form.phone} onChange={(event) => setForm((value) => ({ ...value, phone: event.target.value }))} />
          <select className="focus-ring min-h-11 rounded-lg border border-outline-variant/70 bg-surface-container-lowest px-4 text-sm font-semibold text-on-surface" value={form.role} onChange={(event) => setForm((value) => ({ ...value, role: event.target.value }))}>
            {['ADMIN', 'TEACHER', 'STUDENT', 'PARENT'].filter((r) => r === 'ADMIN' ? isSuperAdmin(currentUser) : true).map((role) => <option key={role}>{role}</option>)}
          </select>
          <Button type="submit" variant="aurora" disabled={saving}>{saving ? 'Creating identity...' : form.role === 'ADMIN' ? 'Create & Send Invitation' : 'Create Pending Identity'}</Button>
        </form>
      </Modal>

      <Modal open={Boolean(permissionUser)} title="Admin Permissions" description="Super admin access is controlled only by the explicit super-admin flag." onClose={() => setPermissionUser(null)}>
        {permissionUser ? <div className="grid gap-4">
          <label className="flex min-h-11 items-center gap-3 rounded-xl bg-surface-container-low p-3 text-sm font-bold"><input type="checkbox" checked={Boolean(permissionUser.isSuperAdmin)} onChange={(event) => setPermissionUser((value) => ({ ...value, isSuperAdmin: event.target.checked }))} />Explicit super admin</label>
          <div className="grid max-h-80 gap-2 overflow-y-auto sm:grid-cols-2">{catalog.map((permission) => <label key={permission} className="flex min-h-11 items-center gap-2 rounded-lg border border-outline-variant/50 p-3 text-xs font-semibold"><input type="checkbox" checked={permissionUser.permissions.includes(permission)} onChange={(event) => setPermissionUser((value) => ({ ...value, permissions: event.target.checked ? [...value.permissions, permission] : value.permissions.filter((item) => item !== permission) }))} />{permission}</label>)}</div>
          <Button variant="aurora" disabled={saving} onClick={savePermissions}>{saving ? 'Saving...' : 'Save Permissions'}</Button>
        </div> : null}
      </Modal>
    </div>
  );
}
