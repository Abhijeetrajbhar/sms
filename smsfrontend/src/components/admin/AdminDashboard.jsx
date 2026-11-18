import {
  Activity,
  ArrowRight,
  BookOpen,
  CalendarCheck,
  ClipboardCheck,
  CreditCard,
  FileCheck2,
  GraduationCap,
  IndianRupee,
  Layers,
  Megaphone,
  PlusCircle,
  RefreshCw,
  Shield,
  ShieldCheck,
  Terminal,
  UserCheck,
  UserPlus,
  UserRoundCheck,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import PageHeader from '../common/PageHeader.jsx';
import StatCard from '../common/StatCard.jsx';
import Card from '../ui/Card.jsx';
import Badge from '../ui/Badge.jsx';
import Button from '../ui/Button.jsx';
import { formatCurrency } from '../../utils/formatters.js';
import { hasPermission } from '../../utils/permissions.js';

function EmptyFeed({ message }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-8 px-4 text-center dark:border-white/[0.08] dark:bg-black/20">
      <div className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-slate-500 dark:bg-white/[0.04]">
        <Terminal className="h-4 w-4" />
      </div>
      <p className="mt-2 font-mono text-xs text-slate-500 dark:text-slate-400">{message}</p>
    </div>
  );
}

export default function AdminDashboard({ dashboard, currentUser, isLoading, error, onRetry }) {
  const totals = dashboard?.totals || {};
  const pending = dashboard?.pending || {};

  const actionCatalog = [
    { label: 'Add Student', path: '/app/students', perm: 'students:create', icon: UserPlus },
    { label: 'Add Faculty', path: '/app/teachers', perm: 'teachers:create', icon: UserCheck },
    { label: 'Register Parent', path: '/app/parents', perm: 'parents:create', icon: Users },
    { label: 'Class Setup', path: '/app/classes', perm: 'classes:manage', icon: Layers },
    { label: 'Post Notice', path: '/app/announcements', perm: 'notices:manage', icon: Megaphone },
    { label: 'Fee Billing', path: '/app/fees', perm: 'fees:view', icon: CreditCard },
    { label: 'Attendance', path: '/app/attendance', perm: 'attendance:view', icon: CalendarCheck },
    { label: 'Analytics', path: '/app/analytics', perm: 'reports:view', icon: Activity },
  ];

  const quickActions = actionCatalog.filter((item) => hasPermission(currentUser, item.perm));

  if (isLoading && !dashboard) {
    return (
      <div className="page-shell">
        <Card className="flex items-center justify-center py-16">
          <div className="flex items-center gap-3 font-mono text-xs text-slate-500 dark:text-slate-400">
            <RefreshCw className="h-4 w-4 animate-spin text-indigo-500 dark:text-indigo-400" />
            Loading dashboard data...
          </div>
        </Card>
      </div>
    );
  }

  const feeCollected = dashboard?.fees?.collected || 0;
  const feeDue = dashboard?.fees?.due || 0;
  const feeTotal = feeCollected + feeDue;
  const feeRate = feeTotal > 0 ? Math.round((feeCollected / feeTotal) * 100) : 0;

  return (
    <div className="page-shell space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="School Operations & Overview"
        description="Monitor daily attendance, student enrollment, fee collections, and system activity."
      />

      {error ? (
        <div role="alert" className="flex flex-col gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 font-mono text-xs text-rose-700 dark:text-rose-300 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
          <Button size="sm" variant="secondary" icon={RefreshCw} onClick={onRetry}>Retry</Button>
        </div>
      ) : null}

      {/* KPI Overview Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Active Students"
          value={`${totals.activeStudents || 0} / ${totals.students || 0}`}
          icon={GraduationCap}
          tone="blue"
        />
        <StatCard
          title="Faculty Members"
          value={`${totals.activeTeachers || 0} / ${totals.teachers || 0}`}
          icon={Users}
          tone="violet"
        />
        <StatCard
          title="Classes / Sections"
          value={`${totals.classes || 0} / ${totals.sections || 0}`}
          icon={BookOpen}
          tone="emerald"
        />
        <StatCard
          title="Roll-Call Attendance"
          value={`${dashboard?.attendance?.percentage || 0}%`}
          icon={ClipboardCheck}
          tone="amber"
        />
      </div>

      {/* Command Bar / Quick Actions */}
      {quickActions.length > 0 && (
        <Card className="p-4 sm:p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.06] mb-4">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
              <p className="font-mono text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Command Dispatch Palette
              </p>
            </div>
            <span className="font-mono text-[11px] text-slate-400 dark:text-slate-500">Shortcut Actions</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 xl:grid-cols-8">
            {quickActions.map(({ label, path, icon: Icon }) => (
              <Link key={label} to={path} className="group">
                <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-center transition duration-200 hover:border-indigo-400 hover:bg-indigo-50/50 dark:border-white/[0.08] dark:bg-white/[0.02] dark:hover:border-indigo-500/40 dark:hover:bg-indigo-500/10">
                  <div className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-700 transition group-hover:text-indigo-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300 dark:group-hover:text-indigo-400">
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="truncate text-xs font-semibold text-slate-800 transition group-hover:text-indigo-600 dark:text-slate-300 dark:group-hover:text-white">
                    {label}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}

      {/* Middle Operations Grid: Fees, Pending Queue, Academic Config */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Fee Engine Summary */}
        <Card className="flex flex-col justify-between p-5">
          <div>
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 dark:border-white/[0.06] pb-3">
              <div>
                <p className="font-mono text-[10px] uppercase text-indigo-600 dark:text-indigo-400">Treasury</p>
                <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">Fee Health & Ledger</h3>
              </div>
              <div className="grid h-8 w-8 place-items-center rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-600 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-400">
                <CreditCard className="h-4 w-4" />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-3.5 dark:border-white/[0.06] dark:bg-black/20">
                <p className="font-mono text-[11px] text-slate-500 dark:text-slate-400">Settled (Collected)</p>
                <p className="mt-1 font-display text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(feeCollected)}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-3.5 dark:border-white/[0.06] dark:bg-black/20">
                <p className="font-mono text-[11px] text-slate-500 dark:text-slate-400">Pending Dues</p>
                <p className="mt-1 font-display text-lg font-bold text-rose-600 dark:text-rose-400">
                  {formatCurrency(feeDue)}
                </p>
              </div>
            </div>

            <div className="mt-4">
              <div className="flex justify-between font-mono text-[11px] text-slate-600 dark:text-slate-400">
                <span>Collection Efficiency</span>
                <span className="font-bold text-slate-900 dark:text-white">{feeRate}%</span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-white/[0.06]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-500"
                  style={{ width: `${Math.min(feeRate, 100)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-5 border-t border-slate-100 dark:border-white/[0.06] pt-3">
            <Link to="/app/fees" className="flex items-center justify-between font-mono text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
              <span>Open Ledger & Reconciliation</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </Card>

        {/* Pending Actions Queue */}
        <Card className="flex flex-col justify-between p-5">
          <div>
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 dark:border-white/[0.06] pb-3">
              <div>
                <p className="font-mono text-[10px] uppercase text-amber-600 dark:text-amber-400">Governance</p>
                <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">Pending Action Queue</h3>
              </div>
              <div className="grid h-8 w-8 place-items-center rounded-lg border border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400">
                <UserRoundCheck className="h-4 w-4" />
              </div>
            </div>

            <div className="mt-4 space-y-2.5">
              {[
                { label: 'Unlinked Student Profiles', count: pending.parentLinks, route: '/app/students' },
                { label: 'Faculty Account Approvals', count: pending.teacherApprovals, route: '/app/teachers' },
                { label: 'Offline Payment Verifications', count: pending.offlinePayments, route: '/app/fees' },
              ].map((item, idx) => (
                <Link key={idx} to={item.route} className="block group">
                  <div className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50 p-3 transition group-hover:border-slate-300 dark:border-white/[0.06] dark:bg-black/20 dark:group-hover:border-white/20">
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-white">
                      {item.label}
                    </span>
                    <span
                      className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                        item.count
                          ? 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400'
                          : 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400'
                      }`}
                    >
                      {item.count ? `${item.count} Action` : '0 Clear'}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="mt-5 border-t border-slate-100 dark:border-white/[0.06] pt-3 font-mono text-[11px] text-slate-500 dark:text-slate-400">
            System status: Continuous compliance validation
          </div>
        </Card>

        {/* Academic Structure Matrix */}
        <Card className="flex flex-col justify-between p-5">
          <div>
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 dark:border-white/[0.06] pb-3">
              <div>
                <p className="font-mono text-[10px] uppercase text-sky-600 dark:text-sky-400">Architecture</p>
                <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">Academic Roster</h3>
              </div>
              <div className="grid h-8 w-8 place-items-center rounded-lg border border-sky-200 bg-sky-50 text-sky-600 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-400">
                <Layers className="h-4 w-4" />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-3.5 dark:border-white/[0.06] dark:bg-black/20">
                <p className="font-mono text-[11px] text-slate-500 dark:text-slate-400">Curriculum Subjects</p>
                <p className="mt-1 font-display text-xl font-bold text-slate-900 dark:text-white">{totals.subjects || 0}</p>
              </div>
              <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-3.5 dark:border-white/[0.06] dark:bg-black/20">
                <p className="font-mono text-[11px] text-slate-500 dark:text-slate-400">Verified Guardians</p>
                <p className="mt-1 font-display text-xl font-bold text-slate-900 dark:text-white">{totals.parents || 0}</p>
              </div>
            </div>

            <div className="mt-4">
              <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Active Terms & Years</p>
              <div className="flex flex-wrap gap-1.5">
                {(dashboard?.academicYears || []).map((year) => (
                  <span
                    key={year}
                    className="font-mono text-[11px] rounded-lg border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300"
                  >
                    {year}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-5 border-t border-slate-100 dark:border-white/[0.06] pt-3">
            <Link to="/app/academic-setup" className="flex items-center justify-between font-mono text-xs text-sky-600 dark:text-sky-400 hover:underline">
              <span>Manage Curriculum & Classes</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </Card>
      </div>

      {/* Live Activity Feeds: Admissions, Notices, and Cryptographic Audits */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Admissions */}
        <Card className="p-5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/[0.06] pb-3 mb-4">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-sky-600 dark:text-sky-400" />
              <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">Recent Admissions</h3>
            </div>
            <Link to="/app/admissions" className="font-mono text-[11px] text-sky-600 dark:text-sky-400 hover:underline">
              View all
            </Link>
          </div>

          <div className="space-y-2.5">
            {dashboard?.recentAdmissions?.length ? (
              dashboard.recentAdmissions.slice(0, 5).map((student) => (
                <div key={student.id} className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50 p-3 dark:border-white/[0.06] dark:bg-black/20">
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      {student.user.firstName} {student.user.lastName}
                    </p>
                    <p className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                      Code: {student.studentCode}
                    </p>
                  </div>
                  <span className="font-mono text-[10px] rounded border border-slate-200 bg-white px-2 py-0.5 text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
                    {student.class ? `${student.class.name} ${student.class.section}` : 'Unassigned'}
                  </span>
                </div>
              ))
            ) : (
              <EmptyFeed message="No recent admissions logged" />
            )}
          </div>
        </Card>

        {/* Notices & Dispatches */}
        <Card className="p-5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/[0.06] pb-3 mb-4">
            <div className="flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">Recent Notices</h3>
            </div>
            <Link to="/app/announcements" className="font-mono text-[11px] text-amber-600 dark:text-amber-400 hover:underline">
              Manage
            </Link>
          </div>

          <div className="space-y-2.5">
            {dashboard?.recentNotices?.length ? (
              dashboard.recentNotices.slice(0, 5).map((notice) => (
                <div key={notice.id} className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50 p-3 dark:border-white/[0.06] dark:bg-black/20">
                  <p className="truncate text-xs font-semibold text-slate-900 dark:text-white max-w-[180px]">{notice.title}</p>
                  <span className="font-mono text-[10px] rounded border border-amber-300 bg-amber-50 px-2 py-0.5 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                    {notice.target}
                  </span>
                </div>
              ))
            ) : (
              <EmptyFeed message="No active announcements" />
            )}
          </div>
        </Card>

        {/* Live Cryptographic Audit Stream */}
        <Card className="p-5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/[0.06] pb-3 mb-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">Cryptographic Audit</h3>
            </div>
            <Link to="/app/audit-logs" className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline">
              Inspect logs
            </Link>
          </div>

          <div className="space-y-2.5">
            {dashboard?.recentAudit?.length ? (
              dashboard.recentAudit.slice(0, 5).map((log) => (
                <div key={log.id} className="rounded-xl border border-slate-200/80 bg-slate-50 p-2.5 font-mono text-[11px] dark:border-white/[0.06] dark:bg-black/20">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {String(log.action).replaceAll('_', ' ')}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">{log.entity}</span>
                  </div>
                  <p className="mt-1 text-slate-700 dark:text-slate-300">
                    By: {log.actor ? `${log.actor.firstName} ${log.actor.lastName}` : 'System Engine'}
                  </p>
                </div>
              ))
            ) : (
              <EmptyFeed message="No recent audit events" />
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
