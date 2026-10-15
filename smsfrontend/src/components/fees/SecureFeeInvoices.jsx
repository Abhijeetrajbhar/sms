import { CreditCard, Download, RefreshCw, ShieldCheck } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import DataTable from '../common/DataTable.jsx';
import Badge from '../ui/Badge.jsx';
import Button from '../ui/Button.jsx';
import Card from '../ui/Card.jsx';
import { api } from '../../services/api.js';
import { formatCurrency } from '../../utils/formatters.js';
import { loadRazorpayCheckout } from '../../utils/razorpay.js';
import { hasPermission } from '../../utils/permissions.js';
import { statusTone } from '../../utils/statusStyles.js';

import { useApp } from '../../context/AppContext.jsx';

const PAYABLE = new Set(['UNPAID', 'PARTIAL', 'FAILED', 'PENDING']);

function idempotencyKey(invoiceId) {
  const unique = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `invoice-${invoiceId}-${unique}`;
}

export default function SecureFeeInvoices({ currentRole, currentUser, studentId, onInvoicesChange, refreshKey = 0 }) {
  const { data: appData } = useApp();
  const [invoices, setInvoices] = useState([]);
  const [history, setHistory] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [processingId, setProcessingId] = useState('');
  const [paymentConfig, setPaymentConfig] = useState({ gatewayConfigured: false, onlinePaymentsEnabled: false });
  const canRefreshGatewayStatus = currentRole !== 'ADMIN' || hasPermission(currentUser, 'payments:verify');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    if (currentRole === 'PARENT' && !studentId) {
      setInvoices([]);
      setHistory([]);
      setReceipts([]);
      onInvoicesChange?.([]);
      setLoading(false);
      return;
    }
    try {
      const [invoiceResponse, historyResponse, receiptResponse, configResponse] = await Promise.all([
        api.get(studentId ? `/fees/students/${studentId}/invoices?limit=100` : '/fees/invoices?limit=100'),
        api.get(`/payments/history?limit=100${studentId ? `&studentId=${encodeURIComponent(studentId)}` : ''}`),
        api.get(`/receipts?limit=100${studentId ? `&studentId=${encodeURIComponent(studentId)}` : ''}`),
        api.get('/payments/config'),
      ]);
      const rawInvoices = invoiceResponse?.data?.data || invoiceResponse?.data;
      const nextInvoices = Array.isArray(rawInvoices) ? rawInvoices : [];
      const rawHistory = historyResponse?.data?.data || historyResponse?.data;
      const nextHistory = Array.isArray(rawHistory) ? rawHistory : [];
      const rawReceipts = receiptResponse?.data?.data || receiptResponse?.data;
      const nextReceipts = Array.isArray(rawReceipts) ? rawReceipts : [];
      setInvoices(nextInvoices);
      setHistory(nextHistory);
      setReceipts(nextReceipts);
      setPaymentConfig(configResponse?.data?.data || configResponse?.data || { gatewayConfigured: false, onlinePaymentsEnabled: false });
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
    if (!paymentConfig.onlinePaymentsEnabled) {
      setNotice('Online payment is not enabled for the student/parent portal. Please contact the school office for payment options.');
      return;
    }
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
        key: order.keyId || order.key_id || import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_TnpXuenJ5WWK2i',
        amount: order.amount,
        currency: order.currency || 'INR',
        order_id: order.orderId || order.order_id,
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

  const downloadReceipt = async (receipt) => {
    setProcessingId(receipt.id);
    setError('');
    try {
      await api.download(`/receipts/${receipt.id}/download`, `${receipt.receiptNumber}.pdf`);
    } catch (downloadError) {
      setError(downloadError.message || 'Receipt could not be downloaded.');
    } finally {
      setProcessingId('');
    }
  };

  const invoiceColumns = [
    { key: 'invoiceNumber', label: 'Invoice' },
    ...(currentRole === 'ADMIN' ? [{
      key: 'student',
      label: 'Student',
      render: (row) => {
        const student = (appData.students || []).find((s) => s.backendId === row.studentId || s.id === row.studentId);
        return student ? `${student.name} (${student.className || ''})` : 'Student';
      },
    }] : []),
    { key: 'academicYear', label: 'Academic Year' },
    { key: 'payableAmount', label: 'Demand', render: (row) => formatCurrency(row.payableAmount) },
    { key: 'paidAmount', label: 'Paid', render: (row) => formatCurrency(row.paidAmount) },
    { key: 'dueAmount', label: 'Due', render: (row) => formatCurrency(row.dueAmount) },
    { key: 'dueDate', label: 'Due Date', render: (row) => String(row.dueDate || '').slice(0, 10) },
    { key: 'status', label: 'Status', render: (row) => <Badge className={statusTone[String(row.status).toLowerCase()] || statusTone.info}>{String(row.status).replaceAll('_', ' ')}</Badge> },
    ...(['STUDENT', 'PARENT'].includes(currentRole) ? [{
      key: 'actions',
      label: 'Action',
      render: (row) => PAYABLE.has(row.status) && Number(row.dueAmount) > 0 && paymentConfig.onlinePaymentsEnabled
        ? (
          <button
            type="button"
            disabled={Boolean(processingId)}
            onClick={() => pay(row)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-500/25 active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
          >
            <CreditCard className="w-3.5 h-3.5" />
            {processingId === row.id ? 'Processing...' : 'Pay Now'}
          </button>
        )
        : PAYABLE.has(row.status) && Number(row.dueAmount) > 0
          ? <Badge tone="amber">Online payment unavailable</Badge>
          : <Badge tone="emerald">No payment due</Badge>,
    }] : []),
  ];

  const historyColumns = [
    { key: 'createdAt', label: 'Date', render: (row) => String(row.createdAt || '').slice(0, 10) },
    { key: 'invoiceId', label: 'Invoice Ref', render: (row) => String(row.invoiceId).slice(-8).toUpperCase() },
    { key: 'amount', label: 'Amount', render: (row) => formatCurrency(row.amount) },
    { key: 'status', label: 'Status', render: (row) => <Badge className={statusTone[String(row.status).toLowerCase()] || statusTone.info}>{String(row.status).replaceAll('_', ' ')}</Badge> },
    { key: 'actions', label: 'Action', render: (row) => row.receipt
      ? <Button size="sm" variant="secondary" icon={Download} disabled={processingId === row.receipt.id} onClick={() => downloadReceipt(row.receipt)}>Receipt</Button>
      : ['PENDING', 'AUTHORIZED', 'CREATED', 'FAILED'].includes(row.status) && paymentConfig.gatewayConfigured && canRefreshGatewayStatus
        ? <Button size="sm" variant="secondary" icon={RefreshCw} disabled={processingId === row.id} onClick={() => refreshAttempt(row)}>Refresh Status</Button>
        : ['PENDING', 'AUTHORIZED', 'CREATED', 'FAILED'].includes(row.status)
          ? <span className="text-xs font-semibold text-on-surface-variant">{paymentConfig.gatewayConfigured ? 'Verification permission required' : 'Gateway unavailable'}</span>
          : <span className="text-xs font-semibold text-on-surface-variant">Receipt after verification</span>,
    },
  ];

  const receiptColumns = [
    { key: 'issuedAt', label: 'Issued', render: (row) => String(row.issuedAt || '').slice(0, 10) },
    { key: 'receiptNumber', label: 'Receipt' },
    { key: 'invoiceId', label: 'Invoice Ref', render: (row) => String(row.invoiceId).slice(-8).toUpperCase() },
    { key: 'amount', label: 'Amount', render: (row) => formatCurrency(row.amount) },
    { key: 'paymentMode', label: 'Mode', render: (row) => String(row.paymentMode || '').replaceAll('_', ' ') },
    { key: 'actions', label: 'Action', render: (row) => <Button size="sm" variant="secondary" icon={Download} disabled={processingId === row.id} onClick={() => downloadReceipt(row)}>Download</Button> },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card className="overflow-hidden border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-slate-900/90 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-slate-100 dark:border-white/[0.06] pb-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400">
              <ShieldCheck className="h-5 w-5" />
              <span className="text-xs font-bold uppercase tracking-wider font-mono">Backend Verified Payments</span>
            </div>
            <h2 className="mt-1.5 text-xl font-bold text-slate-900 dark:text-white sm:text-2xl font-display">Secure Fee Invoices</h2>
            <p className="mt-1 max-w-2xl text-xs sm:text-sm leading-5 text-slate-500 dark:text-slate-400">
              Official invoices, verified gateway transactions, and downloadable receipts linked to this student.
            </p>
          </div>
          <Button variant="secondary" icon={RefreshCw} disabled={loading} onClick={load}>{loading ? 'Loading...' : 'Refresh'}</Button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-slate-50/80 dark:bg-slate-800/50 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">Total Invoiced</p>
            <p className="mt-1.5 break-words text-2xl font-bold font-display text-slate-900 dark:text-white">{formatCurrency(totals.demand)}</p>
          </div>
          <div className="rounded-xl border border-emerald-200/80 dark:border-emerald-500/20 bg-emerald-50/60 dark:bg-emerald-950/20 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 font-mono">Verified Paid</p>
            <p className="mt-1.5 break-words text-2xl font-bold font-display text-emerald-600 dark:text-emerald-400">{formatCurrency(totals.paid)}</p>
          </div>
          <div className={`rounded-xl border p-4 ${
            totals.due > 0 
              ? 'border-rose-200/80 dark:border-rose-500/20 bg-rose-50/60 dark:bg-rose-950/20' 
              : 'border-emerald-200/80 dark:border-emerald-500/20 bg-emerald-50/60 dark:bg-emerald-950/20'
          }`}>
            <p className={`text-xs font-bold uppercase tracking-wider font-mono ${
              totals.due > 0 ? 'text-rose-700 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'
            }`}>
              Balance Due
            </p>
            <p className={`mt-1.5 break-words text-2xl font-bold font-display ${
              totals.due > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
            }`}>
              {formatCurrency(totals.due)}
            </p>
          </div>
        </div>
      </Card>

      {notice ? <p role="status" className="rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm font-semibold text-on-surface">{notice}</p> : null}
      {['STUDENT', 'PARENT'].includes(currentRole) && !paymentConfig.onlinePaymentsEnabled ? <p role="status" className="rounded-xl border border-amber-300/50 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">Online payment is currently unavailable. Your invoices and verified payment history remain accessible; contact the school office for payment options.</p> : null}
      {error ? <div role="alert" className="flex flex-col gap-3 rounded-xl bg-error-container px-4 py-3 text-sm font-semibold text-on-error-container sm:flex-row sm:items-center sm:justify-between"><span>{error}</span><Button size="sm" variant="secondary" onClick={load}>Retry</Button></div> : null}

      <Card>
        <h2 className="mb-4 text-lg font-bold text-on-surface">Invoices</h2>
        <DataTable columns={invoiceColumns} rows={invoices} emptyText={loading ? 'Loading secure invoices...' : 'No secure fee invoices found'} />
      </Card>
      <Card>
        <h2 className="mb-4 text-lg font-bold text-on-surface">Receipts</h2>
        <DataTable columns={receiptColumns} rows={receipts} emptyText={loading ? 'Loading receipts...' : 'No verified receipts found'} />
      </Card>
      <Card>
        <h2 className="mb-4 text-lg font-bold text-on-surface">Online payment attempts</h2>
        <DataTable columns={historyColumns} rows={history} emptyText={loading ? 'Loading online payment attempts...' : 'No online payment attempts found'} />
      </Card>
    </div>
  );
}
