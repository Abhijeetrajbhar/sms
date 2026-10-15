import { CheckCircle2, GraduationCap, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import PageHeader from '../components/common/PageHeader.jsx';
import DataTable from '../components/common/DataTable.jsx';
import Card from '../components/ui/Card.jsx';
import Badge from '../components/ui/Badge.jsx';
import Button from '../components/ui/Button.jsx';
import Modal from '../components/ui/Modal.jsx';
import Input from '../components/ui/Input.jsx';
import { api } from '../services/api.js';
import { useApp } from '../context/AppContext.jsx';
import { hasPermission } from '../utils/permissions.js';

const statuses = ['SUBMITTED', 'UNDER_REVIEW', 'WAITLISTED', 'ACCEPTED', 'REJECTED', 'ENROLLED'];
const tone = { SUBMITTED: 'blue', UNDER_REVIEW: 'amber', WAITLISTED: 'slate', ACCEPTED: 'emerald', REJECTED: 'rose', ENROLLED: 'emerald' };

export default function AdmissionsPage() {
  const { currentUser } = useApp();
  const [applications, setApplications] = useState([]);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [notes, setNotes] = useState('');
  const canManage = hasPermission(currentUser, 'admissions:manage');

  const load = useCallback(async () => {
    setError('');
    try {
      const response = await api.get(`/admissions?limit=100${status ? `&status=${encodeURIComponent(status)}` : ''}`);
      const rows = response.data?.data || response.data;
      setApplications(Array.isArray(rows) ? rows : []);
    } catch (loadError) { setError(loadError.message || 'Unable to load admission applications.'); }
  }, [status]);
  useEffect(() => { load(); }, [load]);

  const updateStatus = async (nextStatus) => {
    try {
      await api.patch(`/admissions/${selected.id}/status`, { status: nextStatus, reviewNotes: notes || undefined });
      setSelected(null); setNotes(''); await load();
    } catch (saveError) { setError(saveError.message || 'Unable to update application.'); }
  };
  const enroll = async () => {
    try { await api.post(`/admissions/${selected.id}/enroll`, {}); setSelected(null); await load(); }
    catch (saveError) { setError(saveError.message || 'Unable to enroll applicant.'); }
  };

  const columns = [
    { key: 'applicationNumber', label: 'Application', render: (row) => <div><p className="font-bold text-on-surface">{row.applicationNumber}</p><p className="text-xs text-on-surface-variant">{new Date(row.createdAt).toLocaleDateString()}</p></div> },
    { key: 'applicant', label: 'Applicant', render: (row) => <div><p className="font-bold text-on-surface">{row.firstName} {row.lastName}</p><p className="text-xs text-on-surface-variant">{row.email}</p></div> },
    { key: 'academicYear', label: 'Academic Year' },
    { key: 'status', label: 'Status', render: (row) => <Badge tone={tone[row.status] || 'slate'}>{row.status.replaceAll('_', ' ')}</Badge> },
    { key: 'actions', label: '', render: (row) => canManage ? <Button size="sm" variant="secondary" onClick={() => { setSelected(row); setNotes(row.reviewNotes || ''); }}>Review</Button> : null },
  ];

  return <div className="page-shell">
    <PageHeader eyebrow="Enrollment pipeline" title="Admissions" description="Review applications, record decisions, and enroll accepted applicants into available classes." />
    {error ? <div role="alert" className="flex flex-col gap-3 rounded-xl bg-error-container p-4 text-sm font-semibold text-on-error-container sm:flex-row sm:items-center sm:justify-between"><span>{error}</span><Button size="sm" variant="secondary" icon={RefreshCw} onClick={load}>Retry</Button></div> : null}
    <Card><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-bold text-on-surface">Application queue</p><p className="text-sm text-on-surface-variant">Enrollment creates a pending student account; invite it after any required parent links are set.</p></div><select aria-label="Filter application status" className="focus-ring min-h-11 rounded-lg border border-outline-variant/70 bg-surface-container-lowest px-3 text-sm font-semibold text-on-surface" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option>{statuses.map((item) => <option key={item} value={item}>{item.replaceAll('_', ' ')}</option>)}</select></div></Card>
    <Card><DataTable columns={columns} rows={applications} emptyText="No admission applications found." /></Card>
    <Modal open={Boolean(selected)} title="Review admission application" description={selected ? `${selected.firstName} ${selected.lastName} · ${selected.applicationNumber}` : ''} onClose={() => setSelected(null)}>
      {selected ? <div className="grid gap-4"><div className="rounded-xl bg-surface-container-low p-3 text-sm"><p><strong>Requested class:</strong> {selected.desiredClassId || 'Not assigned'}</p><p className="mt-1"><strong>Previous school:</strong> {selected.previousSchool || 'Not provided'}</p><p className="mt-1"><strong>Documents:</strong> {Array.isArray(selected.documents) ? selected.documents.length : 0}</p></div><Input label="Review notes" value={notes} onChange={(event) => setNotes(event.target.value)} />{canManage ? <div className="flex flex-wrap gap-2">{statuses.filter((item) => item !== 'ENROLLED').map((item) => <Button key={item} size="sm" variant={item === 'REJECTED' ? 'secondary' : 'primary'} disabled={selected.status === 'ENROLLED'} onClick={() => updateStatus(item)}>{item.replaceAll('_', ' ')}</Button>)}{selected.status === 'ACCEPTED' ? <Button size="sm" variant="aurora" icon={GraduationCap} onClick={enroll}>Enroll Applicant</Button> : null}</div> : null}<Button variant="secondary" icon={CheckCircle2} onClick={() => setSelected(null)}>Close</Button></div> : null}
    </Modal>
  </div>;
}
