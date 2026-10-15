import { CheckCircle2, Plus, RefreshCw, XCircle } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import PageHeader from '../components/common/PageHeader.jsx';
import DataTable from '../components/common/DataTable.jsx';
import Card from '../components/ui/Card.jsx';
import Badge from '../components/ui/Badge.jsx';
import Button from '../components/ui/Button.jsx';
import Input from '../components/ui/Input.jsx';
import Modal from '../components/ui/Modal.jsx';
import { api } from '../services/api.js';
import { useApp } from '../context/AppContext.jsx';
import { hasPermission } from '../utils/permissions.js';

const types = ['SICK', 'PERSONAL', 'DUTY', 'OTHER'];
const tones = { PENDING: 'amber', APPROVED: 'emerald', REJECTED: 'rose', CANCELLED: 'slate' };
const fresh = { type: 'SICK', startDate: '', endDate: '', reason: '' };

export default function LeaveRequestsPage() {
  const { currentRole, currentUser } = useApp();
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(fresh);
  const canReview = currentRole === 'ADMIN' && hasPermission(currentUser, 'leaves:manage');
  const canRequest = ['STUDENT', 'TEACHER'].includes(currentRole);
  const load = useCallback(async () => { setError(''); try { const response = await api.get('/leaves?limit=100'); const rows = response.data?.data || response.data; setRequests(Array.isArray(rows) ? rows : []); } catch (loadError) { setError(loadError.message || 'Unable to load leave requests.'); } }, []);
  useEffect(() => { load(); }, [load]);
  const submit = async (event) => { event.preventDefault(); try { await api.post('/leaves', { ...form, startDate: new Date(`${form.startDate}T00:00:00.000Z`).toISOString(), endDate: new Date(`${form.endDate}T00:00:00.000Z`).toISOString() }); setOpen(false); setForm(fresh); await load(); } catch (submitError) { setError(submitError.message || 'Unable to submit leave request.'); } };
  const review = async (id, status) => { try { await api.patch(`/leaves/${id}/review`, { status }); await load(); } catch (reviewError) { setError(reviewError.message || 'Unable to review leave request.'); } };
  const cancel = async (id) => { try { await api.patch(`/leaves/${id}/cancel`, {}); await load(); } catch (cancelError) { setError(cancelError.message || 'Unable to cancel leave request.'); } };
  const columns = [
    ...(canReview ? [{ key: 'requester', label: 'Requester', render: (row) => <div><p className="font-bold text-on-surface">{row.requester?.firstName} {row.requester?.lastName}</p><p className="text-xs text-on-surface-variant">{row.requester?.role}</p></div> }] : []),
    { key: 'type', label: 'Type', render: (row) => <Badge tone="blue">{row.type}</Badge> },
    { key: 'dates', label: 'Dates', render: (row) => `${new Date(row.startDate).toLocaleDateString()} - ${new Date(row.endDate).toLocaleDateString()}` },
    { key: 'reason', label: 'Reason', render: (row) => <span className="max-w-xs text-sm">{row.reason}</span> },
    { key: 'status', label: 'Status', render: (row) => <Badge tone={tones[row.status] || 'slate'}>{row.status}</Badge> },
    { key: 'actions', label: '', render: (row) => <div className="flex flex-wrap gap-2">{canReview && row.status === 'PENDING' ? <><Button size="sm" variant="secondary" icon={CheckCircle2} onClick={() => review(row.id, 'APPROVED')}>Approve</Button><Button size="sm" variant="secondary" icon={XCircle} onClick={() => review(row.id, 'REJECTED')}>Reject</Button></> : null}{!canReview && row.status === 'PENDING' ? <Button size="sm" variant="secondary" onClick={() => cancel(row.id)}>Cancel</Button> : null}</div> },
  ];
  return <div className="page-shell"><PageHeader eyebrow="Attendance workflow" title="Leave Requests" description={canReview ? 'Review student and teacher leave requests with a clear approval trail.' : 'Submit and track leave requests for your school attendance record.'} actionLabel={canRequest ? 'Request Leave' : undefined} actionIcon={Plus} onAction={() => setOpen(true)} />{error ? <div role="alert" className="flex flex-col gap-3 rounded-xl bg-error-container p-4 text-sm font-semibold text-on-error-container sm:flex-row sm:items-center sm:justify-between"><span>{error}</span><Button size="sm" variant="secondary" icon={RefreshCw} onClick={load}>Retry</Button></div> : null}<Card><DataTable columns={columns} rows={requests} emptyText="No leave requests found." /></Card><Modal open={open} title="Request Leave" description="Requests cannot start in the past and remain editable only while pending." onClose={() => setOpen(false)}><form className="grid gap-3" onSubmit={submit}><select aria-label="Leave type" className="focus-ring min-h-11 rounded-lg border border-outline-variant/70 bg-surface-container-lowest px-3 text-sm font-semibold text-on-surface" value={form.type} onChange={(event) => setForm((value) => ({ ...value, type: event.target.value }))}>{types.map((type) => <option key={type}>{type}</option>)}</select><div className="grid gap-3 sm:grid-cols-2"><Input label="Start date" type="date" value={form.startDate} onChange={(event) => setForm((value) => ({ ...value, startDate: event.target.value }))} required /><Input label="End date" type="date" value={form.endDate} onChange={(event) => setForm((value) => ({ ...value, endDate: event.target.value }))} required /></div><textarea aria-label="Reason" className="focus-ring min-h-28 rounded-lg border border-outline-variant/70 bg-surface-container-lowest px-4 py-3 text-sm font-semibold text-on-surface" placeholder="Reason for leave" value={form.reason} onChange={(event) => setForm((value) => ({ ...value, reason: event.target.value }))} required /><Button type="submit" variant="aurora">Submit Leave Request</Button></form></Modal></div>;
}
