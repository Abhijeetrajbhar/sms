import { Bell, LogOut, Menu, Moon, Search, Sun } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { pageTitles } from '../constants/navigation.js';
import { useApp } from '../context/AppContext.jsx';
import Avatar from '../components/ui/Avatar.jsx';
import Button from '../components/ui/Button.jsx';
import Input from '../components/ui/Input.jsx';

export default function Topbar() {
  const {
    currentUser,
    currentRole,
    notifications,
    setSidebarOpen,
    logout,
    markAllNotificationsRead,
    markNotificationRead,
    searchRecords,
    theme,
    toggleTheme,
  } = useApp();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const unread = notifications.filter((item) => !item.read).length;
  const results = useMemo(() => searchRecords(query), [query, searchRecords]);
  const parentTitles = {
    '/app/students': 'My Children',
    '/app/attendance': 'Child Attendance',
    '/app/assignments': 'Child Assignments',
    '/app/results': 'Child Results',
    '/app/fees': 'Fees & Payments',
    '/app/timetable': 'Child Timetable',
    '/app/announcements': 'Parent & Class Notices',
  };
  const studentTitles = {
    '/app/students': 'My Profile',
    '/app/attendance': 'My Attendance',
    '/app/assignments': 'My Assignments',
    '/app/results': 'My Results',
    '/app/fees': 'My Fees & Receipts',
    '/app/timetable': 'My Class Timetable',
    '/app/announcements': 'Student & Class Notices',
  };

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  return (
    <header className="sticky top-0 z-30 min-h-16 border-b border-slate-200/80 bg-white/95 px-3 py-2.5 shadow-sm backdrop-blur-xl transition-colors duration-200 dark:border-white/[0.08] dark:bg-[#0c0f17]/90 dark:shadow-[0_4px_24px_rgba(0,0,0,0.4)] sm:px-5 sm:py-3 xl:px-8">
      <div className="mx-auto flex min-w-0 max-w-[1500px] items-center gap-2 sm:gap-3 lg:gap-4">
        <button
          className="grid min-h-10 min-w-10 shrink-0 place-items-center rounded-xl border border-slate-200 bg-slate-100 p-2 text-slate-700 shadow-sm transition hover:bg-slate-200 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300 dark:hover:bg-white/[0.08] lg:hidden"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="min-w-0 flex-1">
          <p className="hidden font-mono text-[10px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 min-[425px]:block">
            {currentRole === 'TEACHER' ? 'Faculty Command' : currentRole === 'PARENT' ? 'Guardian Portal' : currentRole === 'STUDENT' ? 'Learner Cockpit' : 'Campus Operations Node'}
          </p>
          <h2 className="truncate font-display text-base font-extrabold tracking-tight text-slate-900 dark:text-white min-[375px]:text-lg sm:text-xl">
            {currentRole === 'PARENT' ? parentTitles[pathname] || pageTitles[pathname] || 'Dashboard' : currentRole === 'STUDENT' ? studentTitles[pathname] || pageTitles[pathname] || 'Dashboard' : pageTitles[pathname] || 'Dashboard'}
          </h2>
        </div>

        <div className="relative hidden w-48 shrink-0 md:block xl:w-80">
          <Input
            icon={Search}
            placeholder={currentRole === 'TEACHER' ? 'Search students, classes...' : currentRole === 'PARENT' ? 'Search children, assignments...' : currentRole === 'STUDENT' ? 'Search coursework, results...' : 'Search campus directory...'}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {query ? (
            <div className="absolute right-0 top-12 z-50 w-full rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-white/[0.12] dark:bg-[#0d1018]">
              {results.length ? (
                results.map((item) => (
                  <button
                    key={`${item.type}-${item.title}`}
                    className="min-h-11 w-full rounded-xl px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-white/[0.06]"
                    onClick={() => {
                      navigate(item.path);
                      setQuery('');
                    }}
                  >
                    <p className="font-mono text-[10px] font-bold uppercase tracking-normal text-indigo-600 dark:text-indigo-400">{item.type}</p>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">{item.title}</p>
                    <p className="truncate font-mono text-[11px] text-slate-500 dark:text-slate-400">{item.subtitle}</p>
                  </button>
                ))
              ) : (
                <p className="px-3 py-4 font-mono text-xs text-slate-500 text-center">No matching records found.</p>
              )}
            </div>
          ) : null}
        </div>

        <button
          onClick={toggleTheme}
          className="grid min-h-10 min-w-10 shrink-0 place-items-center rounded-xl border border-slate-200 bg-slate-100 p-2 text-slate-700 transition hover:bg-slate-200 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300 dark:hover:bg-white/[0.08]"
          aria-label="Toggle light and dark mode"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        <div className="relative">
          <button
            onClick={() => setNotificationsOpen((value) => !value)}
            className="relative grid min-h-10 min-w-10 shrink-0 place-items-center rounded-xl border border-slate-200 bg-slate-100 p-2 text-slate-700 transition hover:bg-slate-200 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300 dark:hover:bg-white/[0.08]"
            aria-label="Open notifications"
          >
            <Bell className="h-4 w-4" />
            {unread ? (
              <span className="absolute -right-1 -top-1 grid h-4 min-w-[1rem] place-items-center rounded-full bg-rose-500 px-1 font-mono text-[9px] font-bold text-white">
                {unread}
              </span>
            ) : null}
          </button>

          {notificationsOpen ? (
            <div className="fixed inset-x-2 top-[4.25rem] z-50 max-h-[calc(100dvh-5rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl dark:border-white/[0.12] dark:bg-[#0d1018] min-[375px]:inset-x-3 sm:absolute sm:inset-x-auto sm:right-0 sm:top-14 sm:w-80">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-white/[0.06] pb-2">
                <p className="font-mono text-xs font-bold uppercase text-slate-900 dark:text-white">Notifications</p>
                <button className="rounded-lg px-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline" onClick={markAllNotificationsRead}>
                  Mark all read
                </button>
              </div>
              <div className="max-h-80 space-y-2 overflow-y-auto">
                {notifications.length ? (
                  notifications.map((item) => (
                    <button
                      key={item.id}
                      className="min-h-11 w-full rounded-xl border border-slate-100 p-3 text-left transition hover:bg-slate-50 dark:border-white/[0.06] dark:hover:bg-white/[0.06]"
                      onClick={() => markNotificationRead(item.id)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-xs font-bold text-slate-900 dark:text-white">{item.title}</p>
                        {!item.read ? <span className="mt-1 h-1.5 w-1.5 rounded-full bg-indigo-500 shrink-0" /> : null}
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">{item.message}</p>
                      <p className="mt-2 font-mono text-[10px] text-slate-400">{item.time}</p>
                    </button>
                  ))
                ) : (
                  <p className="py-6 text-center font-mono text-xs text-slate-400">No notifications.</p>
                )}
              </div>
            </div>
          ) : null}
        </div>

        <div className="hidden items-center gap-3 border-l border-slate-200 pl-3 dark:border-white/10 md:flex lg:hidden xl:flex xl:pl-4">
          <Avatar name={currentUser?.name} tone={currentUser?.avatarTone} size="sm" />
          <div className="hidden xl:block">
            <p className="text-xs font-bold text-slate-900 dark:text-white">{currentUser?.name}</p>
            <p className="font-mono text-[10px] text-slate-500 dark:text-slate-400">{currentUser?.role}</p>
          </div>
        </div>

        <Button
          variant="ghost"
          icon={LogOut}
          onClick={handleLogout}
          className="hidden sm:inline-flex text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/10"
        >
          Logout
        </Button>
      </div>
    </header>
  );
}
