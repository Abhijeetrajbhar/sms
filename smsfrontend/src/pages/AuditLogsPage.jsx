import { ShieldCheck } from 'lucide-react';
import PageHeader from '../components/common/PageHeader.jsx';
import DataTable from '../components/common/DataTable.jsx';
import Card from '../components/ui/Card.jsx';
import Badge from '../components/ui/Badge.jsx';
import { useApp } from '../context/AppContext.jsx';
import { statusTone } from '../utils/statusStyles.js';

export default function AuditLogsPage() {
  const { data } = useApp();
  const columns = [
    { key: 'time', label: 'Time' },
    { key: 'actor', label: 'Actor' },
    { key: 'module', label: 'Module' },
    { key: 'action', label: 'Action' },
    { key: 'severity', label: 'Severity', render: (row) => <Badge className={statusTone[row.severity]}>{row.severity}</Badge> },
  ];

  return (
    <div className="page-shell">
      <PageHeader eyebrow="Security" title="Security Audit Logs" description="Track sensitive operations for compliance, accountability, and role-based monitoring." />
      <Card>
        <div className="mb-5 flex items-start gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-slate-900 to-slate-600 text-white">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-on-surface sm:text-xl">Recent System Events</h3>
            <p className="text-sm font-semibold text-slate-400">Backend audit entries can be loaded from your Express API.</p>
          </div>
        </div>
        <DataTable columns={columns} rows={data.auditLogs} />
      </Card>
    </div>
  );
}
