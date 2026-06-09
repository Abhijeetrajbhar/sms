import { ArrowUpRight } from 'lucide-react';
import SparkLine from '../charts/SparkLine.jsx';
import Card from '../ui/Card.jsx';
import { cn } from '../../utils/cn.js';

const toneMap = {
  blue: { icon: 'bg-primary/10 text-primary', stroke: '#3525cd' },
  violet: { icon: 'bg-primary/10 text-primary', stroke: '#4f46e5' },
  emerald: { icon: 'bg-emerald-50 text-tertiary', stroke: '#005338' },
  amber: { icon: 'bg-amber-50 text-amber-600', stroke: '#f59e0b' },
  rose: { icon: 'bg-error-container text-error', stroke: '#ba1a1a' },
};

export default function StatCard({ title, value, delta, icon: Icon, tone = 'blue', data }) {
  const token = toneMap[tone] || toneMap.blue;

  return (
    <Card hover className="relative overflow-hidden p-4 sm:p-5">
      <div className="absolute -right-10 -top-10 h-24 w-24 rounded-full bg-oryx-400/10 blur-2xl sm:h-28 sm:w-28" />
      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase text-on-surface-variant">{title}</p>
          <p className="mt-2 truncate text-2xl font-extrabold leading-tight text-on-background dark:text-white sm:text-[32px]">{value}</p>
          {delta ? (
            <p className={cn('mt-2 inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-xs font-bold ring-1', delta > 0 ? 'text-emerald-600 ring-emerald-100' : 'text-rose-600 ring-rose-100')}>
              <ArrowUpRight className="h-3.5 w-3.5" /> {Math.abs(delta)}% this month
            </p>
          ) : null}
        </div>
        <div className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl shadow-sm sm:h-12 sm:w-12', token.icon)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {data ? <div className="relative mt-5 h-14"><SparkLine data={data} stroke={token.stroke} /></div> : null}
    </Card>
  );
}
