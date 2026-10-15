import { ArrowUpRight } from 'lucide-react';
import SparkLine from '../charts/SparkLine.jsx';
import Card from '../ui/Card.jsx';
import { cn } from '../../utils/cn.js';

const toneMap = {
  blue: { icon: 'border border-sky-500/30 bg-sky-500/10 text-sky-500 dark:text-sky-400', stroke: '#0284c7' },
  violet: { icon: 'border border-indigo-500/30 bg-indigo-500/10 text-indigo-500 dark:text-indigo-400', stroke: '#6366f1' },
  emerald: { icon: 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', stroke: '#10b981' },
  amber: { icon: 'border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400', stroke: '#f59e0b' },
  rose: { icon: 'border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400', stroke: '#f43f5e' },
};

export default function StatCard({ title, value, delta, icon: Icon, tone = 'blue', data }) {
  const token = toneMap[tone] || toneMap.blue;

  return (
    <Card hover className="relative overflow-hidden p-4 sm:p-5">
      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{title}</p>
          <p className="mt-2 truncate font-display text-2xl font-extrabold tracking-tight text-on-background dark:text-white sm:text-[30px]">{value}</p>
          {delta ? (
            <p className={cn('mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold', delta > 0 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20')}>
              <ArrowUpRight className="h-3 w-3" /> {Math.abs(delta)}%
            </p>
          ) : null}
        </div>
        <div className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl shadow-sm sm:h-11 sm:w-11', token.icon)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {data ? <div className="relative mt-4 h-12"><SparkLine data={data} stroke={token.stroke} /></div> : null}
    </Card>
  );
}
