import Button from '../ui/Button.jsx';

export default function PageHeader({ eyebrow, title, description, actionLabel, actionIcon, onAction }) {
  return (
    <div className="flex min-w-0 flex-col justify-between gap-4 md:flex-row md:items-end">
      <div className="min-w-0">
        {eyebrow ? <p className="mb-2 text-xs font-bold uppercase tracking-normal text-primary">{eyebrow}</p> : null}
        <h1 className="page-heading">{title}</h1>
        {description ? <p className="page-subtitle">{description}</p> : null}
      </div>
      {actionLabel ? <Button className="w-full md:w-auto" variant="aurora" icon={actionIcon} onClick={onAction}>{actionLabel}</Button> : null}
    </div>
  );
}
