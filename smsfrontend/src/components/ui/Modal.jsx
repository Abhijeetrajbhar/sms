import { X } from 'lucide-react';
import { useEffect, useId } from 'react';
import { cn } from '../../utils/cn.js';

export default function Modal({ open, title, description, children, onClose, size = 'md' }) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] grid place-items-end overflow-hidden bg-slate-950/55 p-0 backdrop-blur-sm sm:place-items-center sm:px-4 sm:py-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          'max-h-[calc(100dvh-1rem)] w-full min-w-0 overscroll-contain overflow-x-hidden overflow-y-auto rounded-t-[24px] border border-outline-variant/60 bg-surface-container-lowest p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-soft [-webkit-overflow-scrolling:touch] sm:max-h-[calc(100dvh-2rem)] sm:rounded-[24px] sm:p-5',
          size === 'lg' ? 'max-w-3xl' : 'max-w-xl'
        )}
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id={titleId} className="text-xl font-bold text-on-surface">{title}</h2>
            {description ? <p className="mt-1 text-sm leading-6 text-on-surface-variant">{description}</p> : null}
          </div>
          <button className="grid min-h-11 min-w-11 shrink-0 place-items-center rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10" onClick={onClose} aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
