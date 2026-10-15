import { cn } from '../../utils/cn.js';

export default function Card({ children, className, hover = false }) {
  return (
    <section
      className={cn(
        'linear-card min-w-0 break-words rounded-2xl p-4 sm:rounded-2xl sm:p-5',
        hover && 'linear-card-interactive',
        className
      )}
    >
      {children}
    </section>
  );
}
