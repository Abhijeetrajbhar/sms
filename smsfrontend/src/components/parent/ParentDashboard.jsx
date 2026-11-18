import {
  AlertCircle,
  Award,
  BellRing,
  BookOpen,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
  Download,
  GraduationCap,
  IndianRupee,
  Megaphone,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import PageHeader from '../common/PageHeader.jsx';
import StatCard from '../common/StatCard.jsx';
import Card from '../ui/Card.jsx';
import Badge from '../ui/Badge.jsx';
import Button from '../ui/Button.jsx';
import { formatCurrency } from '../../utils/formatters.js';

function childFullName(user) {
  return [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Student';
}

function EmptyFeed({ message }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 dark:border-white/[0.08] bg-slate-50/50 dark:bg-slate-900/40 py-8 px-4 text-center">
      <p className="font-mono text-xs text-slate-500 dark:text-slate-400">{message}</p>
    </div>
  );
}

export default function ParentDashboard({
  dashboard,
  selectedChildId,
  onSelectChild,
  isLoading,
  error,
  onRetry,
}) {
  if (isLoading && !dashboard) {
    return (
      <div className="page-shell">
        <Card className="flex items-center justify-center py-16">
          <div className="flex items-center gap-3 font-mono text-xs text-slate-600 dark:text-slate-400">
            <RefreshCw className="h-4 w-4 animate-spin text-brand-600 dark:text-brand-400" />
            Loading parent dashboard...
          </div>
        </Card>
      </div>
    );
  }

  const children = dashboard?.children || [];
  const child = dashboard?.selectedChild;
  const attendance = dashboard?.attendance?.summary || {};
  const invoices = dashboard?.fees?.invoices || [];
  const receipts = dashboard?.fees?.receipts || [];
  const assignments = dashboard?.assignments || [];
  const results = dashboard?.results || [];
  const notices = dashboard?.notices || [];

  const dueAmount = invoices.reduce((sum, invoice) => sum + Number(invoice.dueAmount || 0), 0);
  const paidAmount = invoices.reduce((sum, invoice) => sum + Number(invoice.paidAmount || 0), 0);
  const totalBilled = invoices.reduce((sum, invoice) => sum + Number(invoice.payableAmount || 0), 0);

  const pendingAssignments = assignments.filter(
    (assignment) => !assignment.submissions?.length && new Date(assignment.dueDate) >= new Date()
  );
  const averageScore = results.length
    ? Math.round(results.reduce((sum, result) => sum + Number(result.percentage || 0), 0) / results.length)
    : 0;

  const latestAttendance = dashboard?.attendance?.records?.[0];

  const quickActions = [
    { label: 'Attendance Log', path: '/app/attendance', icon: ClipboardCheck, color: 'text-emerald-500 dark:text-emerald-400' },
    { label: 'Pay School Fees', path: '/app/fees', icon: CreditCard, color: 'text-brand-600 dark:text-brand-400' },
    { label: 'Homework & Tasks', path: '/app/assignments', icon: BellRing, color: 'text-amber-500 dark:text-amber-400' },
    { label: 'Published Marks', path: '/app/results', icon: Award, color: 'text-indigo-500 dark:text-indigo-400' },
    { label: 'Weekly Timetable', path: '/app/timetable', icon: CalendarDays, color: 'text-sky-500 dark:text-sky-400' },
    { label: 'School Notices', path: '/app/announcements', icon: Megaphone, color: 'text-purple-500 dark:text-purple-400' },
  ];

  return (
    <div className="page-shell space-y-6">
      <PageHeader
        eyebrow="Parent Portal"
        title="Family Academic & Finance Overview"
        description="Monitor your child's attendance, pay school fees securely, and review academic progress."
      />

      {error ? (
        <div role="alert" className="flex flex-col gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 font-mono text-xs text-rose-700 dark:text-rose-300 sm:flex-row sm:items-center sm:justify-between">
          <span>{error}</span>
          <Button size="sm" variant="secondary" icon={RefreshCw} onClick={onRetry}>Retry</Button>
        </div>
      ) : null}

      {/* Linked Children Selector Header Card */}
      <div className="surface-card p-5 border border-slate-200/80 dark:border-white/[0.08] rounded-2xl bg-white dark:bg-slate-900/90 shadow-sm transition-colors">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-xl border border-brand-500/30 bg-brand-500/10 text-brand-600 dark:text-brand-400 shadow-sm">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {child ? childFullName(child.user) : 'No Linked Child'}
                </h2>
                <span className="font-mono text-[10px] font-semibold rounded-full border border-brand-500/30 bg-brand-500/10 px-2.5 py-0.5 text-brand-700 dark:text-brand-300">
                  GUARDIAN LINK
                </span>
              </div>
              <p className="font-mono text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {child?.class
                  ? `Class ${child.class.name} ${child.class.section} • Academic Year ${child.class.academicYear}`
                  : 'Contact administrator to verify and link a student'}
              </p>
            </div>
          </div>

          {children.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-slate-600 dark:text-slate-400">Select Child:</span>
              <select
                value={selectedChildId || child?.id || ''}
                onChange={(e) => onSelectChild(e.target.value)}
                className="font-mono text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2 text-slate-900 dark:text-white font-medium focus:border-brand-500 focus:outline-none shadow-sm"
              >
                {children.map((c) => (
                  <option key={c.id} value={c.id}>
                    {childFullName(c.user)} ({c.studentCode})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {!child ? (
        <Card>
          <EmptyFeed message="No active linked child profile found for this parent account." />
        </Card>
      ) : (
        <>
          {/* KPI Metrics Row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Attendance Record"
              value={`${attendance.percentage || 0}%`}
              icon={ClipboardCheck}
              tone="emerald"
            />
            <StatCard
              title="Pending Fees"
              value={formatCurrency(dueAmount)}
              icon={IndianRupee}
              tone={dueAmount > 0 ? 'rose' : 'emerald'}
            />
            <StatCard
              title="Assignments Due"
              value={pendingAssignments.length}
              icon={BellRing}
              tone="blue"
            />
            <StatCard
              title="Academic Average"
              value={results.length ? `${averageScore}%` : 'N/A'}
              icon={Award}
              tone="violet"
            />
          </div>

          {/* Quick Action Navigation Grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            {quickActions.map(({ label, path, icon: Icon, color }) => (
              <Link key={label} to={path}>
                <Card hover className="flex flex-col items-center justify-center gap-2.5 p-4 text-center transition-all duration-200">
                  <div className={`grid h-9 w-9 place-items-center rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04] ${color} shadow-sm`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{label}</span>
                </Card>
              </Link>
            ))}
          </div>

          {/* Urgent Alerts & Financial Overview */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Attention Card: Daily Attendance */}
            <Card className="p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/[0.06] pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <BellRing className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                    <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">Daily Presence Alert</h3>
                  </div>
                  <span className="font-mono text-xs text-slate-500 dark:text-slate-400">Today's Check</span>
                </div>

                <div className="rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-slate-50/80 dark:bg-slate-900/40 p-4">
                  <p className="font-mono text-xs text-slate-600 dark:text-slate-400">Latest Recorded Attendance Status:</p>
                  <div className="mt-2.5 flex items-center gap-3">
                    <span
                      className={`font-mono text-xs font-bold px-3 py-1 rounded-full border ${
                        latestAttendance?.status === 'PRESENT'
                          ? 'border-emerald-300 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                          : latestAttendance?.status === 'ABSENT'
                          ? 'border-rose-300 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400'
                          : 'border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300'
                      }`}
                    >
                      {latestAttendance?.status || 'Awaiting roll call'}
                    </span>
                    <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                      {latestAttendance?.date ? String(latestAttendance.date).slice(0, 10) : 'Today'}
                    </span>
                  </div>
                  {latestAttendance?.remarks && (
                    <p className="mt-2.5 text-xs text-slate-600 dark:text-slate-400 italic">Teacher remark: {latestAttendance.remarks}</p>
                  )}
                </div>
              </div>

              <div className="mt-5 border-t border-slate-100 dark:border-white/[0.06] pt-3">
                <Link to="/app/attendance" className="font-mono text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline inline-flex items-center gap-1">
                  View full attendance calendar →
                </Link>
              </div>
            </Card>

            {/* Invoices & Fee Status Card */}
            <Card className="p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/[0.06] pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                    <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">Fee Settlement Hub</h3>
                  </div>
                  <span className="font-mono text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    {invoices.length} {invoices.length === 1 ? 'Invoice' : 'Invoices'}
                  </span>
                </div>

                <div className="space-y-3.5">
                  {/* Balance Summary Banner */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-slate-50/80 dark:bg-slate-900/40 p-4">
                    <div>
                      <p className="font-mono text-xs text-slate-500 dark:text-slate-400">Outstanding Balance Due</p>
                      <p className={`mt-1 font-display text-2xl font-bold ${dueAmount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {formatCurrency(dueAmount)}
                      </p>
                      <div className="mt-1 flex items-center gap-2 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                        <span>Paid: <strong className="text-emerald-600 dark:text-emerald-400">{formatCurrency(paidAmount)}</strong></span>
                        <span>•</span>
                        <span>Billed: {formatCurrency(totalBilled)}</span>
                      </div>
                    </div>

                    {dueAmount > 0 ? (
                      <Link to="/app/fees" className="self-start sm:self-auto">
                        <button
                          type="button"
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-500/25 active:scale-95 transition-all cursor-pointer"
                        >
                          <CreditCard className="w-4 h-4" />
                          Pay Fees Online
                        </button>
                      </Link>
                    ) : (
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 self-start sm:self-auto">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 font-mono text-xs font-semibold">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          All Fees Settled
                        </div>
                        <Link to="/app/fees">
                          <button
                            type="button"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold text-xs text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            Fee Ledger
                          </button>
                        </Link>
                      </div>
                    )}
                  </div>

                  {/* List of Invoices Preview */}
                  {invoices.length > 0 && (
                    <div className="space-y-2">
                      <p className="font-mono text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Recent Invoices
                      </p>
                      {invoices.slice(0, 3).map((inv) => (
                        <div
                          key={inv.id}
                          className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200/60 dark:border-white/[0.06] bg-white dark:bg-slate-800/60 text-xs"
                        >
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-white">
                              {inv.title || inv.invoiceNumber || 'Term Fee Invoice'}
                            </div>
                            <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                              Due: {inv.dueDate ? String(inv.dueDate).slice(0, 10) : 'TBD'}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-slate-900 dark:text-white">
                              {formatCurrency(inv.payableAmount || inv.amount)}
                            </div>
                            <span
                              className={`inline-block font-mono text-[10px] px-2 py-0.2 rounded-full font-semibold ${
                                inv.status === 'PAID'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                  : inv.status === 'PARTIAL'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                              }`}
                            >
                              {inv.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5 border-t border-slate-100 dark:border-white/[0.06] pt-3 flex items-center justify-between">
                <Link to="/app/fees" className="font-mono text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline inline-flex items-center gap-1">
                  Manage all invoices & receipts →
                </Link>
                {receipts.length > 0 && (
                  <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> {receipts.length} Verified Receipt{receipts.length === 1 ? '' : 's'}
                  </span>
                )}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
