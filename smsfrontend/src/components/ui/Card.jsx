import { cn } from '../../utils/cn.js';

export default function Card({ children, className, hover = false }) {
  return (
    <section
      className={cn(
        'glass-card min-w-0 break-words rounded-[20px] p-4 sm:rounded-[24px] sm:p-5',
        hover && 'transition duration-300 hover:-translate-y-0.5 hover:shadow-glow',
        className
      )}
    >
      {children}
    </section>
  );
}
