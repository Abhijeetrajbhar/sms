import Badge from '../ui/Badge.jsx';
import { statusTone } from '../../utils/statusStyles.js';

export default function DataTable({ columns = [], rows = [], emptyText = 'No records found' }) {
  const safeRows = Array.isArray(rows) ? rows : [];

  return (
    <div className="min-w-0 overflow-hidden rounded-[18px] border border-slate-200/80 bg-white shadow-sm dark:border-white/[0.08] dark:bg-[#0c0e14] sm:rounded-[24px]">
      <div className="overscroll-x-contain overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]">
        <table className="min-w-[720px] divide-y divide-slate-100 text-left text-sm">
          <thead className="bg-surface-container-low/80 dark:bg-white/5">
            <tr>
              {columns.map((column) => (
                <th key={column.key} scope="col" className="whitespace-nowrap px-4 py-3 text-xs font-bold uppercase text-on-surface-variant sm:px-6 sm:py-4">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/10">
            {safeRows.length ? safeRows.map((row) => (
              <tr key={row.id || row.name || row.student} className="transition hover:bg-primary-container/5 dark:hover:bg-white/5">
                {columns.map((column) => (
                  <td key={column.key} className="max-w-[18rem] break-words px-4 py-3 font-medium text-on-surface dark:text-slate-200 sm:px-6 sm:py-4">
                    {column.type === 'status' ? (
                      <Badge className={statusTone[row[column.key]] || statusTone.info}>{String(row[column.key]).replace('_', ' ')}</Badge>
                    ) : column.render ? column.render(row) : row[column.key]}
                  </td>
                ))}
              </tr>
            )) : (
              <tr>
                <td className="px-5 py-12 text-center font-semibold text-slate-400" colSpan={columns.length}>{emptyText}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
