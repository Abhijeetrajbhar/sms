import { IndianRupee, ShieldCheck, Zap } from 'lucide-react';
import { useState } from 'react';
import PageHeader from '../components/common/PageHeader.jsx';
import StatCard from '../components/common/StatCard.jsx';
import FinanceOperations from '../components/fees/FinanceOperations.jsx';
import SecureFeeInvoices from '../components/fees/SecureFeeInvoices.jsx';
import RazorpayCheckoutButton from '../components/payment/RazorpayCheckoutButton.jsx';
import { useApp } from '../context/AppContext.jsx';
import { formatCurrency } from '../utils/formatters.js';
import { getScopedStudent } from '../utils/studentScope.js';
import { hasPermission } from '../utils/permissions.js';

export default function FeesPage() {
  const { data, currentRole, currentUser } = useApp();
  const [secureInvoices, setSecureInvoices] = useState([]);
  const [secureRefreshKey, setSecureRefreshKey] = useState(0);
  const [testAmount, setTestAmount] = useState(500);
  const scopedStudent = getScopedStudent(data, currentUser, currentRole);
  const isPersonalView = ['STUDENT', 'PARENT'].includes(currentRole);

  const canOperateFinance = currentRole === 'ADMIN' && [
    'fees:create',
    'fees:collect',
    'payments:verify',
    'fees:refund',
    'reports:view',
  ].some((permission) => hasPermission(currentUser, permission));

  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);

  const invoiceTotals = secureInvoices.reduce((summary, invoice) => {
    const dueDate = invoice.dueDate ? new Date(invoice.dueDate) : null;
    if (dueDate && !Number.isNaN(dueDate.getTime())) dueDate.setHours(0, 0, 0, 0);
    const dueAmount = Number(invoice.dueAmount || 0);
    const isOverdue = dueAmount > 0
      && dueDate
      && !Number.isNaN(dueDate.getTime())
      && dueDate < todayDate
      && !['PAID', 'CANCELLED', 'REFUNDED', 'EXPIRED'].includes(String(invoice.status || '').toUpperCase());

    return {
      total: summary.total + Number(invoice.payableAmount || 0),
      paid: summary.paid + Number(invoice.paidAmount || 0),
      overdue: summary.overdue + (isOverdue ? dueAmount : 0),
    };
  }, { total: 0, paid: 0, overdue: 0 });

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Finance office"
        title={currentRole === 'PARENT' ? 'Fees & Payments' : isPersonalView ? 'My Fees' : 'Fee Management'}
        description={currentRole === 'PARENT' ? 'Invoices, verified payments, balances, and downloadable receipts for the selected linked child.' : isPersonalView ? 'Fee demand, payment status, due dates, and paid amount for the signed-in student only.' : 'Track collection, pending dues, overdue cases, and student-wise payment status.'}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard title="Total Demand" value={formatCurrency(invoiceTotals.total)} icon={IndianRupee} tone="blue" />
        <StatCard title="Collected" value={formatCurrency(invoiceTotals.paid)} icon={IndianRupee} tone="emerald" />
        <StatCard title="Overdue" value={formatCurrency(invoiceTotals.overdue)} icon={IndianRupee} tone="rose" />
      </div>

      {/* Razorpay Standard Web Checkout Integration Widget */}
      <div className="surface-card p-5 border border-indigo-500/25 rounded-2xl bg-gradient-to-r from-indigo-500/5 via-purple-500/5 to-blue-500/5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/10 dark:bg-indigo-400/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Razorpay Standard Checkout
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Test Mode Connected
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Live gateway integration with standard modal checkout & HMAC-SHA256 signature verification
              </p>
            </div>
          </div>
          <div className="text-xs font-mono bg-slate-100 dark:bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 self-start sm:self-auto">
            Key: <span className="text-indigo-600 dark:text-indigo-400 font-semibold">rzp_test_TnpXuenJ5WWK2i</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
          <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Quick Test Amount:</span>
          {[1, 50, 500, 1000].map((val) => (
            <button
              key={val}
              type="button"
              onClick={() => setTestAmount(val)}
              className={`px-3 py-1 text-xs rounded-lg font-medium transition-all ${
                testAmount === val
                  ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-indigo-500'
              }`}
            >
              ₹{val} ({val * 100}p)
            </button>
          ))}
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-xs text-slate-500">Custom ₹:</span>
            <input
              type="number"
              min="1"
              value={testAmount}
              onChange={(e) => setTestAmount(Math.max(1, Number(e.target.value) || 1))}
              className="w-20 px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Backend endpoints: <code className="text-[11px] font-mono text-slate-700 dark:text-slate-300">POST /api/create-order</code> & <code className="text-[11px] font-mono text-slate-700 dark:text-slate-300">POST /api/verify-payment</code></span>
          </div>
          <RazorpayCheckoutButton
            amount={Math.round(testAmount * 100)}
            currency="INR"
            name="CampusOryx School"
            description={`Standard Fee Checkout - ₹${testAmount}`}
            prefill={{
              name: currentUser?.name || 'Student / Parent',
              email: currentUser?.email || 'test@example.com',
            }}
            buttonText={`Pay ₹${testAmount} with Razorpay`}
            onSuccess={() => {
              setSecureRefreshKey((k) => k + 1);
            }}
          />
        </div>
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
          currentUser={currentUser}
          onChanged={() => setSecureRefreshKey((value) => value + 1)}
        />
      ) : null}
    </div>
  );
}
