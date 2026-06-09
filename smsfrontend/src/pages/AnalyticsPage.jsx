import { BookOpen, ClipboardCheck, GraduationCap, IndianRupee } from 'lucide-react';
import PageHeader from '../components/common/PageHeader.jsx';
import Card from '../components/ui/Card.jsx';
import Donut from '../components/charts/Donut.jsx';
import StatCard from '../components/common/StatCard.jsx';
import Badge from '../components/ui/Badge.jsx';
import { useApp } from '../context/AppContext.jsx';
import { formatCurrency } from '../utils/formatters.js';

export default function AnalyticsPage() {
  const { data, isDataLoading } = useApp();
  const dashboard = data.dashboardAnalytics || {};
  const totals = dashboard.totals || {};
  const fees = dashboard.fees;
  const attendance = dashboard.attendance || {};
  const enrollment = dashboard.enrollmentByClass || [];

  return (
    <div className="page-shell">
      <PageHeader eyebrow="Reports" title="Institution Reports" description="Live, permission-scoped enrollment, attendance, finance, class, section, and academic-year summaries." />
      <div className="flex flex-wrap gap-2"><Badge tone={dashboard.totals ? 'emerald' : 'amber'}>{isDataLoading ? 'Refreshing' : dashboard.totals ? 'Live summary' : 'No report data'}</Badge>{(dashboard.academicYears || []).map((year) => <Badge key={year} tone="blue">{year}</Badge>)}</div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Student Strength" value={totals.students || 0} icon={GraduationCap} tone="blue" />
        <StatCard title="Today Attendance" value={`${attendance.percentage || 0}%`} icon={ClipboardCheck} tone="emerald" />
        <StatCard title="Classes / Sections" value={`${totals.classes || 0} / ${totals.sections || 0}`} icon={BookOpen} tone="violet" />
        <StatCard title="Fee Dues" value={fees ? formatCurrency(fees.due) : 'Restricted'} icon={IndianRupee} tone="amber" />
      </div>
      <div className="grid gap-5 xl:grid-cols-[1fr_.75fr]">
        <Card>
          <h3 className="text-xl font-bold text-on-surface">Class-wise student strength</h3>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {enrollment.length ? enrollment.map((item) => (
              <div key={item.id} className="rounded-xl bg-surface-container-low p-4 ring-1 ring-outline-variant/40">
                <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-bold text-on-surface">Class {item.name} {item.section}</p><Badge tone="blue">{item.academicYear}</Badge></div>
                <p className="mt-3 text-2xl font-bold text-on-surface">{item._count?.students || 0}</p>
                <p className="text-xs font-semibold uppercase text-on-surface-variant">Students</p>
              </div>
            )) : <p className="text-sm font-semibold text-on-surface-variant">No class report data is available with the current permissions.</p>}
          </div>
        </Card>
        <Card>
          <h3 className="text-xl font-bold text-on-surface">Fee collection</h3>
          {fees ? (
            <>
              <div className="mt-7 flex justify-center"><Donut value={fees.collectionRate || 0} label="Collected" stroke="#f59e0b" size={150} /></div>
              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-surface-container-low p-4"><p className="text-xs font-bold uppercase text-on-surface-variant">Collected</p><p className="mt-2 font-bold text-on-surface">{formatCurrency(fees.collected)}</p></div>
                <div className="rounded-xl bg-surface-container-low p-4"><p className="text-xs font-bold uppercase text-on-surface-variant">Due</p><p className="mt-2 font-bold text-on-surface">{formatCurrency(fees.due)}</p></div>
              </div>
            </>
          ) : <p className="mt-5 text-sm font-semibold text-on-surface-variant">Fee report access is restricted for this admin.</p>}
        </Card>
      </div>
    </div>
  );
}
