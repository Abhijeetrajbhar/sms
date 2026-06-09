import logoUrl from '../../assets/campusoryx-logo.svg';
import { cn } from '../../utils/cn.js';

export default function BrandLogo({ className, imageClassName }) {
  return (
    <span
      className={cn(
        'grid shrink-0 place-items-center rounded-2xl bg-white/12 ring-1 ring-white/15',
        className
      )}
      aria-hidden="true"
    >
      <img src={logoUrl} alt="" className={cn('h-8 w-8', imageClassName)} />
    </span>
  );
}
