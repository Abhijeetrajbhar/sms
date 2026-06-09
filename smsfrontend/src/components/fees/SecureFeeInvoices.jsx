import { Download, RefreshCw, ShieldCheck } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import DataTable from '../common/DataTable.jsx';
import Badge from '../ui/Badge.jsx';
import Button from '../ui/Button.jsx';
import Card from '../ui/Card.jsx';
import { api } from '../../services/api.js';
import { formatCurrency } from '../../utils/formatters.js';
import { loadRazorpayCheckout } from '../../utils/razorpay.js';
import { statusTone } from '../../utils/statusStyles.js';

const PAYABLE = new Set(['UNPAID', 'PARTIAL', 'FAILED', 'PENDING']);

function idempotencyKey(invoiceId) {
  const unique = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `invoice-${invoiceId}-${unique}`;
}

export default function SecureFeeInvoices({ currentRole, currentUser, studentId, onInvoicesChange, refreshKey = 0 }) {
  const [invoices, setInvoices] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [processingId, setProcessingId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    if (currentRole === 'PARENT' && !studentId) {
      setInvoices([]);
      setHistory([]);
      onInvoicesChange?.([]);
      setLoading(false);
      return;
    }
    try {
      const [invoiceResponse, historyResponse] = await Promise.all([
        api.get(studentId ? `/fees/students/${studentId}/invoices?limit=100` : '/fees/invoices?limit=100'),
        api.get(`/payments/history?limit=100${studentId ? `&studentId=${encodeURIComponent(studentId)}` : ''}`),
      ]);
      const nextInvoices = Array.isArray(invoiceResponse?.data) ? invoiceResponse.data : [];
      setInvoices(nextInvoices);
      setHistory(Array.isArray(historyResponse?.data) ? historyResponse.data : []);
      onInvoicesChange?.(nextInvoices);
    } catch (loadError) {
      setError(loadError.message || 'Secure fee invoices could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [currentRole, onInvoicesChange, studentId]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const totals = useMemo(() => invoices.reduce((summary, invoice) => ({
    demand: summary.demand + Number(invoice.payableAmount || 0),
    paid: summary.paid + Number(invoice.paidAmount || 0),
    due: summary.due + Number(invoice.dueAmount || 0),
  }), { demand: 0, paid: 0, due: 0 }), [invoices]);

  const pay = async (invoice) => {
    setProcessingId(invoice.id);
    setError('');
    setNotice('Creating a secure payment order. Do not refresh or close this page.');
    try {
      const Razorpay = await loadRazorpayCheckout();
      const response = await api.post(
        '/payments/create-order',
        { invoiceId: invoice.id },
        { headers: { 'Idempotency-Key': idempotencyKey(invoice.id) } }
      );
      const order = response.data;
      let checkoutCompleted = false;
      const checkout = new Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        order_id: order.orderId,
        name: 'CampusOryx School',
        description: `Fee invoice ${invoice.invoiceNumber}`,
        prefill: { name: currentUser?.name, email: currentUser?.email },
        theme: { color: '#6d3bd7' },
        handler: async (payment) => {
          checkoutCompleted = true;
          setNotice('Payment received. Secure backend verification is in progress.');
          try {
            await api.post('/payments/verify', payment);
            setNotice('Payment verified. Your invoice and receipt are now updated.');
            await load();
          } catch (verifyError) {
            setError(verifyError.message || 'Payment verification is pending. Use Refresh Status shortly.');
            await load();
          } finally {
            setProcessingId('');
          }
        },
        modal: {
          ondismiss: () => {
            if (!checkoutCompleted) {
              setNotice('Payment not completed or verification is pending. No fee is marked paid until the backend verifies it.');
              setProcessingId('');
              load();
            }
          },
        },
      });
      checkout.on('payment.failed', () => {
        setError('Payment failed at the gateway. You can safely retry.');
        setProcessingId('');
        load();
      });
      checkout.open();
    } catch (paymentError) {
      setError(paymentError.message || 'Unable to start secure payment.');
      setProcessingId('');
    }
  };

  const refreshAttempt = async (attempt) => {
    setProcessingId(attempt.id);
    setError('');
    try {
      await api.post(`/payments/${attempt.id}/refresh-status`);
      setNotice('Payment status refreshed from the gateway.');
      await load();
    } catch (refreshError) {
      setError(refreshError.message || 'Payment status could not be refreshed.');
    } finally {
      setProcessingId('');
    }
  };

  const downloadReceipt = async (attempt) => {
    setProcessingId(attempt.id);
    setError('');
    try {
      await api.download(`/receipts/${attempt.receipt.id}/download`, `${attempt.receipt.receiptNumber}.pdf`);
    } catch (downloadError) {
      setError(downloadError.message || 'Receipt could not be downloaded.');
    } finally {
      setProcessingId('');
    }
  };

  const invoiceColumns = [
    { key: 'invoiceNumber', label: 'Invoice' },
    { key: 'academicYear', label: 'Academic Year' },
    { key: 'payableAmount', label: 'Demand', render: (row) => formatCurrency(row.payableAmount) },
    { key: 'paidAmount', label: 'Paid', render: (row) => formatCurrency(row.paidAmount) },
    { key: 'dueAmount', label: 'Due', render: (row) => formatCurrency(row.dueAmount) },
    { key: 'dueDate', label: 'Due Date', render: (row) => String(row.dueDate || '').slice(0, 10) },
    { key: 'status', label: 'Status', render: (row) => <Badge className={statusTone[String(row.status).toLowerCase()] || statusTone.info}>{String(row.status).replaceAll('_', ' ')}</Badge> },
    ...(['STUDENT', 'PARENT'].includes(currentRole) ? [{
      key: 'actions',
      label: 'Action',
      render: (row) => PAYABLE.has(row.status) && Number(row.dueAmount) > 0
        ? <Button size="sm" disabled={Boolean(processingId)} onClick={() => pay(row)}>{processingId === row.id ? 'Processing...' : 'Pay Now'}</Button>
        : <Badge tone="emerald">No payment due</Badge>,
    }] : []),
  ];

  const historyColumns = [
    { key: 'createdAt', label: 'Date', render: (row) => String(row.createdAt || '').slice(0, 10) },
    { key: 'invoiceId', label: 'Invoice Ref', render: (row) => String(row.invoiceId).slice(-8).toUpperCase() },
    { key: 'amount', label: 'Amount', render: (row) => formatCurrency(row.amount) },
    { key: 'status', label: 'Status', render: (row) => <Badge className={statusTone[String(row.status).toLowerCase()] || statusTone.info}>{String(row.status).replaceAll('_', ' ')}</Badge> },
    { key: 'actions', label: 'Action', render: (row) => row.receipt
      ? <Button size="sm" variant="secondary" icon={Download} disabled={processingId === row.id} onClick={() => downloadReceipt(row)}>Receipt</Button>
      : ['PENDING', 'AUTHORIZED', 'CREATED', 'FAILED'].includes(row.status)
        ? <Button size="sm" variant="secondary" icon={RefreshCw} disabled={processingId === row.id} onClick={() => refreshAttempt(row)}>Refresh Status</Button>
        : <span className="text-xs font-semibold text-on-surface-variant">Receipt after verification</span>,
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card className="overflow-hidden bg-gradient-to-br from-primary/10 via-surface-container-lowest to-secondary/10">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-primary"><ShieldCheck className="h-5 w-5" /><span className="text-xs font-extrabold uppercase tracking-wide">Backend verified payments</span></div>
            <h2 className="mt-2 text-xl font-bold text-on-surface sm:text-2xl">Secure fee invoices</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-on-surface-variant">Amounts and final payment status come only from the school server and verified gateway records.</p>
          </div>
          <Button variant="secondary" icon={RefreshCw} disabled={loading} onClick={load}>{loading ? 'Loading...' : 'Refresh'}</Button>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {[['Invoice demand', totals.demand], ['Verified paid', totals.paid], ['Balance due', totals.due]].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-outline-variant/40 bg-surface-container-lowest/75 p-4">
              <p className="text-xs font-bold uppercase text-on-surface-variant">{label}</p>
              <p className="mt-2 break-words text-xl font-extrabold text-on-surface">{formatCurrency(value)}</p>
            </div>
          ))}
        </div>
      </Card>

      {notice ? <p role="status" className="rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm font-semibold text-on-surface">{notice}</p> : null}
      {error ? <div role="alert" className="flex flex-col gap-3 rounded-xl bg-error-container px-4 py-3 text-sm font-semibold text-on-error-container sm:flex-row sm:items-center sm:justify-between"><span>{error}</span><Button size="sm" variant="secondary" onClick={load}>Retry</Button></div> : null}

      <Card>
        <h2 className="mb-4 text-lg font-bold text-on-surface">Invoices</h2>
        <DataTable columns={invoiceColumns} rows={invoices} emptyText={loading ? 'Loading secure invoices...' : 'No secure fee invoices found'} />
      </Card>
      <Card>
        <h2 className="mb-4 text-lg font-bold text-on-surface">Payment history</h2>
        <DataTable columns={historyColumns} rows={history} emptyText={loading ? 'Loading payment history...' : 'No online payment attempts found'} />
      </Card>
    </div>
  );
}
