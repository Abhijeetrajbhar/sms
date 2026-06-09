import { cn } from '../../utils/cn.js';

const tones = {
  slate: 'bg-surface-container text-on-surface-variant ring-outline-variant/50',
  blue: 'bg-primary-fixed/40 text-primary ring-primary/15',
  violet: 'bg-primary-fixed/50 text-primary ring-primary/15',
  cyan: 'bg-secondary-fixed/70 text-secondary ring-secondary/15',
  emerald: 'bg-emerald-50 text-tertiary ring-emerald-200',
  amber: 'bg-amber-50 text-amber-700 ring-amber-200',
  rose: 'bg-rose-50 text-rose-700 ring-rose-200',
  dark: 'bg-white/10 text-white ring-white/15',
};

export default function Badge({ children, tone = 'slate', className }) {
  const shouldUseTone = !className || !/\bbg-/.test(className);
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ring-1', shouldUseTone && tones[tone], className)}>
      {children}
    </span>
  );
}
