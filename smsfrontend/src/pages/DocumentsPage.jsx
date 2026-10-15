import { CheckCircle2, FileUp, RefreshCw, Trash2, XCircle } from 'lucide-react';
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

const tones = { PENDING: 'amber', VERIFIED: 'emerald', REJECTED: 'rose', EXPIRED: 'slate' };

export default function DocumentsPage() {
  const { data } = useApp();
  const [studentId, setStudentId] = useState('');
  const [documents, setDocuments] = useState([]);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', category: '', expiresAt: '', file: null });

  const load = useCallback(async () => {
    if (!studentId) { setDocuments([]); return; }
    setError('');
    try { const response = await api.get(`/documents/student/${studentId}`); const rows = response.data?.data || response.data; setDocuments(Array.isArray(rows) ? rows : []); }
    catch (loadError) { setError(loadError.message || 'Unable to load student documents.'); }
  }, [studentId]);
  useEffect(() => { load(); }, [load]);
  const upload = async (event) => {
    event.preventDefault();
    if (!form.file) { setError('Select a file to upload.'); return; }
    const payload = new FormData();
    payload.append('title', form.title); payload.append('category', form.category); payload.append('file', form.file);
    if (form.expiresAt) payload.append('expiresAt', form.expiresAt);
    try { await api.upload(`/documents/student/${studentId}`, payload); setOpen(false); setForm({ title: '', category: '', expiresAt: '', file: null }); await load(); }
    catch (uploadError) { setError(uploadError.message || 'Unable to upload document.'); }
  };
  const review = async (id, status) => { try { await api.patch(`/documents/${id}/review`, { status }); await load(); } catch (reviewError) { setError(reviewError.message || 'Unable to review document.'); } };
  const remove = async (id) => { try { await api.delete(`/documents/${id}`); await load(); } catch (deleteError) { setError(deleteError.message || 'Unable to delete document.'); } };
  const columns = [
    { key: 'title', label: 'Document', render: (row) => <div><a href={row.fileUrl} target="_blank" rel="noreferrer" className="font-bold text-primary underline">{row.title}</a><p className="text-xs text-on-surface-variant">{row.fileName} · {row.category}</p></div> },
    { key: 'expiresAt', label: 'Expires', render: (row) => row.expiresAt ? new Date(row.expiresAt).toLocaleDateString() : 'No expiry' },
    { key: 'status', label: 'Review', render: (row) => <Badge tone={tones[row.status] || 'slate'}>{row.status}</Badge> },
    { key: 'actions', label: '', render: (row) => <div className="flex flex-wrap gap-2"><Button aria-label={`Verify ${row.title}`} size="sm" variant="secondary" icon={CheckCircle2} disabled={row.status === 'VERIFIED' || row.status === 'EXPIRED'} onClick={() => review(row.id, 'VERIFIED')}>Verify</Button><Button aria-label={`Reject ${row.title}`} size="sm" variant="secondary" icon={XCircle} disabled={row.status === 'EXPIRED'} onClick={() => review(row.id, 'REJECTED')}>Reject</Button><Button aria-label={`Delete ${row.title}`} size="sm" variant="secondary" icon={Trash2} onClick={() => remove(row.id)}>Delete</Button></div> },
  ];
  return <div className="page-shell">
    <PageHeader eyebrow="Compliance records" title="Student Documents" description="Upload permitted files, review verification status, and track document expiry for each student." />
    {error ? <div role="alert" className="flex flex-col gap-3 rounded-xl bg-error-container p-4 text-sm font-semibold text-on-error-container sm:flex-row sm:items-center sm:justify-between"><span>{error}</span><Button size="sm" variant="secondary" icon={RefreshCw} onClick={load}>Retry</Button></div> : null}
    <Card><div className="flex flex-wrap items-center justify-between gap-3"><select aria-label="Select student" className="focus-ring min-h-11 min-w-64 rounded-lg border border-outline-variant/70 bg-surface-container-lowest px-3 text-sm font-semibold text-on-surface" value={studentId} onChange={(event) => setStudentId(event.target.value)}><option value="">Select student</option>{data.students.map((student) => <option key={student.backendId} value={student.backendId}>{student.name} / {student.id}</option>)}</select><Button icon={FileUp} disabled={!studentId} onClick={() => setOpen(true)}>Upload Document</Button></div></Card>
    <Card><DataTable columns={columns} rows={documents} emptyText={studentId ? 'No documents uploaded.' : 'Select a student to view documents.'} /></Card>
    <Modal open={open} title="Upload Student Document" description="PDF, office files, and images up to 10 MB are accepted." onClose={() => setOpen(false)}><form className="grid gap-3" onSubmit={upload}><Input label="Document title" value={form.title} onChange={(event) => setForm((value) => ({ ...value, title: event.target.value }))} required /><Input label="Category" placeholder="Birth certificate" value={form.category} onChange={(event) => setForm((value) => ({ ...value, category: event.target.value }))} required /><Input label="Expiry date (optional)" type="date" value={form.expiresAt} onChange={(event) => setForm((value) => ({ ...value, expiresAt: event.target.value }))} /><input aria-label="Document file" className="block w-full text-sm" type="file" onChange={(event) => setForm((value) => ({ ...value, file: event.target.files?.[0] || null }))} required /><Button type="submit" variant="aurora">Upload Document</Button></form></Modal>
  </div>;
}
