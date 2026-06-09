import { IndianRupee, Plus } from 'lucide-react';
import { useState } from 'react';
import PageHeader from '../components/common/PageHeader.jsx';
import DataTable from '../components/common/DataTable.jsx';
import StatCard from '../components/common/StatCard.jsx';
import Card from '../components/ui/Card.jsx';
import Badge from '../components/ui/Badge.jsx';
import Button from '../components/ui/Button.jsx';
import Input from '../components/ui/Input.jsx';
import Modal from '../components/ui/Modal.jsx';
import FinanceOperations from '../components/fees/FinanceOperations.jsx';
import SecureFeeInvoices from '../components/fees/SecureFeeInvoices.jsx';
import { useApp } from '../context/AppContext.jsx';
import { formatCurrency } from '../utils/formatters.js';
import { statusTone } from '../utils/statusStyles.js';
import { getScopedStudent, getStudentFees } from '../utils/studentScope.js';
import { hasPermission } from '../utils/permissions.js';

export default function FeesPage() {
  const { data, currentRole, currentUser, recordFeePayment } = useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [secureInvoices, setSecureInvoices] = useState([]);
  const [secureRefreshKey, setSecureRefreshKey] = useState(0);
  const [form, setForm] = useState({ feeId: '', amount: '', paymentMethod: 'CASH', transactionId: '', remarks: '' });
  const scopedStudent = getScopedStudent(data, currentUser, currentRole);
  const isPersonalView = ['STUDENT', 'PARENT'].includes(currentRole);
  const canCollect = currentRole === 'ADMIN' && hasPermission(currentUser, 'fees:collect');
  const canOperateFinance = currentRole === 'ADMIN' && ['fees:create', 'fees:update', 'payments:verify'].every((permission) => hasPermission(currentUser, permission));
  const rows = isPersonalView ? getStudentFees(data, scopedStudent) : data.fees;
  const total = rows.reduce((sum, fee) => sum + fee.amount, 0);
  const paid = rows.reduce((sum, fee) => sum + fee.paid, 0);
  const overdue = rows.filter((fee) => fee.status === 'overdue').reduce((sum, fee) => sum + fee.amount - fee.paid, 0);
  const columns = [
    { key: 'student', label: 'Student' },
    { key: 'className', label: 'Class' },
    { key: 'term', label: 'Term' },
    { key: 'amount', label: 'Amount', render: (row) => formatCurrency(row.amount) },
    { key: 'paid', label: 'Paid', render: (row) => formatCurrency(row.paid) },
    { key: 'dueDate', label: 'Due Date' },
    { key: 'status', label: 'Status', render: (row) => <Badge className={statusTone[row.status]}>{row.status}</Badge> },
    ...(canCollect ? [{
      key: 'actions',
      label: 'Actions',
      render: (row) => row.status === 'paid'
        ? <Badge tone="emerald">Settled</Badge>
        : <Button size="sm" variant="secondary" onClick={() => {
          setForm((value) => ({ ...value, feeId: row.id, amount: String(row.amount - row.paid) }));
          setModalOpen(true);
        }}>Pay</Button>,
    }] : []),
  ];

  const selectedFee = rows.find((item) => item.id === form.feeId);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setIsSaving(true);
    try {
      await recordFeePayment(form);
      setForm({ feeId: '', amount: '', paymentMethod: 'CASH', transactionId: '', remarks: '' });
      setModalOpen(false);
    } catch (submitError) {
      setError(submitError.message || 'Unable to record payment.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Finance office"
        title={currentRole === 'PARENT' ? 'Fees & Payments' : isPersonalView ? 'My Fees' : 'Fee Management'}
        description={currentRole === 'PARENT' ? 'Invoices, verified payments, balances, and downloadable receipts for the selected linked child.' : isPersonalView ? 'Fee demand, payment status, due dates, and paid amount for the signed-in student only.' : 'Track collection, pending dues, overdue cases, and student-wise payment status.'}
        actionLabel={canCollect ? 'Record Payment' : undefined}
        actionIcon={Plus}
        onAction={canCollect ? () => setModalOpen(true) : undefined}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard title="Total Demand" value={formatCurrency(total)} icon={IndianRupee} tone="blue" data={[28, 40, 51, 70, 87, 100]} />
        <StatCard title="Collected" value={formatCurrency(paid)} icon={IndianRupee} tone="emerald" data={[20, 32, 48, 68, 75, 82]} />
        <StatCard title="Overdue" value={formatCurrency(overdue)} icon={IndianRupee} tone="rose" data={[40, 38, 32, 29, 22, 15]} />
      </div>
      <SecureFeeInvoices
        currentRole={currentRole}
        currentUser={currentUser}
        studentId={currentRole === 'PARENT' ? scopedStudent?.backendId : undefined}
        onInvoicesChange={setSecureInvoices}
        refreshKey={secureRefreshKey}
      />
      {canOperateFinance ? (
        <FinanceOperations
          data={data}
          invoices={secureInvoices}
          onChanged={() => setSecureRefreshKey((value) => value + 1)}
        />
      ) : null}
      <Card>
        <div className="mb-4">
          <h2 className="text-lg font-bold text-on-surface">Legacy fee records</h2>
          <p className="mt-1 text-sm text-on-surface-variant">Existing fee tracking and offline recording flow remains available without changes.</p>
        </div>
        <DataTable columns={columns} rows={rows} emptyText={isPersonalView ? 'No fee record found for this student' : 'No fee records found'} />
      </Card>
      <Modal open={modalOpen} title="Record Payment" description="Apply a payment to an existing fee record." onClose={() => setModalOpen(false)}>
        <form className="grid gap-4" onSubmit={submit}>
          <select
            className="focus-ring h-11 rounded-lg border border-outline-variant/70 bg-surface-container-lowest px-4 text-sm font-semibold text-on-surface dark:border-white/10 dark:bg-white/10 dark:text-white"
            value={form.feeId}
            onChange={(event) => {
              const fee = rows.find((item) => item.id === event.target.value);
              setForm((value) => ({ ...value, feeId: event.target.value, amount: fee ? String(fee.amount - fee.paid) : '' }));
            }}
            required
          >
            <option value="">Select fee record</option>
            {rows.filter((item) => item.status !== 'paid').map((fee) => (
              <option key={fee.id} value={fee.id}>{fee.student} / {fee.term} / Due {formatCurrency(fee.amount - fee.paid)}</option>
            ))}
          </select>
          {selectedFee ? <p className="rounded-lg bg-surface-container-low p-3 text-sm font-semibold text-on-surface-variant dark:bg-white/5 dark:text-slate-300">Remaining balance: {formatCurrency(selectedFee.amount - selectedFee.paid)}</p> : null}
          <Input type="number" min="1" placeholder="Payment amount" value={form.amount} onChange={(event) => setForm((value) => ({ ...value, amount: event.target.value }))} required />
          <select
            className="focus-ring h-11 rounded-lg border border-outline-variant/70 bg-surface-container-lowest px-4 text-sm font-semibold text-on-surface dark:border-white/10 dark:bg-white/10 dark:text-white"
            value={form.paymentMethod}
            onChange={(event) => setForm((value) => ({ ...value, paymentMethod: event.target.value }))}
          >
            <option value="CASH">Cash</option>
            <option value="UPI">UPI</option>
            <option value="CARD">Card</option>
            <option value="BANK_TRANSFER">Bank transfer</option>
            <option value="CHEQUE">Cheque</option>
          </select>
          <Input placeholder="Transaction ID" value={form.transactionId} onChange={(event) => setForm((value) => ({ ...value, transactionId: event.target.value }))} />
          <Input placeholder="Remarks" value={form.remarks} onChange={(event) => setForm((value) => ({ ...value, remarks: event.target.value }))} />
          {error ? <p className="rounded-lg bg-error-container px-3 py-2 text-sm font-semibold text-on-error-container dark:bg-red-950/50 dark:text-red-200">{error}</p> : null}
          <Button type="submit" variant="aurora" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Payment'}</Button>
        </form>
      </Modal>
    </div>
  );
}
