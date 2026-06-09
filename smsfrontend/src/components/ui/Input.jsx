import { cn } from '../../utils/cn.js';

export default function Input({ icon: Icon, className, label, error, id, ...props }) {
  const inputId = id || props.name;

  return (
    <label className="block" htmlFor={inputId}>
      {label ? <span className="mb-1.5 block text-xs font-bold text-on-surface-variant">{label}</span> : null}
      <span className="relative block">
        {Icon ? <Icon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /> : null}
        <input
          id={inputId}
          aria-invalid={Boolean(error)}
          aria-label={!label ? props.placeholder : undefined}
          className={cn(
            'focus-ring min-h-11 w-full min-w-0 rounded-lg border border-outline-variant/70 bg-surface-container-lowest px-4 text-base font-semibold text-on-surface placeholder:text-outline sm:text-sm',
            Icon && 'pl-11',
            error && 'border-error',
            className
          )}
          {...props}
        />
      </span>
      {error ? <span className="mt-1.5 block text-xs font-semibold text-error">{error}</span> : null}
    </label>
  );
}
