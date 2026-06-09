import { CheckCircle2, FilePlus2, Landmark, Plus, RotateCcw, XCircle } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import DataTable from '../common/DataTable.jsx';
import Badge from '../ui/Badge.jsx';
import Button from '../ui/Button.jsx';
import Card from '../ui/Card.jsx';
import Input from '../ui/Input.jsx';
import Modal from '../ui/Modal.jsx';
import { api } from '../../services/api.js';
import { formatCurrency } from '../../utils/formatters.js';
import { statusTone } from '../../utils/statusStyles.js';

const selectClass = 'focus-ring min-h-11 w-full rounded-lg border border-outline-variant/70 bg-surface-container-lowest px-4 text-base font-semibold text-on-surface sm:text-sm';
const today = new Date().toISOString().slice(0, 10);
const initialStructure = { academicYear: '2025-2026', classId: '', feeType: '', amount: '', cycle: 'YEARLY', dueDate: today };
const initialInvoice = { structureId: '', targetType: 'class', targetId: '', discountAmount: '0' };
const initialOffline = { invoiceId: '', amount: '', mode: 'CASH', referenceNumber: '' };
const initialRefund = { invoiceId: '', paymentAttemptId: '', amount: '', reason: '' };

function StatusBadge({ status }) {
  return <Badge className={statusTone[String(status).toLowerCase()] || statusTone.info}>{String(status).replaceAll('_', ' ')}</Badge>;
}

