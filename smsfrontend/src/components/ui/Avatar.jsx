import { cn } from '../../utils/cn.js';
import { getInitials } from '../../utils/formatters.js';

const tones = {
  violet: 'from-violet-500 to-fuchsia-500',
  cyan: 'from-cyan-400 to-oryx-600',
  blue: 'from-oryx-500 to-indigo-700',
  emerald: 'from-emerald-400 to-teal-700',
  amber: 'from-amber-400 to-orange-600',
};

export default function Avatar({ name, tone = 'blue', size = 'md', className }) {
  const sizes = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base',
  };

  return (
    <div className={cn('grid shrink-0 place-items-center rounded-2xl bg-gradient-to-br font-black text-white shadow-lg', tones[tone] || tones.blue, sizes[size], className)}>
      {getInitials(name)}
    </div>
  );
}
