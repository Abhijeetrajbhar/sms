import { Link, NavLink } from 'react-router-dom';
import { ChevronRight, X } from 'lucide-react';
import { navigationByRole } from '../constants/navigation.js';
import { useApp } from '../context/AppContext.jsx';
import { cn } from '../utils/cn.js';
import Avatar from '../components/ui/Avatar.jsx';
import BrandLogo from '../components/common/BrandLogo.jsx';
import { hasPermission, isSuperAdmin } from '../utils/permissions.js';

export default function Sidebar({ open, onClose }) {
  const { currentRole, currentUser } = useApp();
  const nav = (navigationByRole[currentRole] || []).filter((item) => hasPermission(currentUser, item.permission));

  return (
    <>
      <button
        aria-label="Close navigation"
        className={cn(
          'fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition lg:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={onClose}
      />
      <aside
        aria-label="Primary navigation"
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[min(17rem,calc(100vw-2rem))] flex-col overflow-hidden border-r border-slate-200/80 bg-white/95 text-slate-800 shadow-lg backdrop-blur-xl transition-all duration-300 dark:border-white/[0.08] dark:bg-[#0c0f17]/95 dark:text-slate-200 dark:shadow-[8px_0_32px_rgba(0,0,0,0.5)] lg:w-64 lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Brand Header */}
        <div className="relative flex items-center justify-between gap-3 border-b border-slate-200/80 p-4 dark:border-white/[0.06] sm:p-5">
          <Link to="/app/dashboard" className="flex items-center gap-3" onClick={onClose}>
            <BrandLogo className="h-9 w-9 rounded-xl border border-indigo-500/20 bg-indigo-500/10 dark:border-white/10 dark:bg-indigo-500/15" imageClassName="h-6 w-6" />
            <div>
              <p className="font-display text-base font-extrabold tracking-tight text-slate-900 dark:text-white">CampusOryx</p>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">School OS</p>
            </div>
          </Link>
          <button
            className="grid min-h-9 min-w-9 place-items-center rounded-lg border border-slate-200 bg-slate-100 text-slate-600 hover:text-slate-900 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-slate-400 dark:hover:text-white lg:hidden"
            onClick={onClose}
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* User Identity Module */}
        <div className="relative p-3 sm:p-4">
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-3 shadow-sm dark:border-white/[0.08] dark:bg-white/[0.02]">
            <div className="flex items-center gap-3">
              <Avatar name={currentUser?.name} tone={currentUser?.avatarTone} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-slate-900 dark:text-white">{currentUser?.name}</p>
                <p className="truncate font-mono text-[10px] text-slate-500 dark:text-slate-400">{currentUser?.email}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-slate-200/80 pt-2 dark:border-white/[0.06]">
              <span className="font-mono text-[10px] font-bold rounded border border-slate-200 bg-white px-2 py-0.5 text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
                {isSuperAdmin(currentUser) ? 'SUPER ADMIN' : currentRole}
              </span>
              <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Stream */}
        <nav className="relative flex-1 overscroll-contain overflow-y-auto px-3 pb-4 sm:px-4 space-y-1">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-3 py-1">
            Workspaces
          </p>
          {nav.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'group flex min-h-10 items-center gap-3 rounded-xl px-3 py-2 text-xs font-semibold transition duration-150',
                  isActive
                    ? 'border border-indigo-200 bg-indigo-50 text-indigo-700 shadow-sm font-bold dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.04] dark:hover:text-slate-200'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    className={cn(
                      'h-4 w-4 shrink-0 transition',
                      isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 group-hover:text-slate-700 dark:text-slate-500 dark:group-hover:text-slate-300'
                    )}
                  />
                  <span className="flex-1 truncate">{item.label}</span>
                  {isActive && <ChevronRight className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}