export default function FinanceOperations({ data, invoices, onChanged }) {
  const [structures, setStructures] = useState([]);
  const [refunds, setRefunds] = useState([]);
  const [offlinePayments, setOfflinePayments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [modal, setModal] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [structureForm, setStructureForm] = useState(initialStructure);
  const [invoiceForm, setInvoiceForm] = useState(initialInvoice);
  const [offlineForm, setOfflineForm] = useState(initialOffline);
  const [refundForm, setRefundForm] = useState(initialRefund);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [structureResponse, refundResponse, offlineResponse, summaryResponse] = await Promise.all([
        api.get('/fees/structures?limit=100'),
        api.get('/refunds?limit=100'),
        api.get('/fees/offline-payments?limit=100'),
        api.get('/fees/reports/summary'),
      ]);
      setStructures(Array.isArray(structureResponse?.data) ? structureResponse.data : []);
      setRefunds(Array.isArray(refundResponse?.data) ? refundResponse.data : []);
      setOfflinePayments(Array.isArray(offlineResponse?.data) ? offlineResponse.data : []);
      setSummary(summaryResponse?.data || null);
    } catch (loadError) {
      setError(loadError.message || 'Finance operations could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (operation, successMessage, closeModal = false) => {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await operation();
      setNotice(successMessage);
      if (closeModal) setModal('');
      await Promise.all([load(), onChanged?.()]);
    } catch (operationError) {
      setError(operationError.message || 'The finance operation could not be completed.');
    } finally {
      setSaving(false);
    }
  };

  const createStructure = (event) => {
    event.preventDefault();
    run(() => api.post('/fees/structures', {
      academicYear: structureForm.academicYear,
      classId: structureForm.classId,
      feeType: structureForm.feeType,
      feeItems: [{ name: structureForm.feeType, amount: Number(structureForm.amount) }],
      cycle: structureForm.cycle,
      dueDate: structureForm.dueDate,
    }), 'Fee structure created.', true);
  };

  const generateInvoices = (event) => {
    event.preventDefault();
    run(() => api.post('/fees/invoices/generate', {
      structureId: invoiceForm.structureId,
      ...(invoiceForm.targetType === 'class' ? { classId: invoiceForm.targetId } : { studentId: invoiceForm.targetId }),
      discountAmount: Number(invoiceForm.discountAmount || 0),
    }), 'Fee invoice generation completed.', true);
  };

  const recordOffline = (event) => {
    event.preventDefault();
    run(() => api.post('/fees/offline-payments', {
      invoiceId: offlineForm.invoiceId,
      amount: Number(offlineForm.amount),
      mode: offlineForm.mode,
      ...(offlineForm.referenceNumber ? { referenceNumber: offlineForm.referenceNumber } : {}),
    }), 'Offline payment submitted for verification.', true);
  };

  const requestRefund = (event) => {
    event.preventDefault();
    run(() => api.post('/refunds/request', {
      invoiceId: refundForm.invoiceId,
      ...(refundForm.paymentAttemptId ? { paymentAttemptId: refundForm.paymentAttemptId } : {}),
      amount: Number(refundForm.amount),
      reason: refundForm.reason,
    }), 'Refund request created for approval.', true);
  };

  const approveOffline = (row) => {
    if (!window.confirm('Verify this offline payment and update the invoice balance?')) return;
    run(() => api.post(`/fees/offline-payments/${row.id}/approve`), 'Offline payment verified.');
  };

  const rejectOffline = (row) => {
    const reason = window.prompt('Enter a rejection reason:');
    if (!reason) return;
    run(() => api.post(`/fees/offline-payments/${row.id}/reject`, { reason }), 'Offline payment rejected.');
  };

  const approveRefund = (row) => {
    if (!window.confirm('Approve this refund request? Processing remains a separate action.')) return;
    run(() => api.post(`/refunds/${row.id}/approve`), 'Refund approved.');
  };

  const processRefund = (row) => {
    if (!window.confirm('Process this approved refund now? This can initiate a gateway refund.')) return;
    run(() => api.post(`/refunds/${row.id}/process`), 'Refund processed.');
  };

  const structureColumns = [
    { key: 'feeType', label: 'Fee Type' },
    { key: 'academicYear', label: 'Academic Year' },
    { key: 'cycle', label: 'Cycle', render: (row) => String(row.cycle).replaceAll('_', ' ') },
    { key: 'dueDate', label: 'Due Date', render: (row) => String(row.dueDate).slice(0, 10) },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
  ];

  const offlineColumns = [
    { key: 'createdAt', label: 'Submitted', render: (row) => String(row.createdAt).slice(0, 10) },
    { key: 'invoiceId', label: 'Invoice Ref', render: (row) => String(row.invoiceId).slice(-8).toUpperCase() },
    { key: 'amount', label: 'Amount', render: (row) => formatCurrency(row.amount) },
    { key: 'mode', label: 'Mode', render: (row) => String(row.mode).replaceAll('_', ' ') },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    { key: 'actions', label: 'Review', render: (row) => row.status === 'PENDING_VERIFICATION'
      ? <div className="flex gap-2"><Button size="sm" icon={CheckCircle2} disabled={saving} onClick={() => approveOffline(row)}>Verify</Button><Button size="sm" variant="danger" icon={XCircle} disabled={saving} onClick={() => rejectOffline(row)}>Reject</Button></div>
      : <span className="text-xs font-semibold text-on-surface-variant">Reviewed</span>,
    },
  ];

  const refundColumns = [
    { key: 'createdAt', label: 'Requested', render: (row) => String(row.createdAt).slice(0, 10) },
    { key: 'invoiceId', label: 'Invoice Ref', render: (row) => String(row.invoiceId).slice(-8).toUpperCase() },
    { key: 'amount', label: 'Amount', render: (row) => formatCurrency(row.amount) },
    { key: 'reason', label: 'Reason' },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    { key: 'actions', label: 'Action', render: (row) => row.status === 'REQUESTED'
      ? <Button size="sm" variant="secondary" disabled={saving} onClick={() => approveRefund(row)}>Approve</Button>
      : ['APPROVED', 'FAILED'].includes(row.status)
        ? <Button size="sm" variant="danger" disabled={saving} onClick={() => processRefund(row)}>Process</Button>
        : <span className="text-xs font-semibold text-on-surface-variant">No action</span>,
    },
  ];

  const totals = summary?.totals || {};

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase text-primary">Admin finance controls</p>
            <h2 className="mt-1 text-xl font-bold text-on-surface">Fee operations</h2>
            <p className="mt-1 text-sm leading-6 text-on-surface-variant">Create structures, generate invoices, verify offline collections, and control refunds.</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:flex">
            <Button variant="secondary" icon={Plus} onClick={() => setModal('structure')}>Fee Structure</Button>
            <Button variant="secondary" icon={FilePlus2} onClick={() => setModal('invoice')}>Generate Invoices</Button>
            <Button variant="secondary" icon={Landmark} onClick={() => setModal('offline')}>Offline Payment</Button>
            <Button variant="danger" icon={RotateCcw} onClick={() => setModal('refund')}>Request Refund</Button>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[['Total demand', totals.payableAmount], ['Verified paid', totals.paidAmount], ['Outstanding', totals.dueAmount], ['Refunded', totals.refundedAmount]].map(([label, amount]) => (
            <div key={label} className="rounded-2xl bg-surface-container-low p-4">
              <p className="text-xs font-bold uppercase text-on-surface-variant">{label}</p>
              <p className="mt-2 break-words text-lg font-extrabold text-on-surface">{formatCurrency(Number(amount || 0))}</p>
            </div>
          ))}
        </div>
      </Card>

      {notice ? <p role="status" className="rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm font-semibold text-on-surface">{notice}</p> : null}
      {error ? <div role="alert" className="flex flex-col gap-3 rounded-xl bg-error-container px-4 py-3 text-sm font-semibold text-on-error-container sm:flex-row sm:items-center sm:justify-between"><span>{error}</span><Button size="sm" variant="secondary" onClick={load}>Retry</Button></div> : null}

      <Card><h2 className="mb-4 text-lg font-bold text-on-surface">Fee structures</h2><DataTable columns={structureColumns} rows={structures} emptyText={loading ? 'Loading structures...' : 'No fee structures created'} /></Card>
      <Card><h2 className="mb-4 text-lg font-bold text-on-surface">Offline payment verification</h2><DataTable columns={offlineColumns} rows={offlinePayments} emptyText={loading ? 'Loading offline payments...' : 'No offline payments submitted'} /></Card>
      <Card><h2 className="mb-4 text-lg font-bold text-on-surface">Refund management</h2><DataTable columns={refundColumns} rows={refunds} emptyText={loading ? 'Loading refunds...' : 'No refund requests found'} /></Card>

      <Modal open={modal === 'structure'} title="Create Fee Structure" description="Create an active class-wise fee category. Duplicate active structures are rejected." onClose={() => setModal('')} size="lg">
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={createStructure}>
          <Input label="Academic year" value={structureForm.academicYear} onChange={(event) => setStructureForm((value) => ({ ...value, academicYear: event.target.value }))} required />
          <label className="text-xs font-bold text-on-surface-variant">Class<select className={`${selectClass} mt-1.5`} value={structureForm.classId} onChange={(event) => setStructureForm((value) => ({ ...value, classId: event.target.value }))} required><option value="">Select class</option>{data.classes.map((item) => <option key={item.id} value={item.id}>{item.name} {item.section}</option>)}</select></label>
          <Input label="Fee category" placeholder="Tuition fee" value={structureForm.feeType} onChange={(event) => setStructureForm((value) => ({ ...value, feeType: event.target.value }))} required />
          <Input label="Amount" type="number" min="0.01" step="0.01" value={structureForm.amount} onChange={(event) => setStructureForm((value) => ({ ...value, amount: event.target.value }))} required />
          <label className="text-xs font-bold text-on-surface-variant">Cycle<select className={`${selectClass} mt-1.5`} value={structureForm.cycle} onChange={(event) => setStructureForm((value) => ({ ...value, cycle: event.target.value }))}>{['MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY', 'CUSTOM'].map((cycle) => <option key={cycle} value={cycle}>{cycle.replaceAll('_', ' ')}</option>)}</select></label>
          <Input label="Due date" type="date" value={structureForm.dueDate} onChange={(event) => setStructureForm((value) => ({ ...value, dueDate: event.target.value }))} required />
          <Button className="sm:col-span-2" type="submit" variant="aurora" disabled={saving}>{saving ? 'Creating...' : 'Create Structure'}</Button>
        </form>
      </Modal>

      <Modal open={modal === 'invoice'} title="Generate Fee Invoices" description="The backend calculates every final payable amount." onClose={() => setModal('')} size="lg">
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={generateInvoices}>
          <label className="text-xs font-bold text-on-surface-variant sm:col-span-2">Fee structure<select className={`${selectClass} mt-1.5`} value={invoiceForm.structureId} onChange={(event) => setInvoiceForm((value) => ({ ...value, structureId: event.target.value }))} required><option value="">Select structure</option>{structures.filter((item) => item.status === 'ACTIVE').map((item) => <option key={item.id} value={item.id}>{item.feeType} / {item.academicYear}</option>)}</select></label>
          <label className="text-xs font-bold text-on-surface-variant">Generate for<select className={`${selectClass} mt-1.5`} value={invoiceForm.targetType} onChange={(event) => setInvoiceForm((value) => ({ ...value, targetType: event.target.value, targetId: '' }))}><option value="class">Entire class</option><option value="student">Individual student</option></select></label>
          <label className="text-xs font-bold text-on-surface-variant">Target<select className={`${selectClass} mt-1.5`} value={invoiceForm.targetId} onChange={(event) => setInvoiceForm((value) => ({ ...value, targetId: event.target.value }))} required><option value="">Select target</option>{invoiceForm.targetType === 'class' ? data.classes.map((item) => <option key={item.id} value={item.id}>{item.name} {item.section}</option>) : data.students.filter((item) => item.backendId).map((item) => <option key={item.backendId} value={item.backendId}>{item.name} / {item.className}</option>)}</select></label>
          <Input className="sm:col-span-2" label="Discount amount" type="number" min="0" step="0.01" value={invoiceForm.discountAmount} onChange={(event) => setInvoiceForm((value) => ({ ...value, discountAmount: event.target.value }))} />
          <Button className="sm:col-span-2" type="submit" variant="aurora" disabled={saving}>{saving ? 'Generating...' : 'Generate Invoices'}</Button>
        </form>
      </Modal>

      <Modal open={modal === 'offline'} title="Record Offline Payment" description="Non-cash modes require a reference number and remain pending until verified." onClose={() => setModal('')}>
        <form className="grid gap-4" onSubmit={recordOffline}>
          <label className="text-xs font-bold text-on-surface-variant">Invoice<select className={`${selectClass} mt-1.5`} value={offlineForm.invoiceId} onChange={(event) => setOfflineForm((value) => ({ ...value, invoiceId: event.target.value }))} required><option value="">Select invoice</option>{invoices.filter((item) => Number(item.dueAmount) > 0).map((item) => <option key={item.id} value={item.id}>{item.invoiceNumber} / Due {formatCurrency(item.dueAmount)}</option>)}</select></label>
          <Input label="Amount received" type="number" min="0.01" step="0.01" value={offlineForm.amount} onChange={(event) => setOfflineForm((value) => ({ ...value, amount: event.target.value }))} required />
          <label className="text-xs font-bold text-on-surface-variant">Payment mode<select className={`${selectClass} mt-1.5`} value={offlineForm.mode} onChange={(event) => setOfflineForm((value) => ({ ...value, mode: event.target.value }))}>{['CASH', 'CHEQUE', 'BANK_TRANSFER', 'UPI_MANUAL', 'DEMAND_DRAFT'].map((mode) => <option key={mode} value={mode}>{mode.replaceAll('_', ' ')}</option>)}</select></label>
          <Input label="Reference number" value={offlineForm.referenceNumber} onChange={(event) => setOfflineForm((value) => ({ ...value, referenceNumber: event.target.value }))} required={offlineForm.mode !== 'CASH'} />
          <Button type="submit" variant="aurora" disabled={saving}>{saving ? 'Submitting...' : 'Submit For Verification'}</Button>
        </form>
      </Modal>

      <Modal open={modal === 'refund'} title="Request Refund" description="Online refunds require the captured payment attempt ID. Leave it blank only for verified offline payments." onClose={() => setModal('')}>
        <form className="grid gap-4" onSubmit={requestRefund}>
          <label className="text-xs font-bold text-on-surface-variant">Invoice<select className={`${selectClass} mt-1.5`} value={refundForm.invoiceId} onChange={(event) => setRefundForm((value) => ({ ...value, invoiceId: event.target.value }))} required><option value="">Select invoice</option>{invoices.filter((item) => Number(item.paidAmount) > Number(item.refundedAmount)).map((item) => <option key={item.id} value={item.id}>{item.invoiceNumber} / Paid {formatCurrency(item.paidAmount)}</option>)}</select></label>
          <Input label="Captured payment attempt ID (online only)" value={refundForm.paymentAttemptId} onChange={(event) => setRefundForm((value) => ({ ...value, paymentAttemptId: event.target.value }))} />
          <Input label="Refund amount" type="number" min="0.01" step="0.01" value={refundForm.amount} onChange={(event) => setRefundForm((value) => ({ ...value, amount: event.target.value }))} required />
          <Input label="Reason" value={refundForm.reason} onChange={(event) => setRefundForm((value) => ({ ...value, reason: event.target.value }))} required minLength="5" />
          <Button type="submit" variant="danger" disabled={saving}>{saving ? 'Submitting...' : 'Request Refund'}</Button>
        </form>
      </Modal>
    </div>
  );
}
