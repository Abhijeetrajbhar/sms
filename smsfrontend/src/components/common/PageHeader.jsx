import Button from '../ui/Button.jsx';

export default function PageHeader({ eyebrow, title, description, actionLabel, actionIcon, onAction }) {
  return (
    <div className="flex min-w-0 flex-col justify-between gap-4 md:flex-row md:items-end">
      <div className="min-w-0">
        {eyebrow ? (
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-indigo-500 dark:text-indigo-400">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
            {eyebrow}
          </div>
        ) : null}
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-on-background dark:text-white sm:text-3xl">{title}</h1>
        {description ? <p className="mt-1 max-w-2xl text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{description}</p> : null}
      </div>
      {actionLabel ? <Button className="w-full md:w-auto" variant="aurora" icon={actionIcon} onClick={onAction}>{actionLabel}</Button> : null}
    </div>
  );
}
