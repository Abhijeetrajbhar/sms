import { Link, NavLink } from 'react-router-dom';
import { ChevronRight, X } from 'lucide-react';
import { navigationByRole } from '../constants/navigation.js';
import { useApp } from '../context/AppContext.jsx';
import { cn } from '../utils/cn.js';
import Avatar from '../components/ui/Avatar.jsx';
import Badge from '../components/ui/Badge.jsx';
import BrandLogo from '../components/common/BrandLogo.jsx';
import { hasPermission, isSuperAdmin } from '../utils/permissions.js';

export default function Sidebar({ open, onClose }) {
  const { currentRole, currentUser } = useApp();
  const nav = (navigationByRole[currentRole] || []).filter((item) => hasPermission(currentUser, item.permission));

  return (
    <>
      <button aria-label="Close navigation" className={cn('fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-sm transition lg:hidden', open ? 'opacity-100' : 'pointer-events-none opacity-0')} onClick={onClose} />
      <aside
        aria-label="Primary navigation"
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[min(17rem,calc(100vw-2rem))] flex-col overflow-hidden border-r border-outline-variant/40 bg-surface/95 text-on-surface shadow-lg shadow-primary/5 backdrop-blur-lg transition-transform duration-300 lg:w-64 lg:translate-x-0 lg:bg-surface/80',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="relative flex items-center justify-between gap-3 p-4 sm:p-5">
          <Link to="/app/dashboard" className="flex items-center gap-3" onClick={onClose}>
            <BrandLogo className="h-10 w-10 rounded-xl bg-primary/10 ring-primary/10" imageClassName="h-8 w-8" />
            <div>
              <p className="text-xl font-extrabold tracking-tight text-primary">CampusOryx</p>
              <p className="text-[11px] font-semibold text-on-surface-variant">School OS</p>
            </div>
          </Link>
          <button className="grid min-h-11 min-w-11 place-items-center rounded-full p-2 text-on-surface-variant hover:bg-surface-container lg:hidden" onClick={onClose} aria-label="Close navigation">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative px-4 pb-4 sm:px-5 sm:pb-5">
          <div className="glass-card rounded-[24px] p-4">
            <div className="flex items-center gap-3">
              <Avatar name={currentUser?.name} tone={currentUser?.avatarTone} />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-on-surface dark:text-white">{currentUser?.name}</p>
                <p className="truncate text-xs text-on-surface-variant dark:text-slate-400">{currentUser?.email}</p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <Badge tone="dark">{isSuperAdmin(currentUser) ? 'SUPER ADMIN' : currentRole}</Badge>
              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-300">
                <span className="h-2 w-2 rounded-full bg-tertiary" /> Active
              </span>
            </div>
          </div>
        </div>

        <nav className="relative flex-1 overscroll-contain overflow-y-auto px-3 pb-4 sm:px-4 sm:pb-5">
          {nav.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={({ isActive }) => cn(
                'group flex min-h-11 items-center gap-3 rounded-full px-4 py-2.5 text-sm font-semibold transition duration-200',
                isActive ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-md' : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
              )}
            >
              {({ isActive }) => (
                <>
                  <item.icon className={cn('h-5 w-5', isActive ? 'text-white' : 'text-on-surface-variant group-hover:text-primary')} />
                  <span className="flex-1">{item.label}</span>
                  {isActive ? <ChevronRight className="h-4 w-4 text-white" /> : null}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}
