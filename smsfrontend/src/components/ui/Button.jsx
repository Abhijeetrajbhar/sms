import { cn } from '../../utils/cn.js';

const variants = {
  primary: 'bg-primary text-white hover:bg-primary-container shadow-md shadow-primary/15',
  aurora: 'bg-gradient-to-r from-primary to-secondary text-white hover:opacity-95 shadow-md shadow-primary/15',
  secondary: 'border border-outline-variant/60 bg-surface-container-high text-primary hover:bg-primary/5',
  ghost: 'text-on-surface-variant hover:bg-primary-container/10',
  danger: 'bg-error text-white hover:bg-red-700 shadow-md shadow-error/15',
};

const sizes = {
  sm: 'min-h-10 px-3 text-xs sm:min-h-9',
  md: 'min-h-11 px-4 text-sm',
  lg: 'min-h-12 px-5 py-2.5 text-sm',
};

export default function Button({ children, className, variant = 'primary', size = 'md', icon: Icon, ...props }) {
  return (
    <button
      className={cn(
        'focus-ring max-w-full items-center justify-center gap-2 rounded-lg text-center font-bold leading-5 transition duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 inline-flex',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {Icon ? <Icon className="h-4 w-4" /> : null}
      {children}
    </button>
  );
}
