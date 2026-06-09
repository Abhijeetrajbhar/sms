import { Plus, RefreshCw, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import PageHeader from '../components/common/PageHeader.jsx';
import DataTable from '../components/common/DataTable.jsx';
import Card from '../components/ui/Card.jsx';
import Badge from '../components/ui/Badge.jsx';
import Button from '../components/ui/Button.jsx';
import Input from '../components/ui/Input.jsx';
import Modal from '../components/ui/Modal.jsx';
import { api } from '../services/api.js';
import { useApp } from '../context/AppContext.jsx';
import { hasPermission, isSuperAdmin } from '../utils/permissions.js';

const emptyForm = { firstName: '', lastName: '', email: '', phone: '', password: '', role: 'STUDENT' };

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

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/users?limit=100');
      setUsers(Array.isArray(response.data) ? response.data : []);
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
      await api.post('/users', form);
      setForm(emptyForm);
      setCreateOpen(false);
      await load();
    } catch (saveError) {
      setError(saveError.message || 'Unable to create user.');
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
          {hasPermission(currentUser, 'users:update') && row.id !== currentUser.id ? (
            <Button size="sm" variant="secondary" onClick={() => updateStatus(row, row.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE')}>{row.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}</Button>
          ) : null}
          {isSuperAdmin(currentUser) && row.role === 'ADMIN' ? <Button size="sm" variant="secondary" icon={ShieldCheck} onClick={() => openPermissions(row)}>Permissions</Button> : null}
        </div>
      ),
    },
  ];

  return (
    <div className="page-shell">
      <PageHeader eyebrow="Administration" title="Users & Roles" description="Manage active accounts, roles, status, and admin permissions without exposing passwords or private tokens." actionLabel={hasPermission(currentUser, 'users:create') ? 'Create User' : undefined} actionIcon={Plus} onAction={() => setCreateOpen(true)} />
      {error ? <div role="alert" className="flex flex-col gap-3 rounded-xl bg-error-container p-4 text-sm font-semibold text-on-error-container sm:flex-row sm:items-center sm:justify-between"><span>{error}</span><Button size="sm" variant="secondary" icon={RefreshCw} onClick={load}>Retry</Button></div> : null}
      <Card><DataTable columns={columns} rows={users} emptyText={loading ? 'Loading users...' : 'No users found'} /></Card>

      <Modal open={createOpen} title="Create User" description="Create a school account. Admin accounts can only be created by a super admin." onClose={() => setCreateOpen(false)}>
        <form className="grid gap-3" onSubmit={createUser}>
          <div className="grid gap-3 sm:grid-cols-2"><Input placeholder="First name" value={form.firstName} onChange={(event) => setForm((value) => ({ ...value, firstName: event.target.value }))} required /><Input placeholder="Last name" value={form.lastName} onChange={(event) => setForm((value) => ({ ...value, lastName: event.target.value }))} required /></div>
          <Input type="email" placeholder="Email" value={form.email} onChange={(event) => setForm((value) => ({ ...value, email: event.target.value }))} required />
          <Input placeholder="Phone" value={form.phone} onChange={(event) => setForm((value) => ({ ...value, phone: event.target.value }))} />
          <Input type="password" placeholder="Temporary password" value={form.password} onChange={(event) => setForm((value) => ({ ...value, password: event.target.value }))} required />
          <select className="focus-ring min-h-11 rounded-lg border border-outline-variant/70 bg-surface-container-lowest px-4 text-sm font-semibold text-on-surface" value={form.role} onChange={(event) => setForm((value) => ({ ...value, role: event.target.value }))}>
            {['STUDENT', 'TEACHER', 'PARENT', ...(isSuperAdmin(currentUser) ? ['ADMIN'] : [])].map((role) => <option key={role}>{role}</option>)}
          </select>
          <Button type="submit" variant="aurora" disabled={saving}>{saving ? 'Creating...' : 'Create User'}</Button>
        </form>
      </Modal>

      <Modal open={Boolean(permissionUser)} title="Admin Permissions" description="An empty permission list is reserved for legacy super-admin compatibility." onClose={() => setPermissionUser(null)}>
        {permissionUser ? <div className="grid gap-4">
          <label className="flex min-h-11 items-center gap-3 rounded-xl bg-surface-container-low p-3 text-sm font-bold"><input type="checkbox" checked={Boolean(permissionUser.isSuperAdmin)} onChange={(event) => setPermissionUser((value) => ({ ...value, isSuperAdmin: event.target.checked }))} />Explicit super admin</label>
          <div className="grid max-h-80 gap-2 overflow-y-auto sm:grid-cols-2">{catalog.map((permission) => <label key={permission} className="flex min-h-11 items-center gap-2 rounded-lg border border-outline-variant/50 p-3 text-xs font-semibold"><input type="checkbox" checked={permissionUser.permissions.includes(permission)} onChange={(event) => setPermissionUser((value) => ({ ...value, permissions: event.target.checked ? [...value.permissions, permission] : value.permissions.filter((item) => item !== permission) }))} />{permission}</label>)}</div>
          <Button variant="aurora" disabled={saving} onClick={savePermissions}>{saving ? 'Saving...' : 'Save Permissions'}</Button>
        </div> : null}
      </Modal>
    </div>
  );
}
