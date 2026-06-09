import { cn } from '../../utils/cn.js';

const tones = {
  blue: 'from-oryx-500 to-cyan-400',
  violet: 'from-violet-500 to-fuchsia-500',
  emerald: 'from-emerald-500 to-teal-400',
  amber: 'from-amber-500 to-orange-500',
  rose: 'from-rose-500 to-pink-500',
};

export default function ProgressBar({ value = 0, tone = 'blue', className }) {
  const safeValue = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className={cn('h-2 overflow-hidden rounded-full bg-slate-100', className)}>
      <div className={cn('h-full rounded-full bg-gradient-to-r transition-all duration-700', tones[tone])} style={{ width: `${safeValue}%` }} />
    </div>
  );
}
