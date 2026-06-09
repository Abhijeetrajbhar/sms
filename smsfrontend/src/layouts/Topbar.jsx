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
    <header className="sticky top-0 z-30 min-h-16 border-b border-outline-variant/40 bg-surface/90 px-2.5 py-2.5 shadow-sm shadow-primary/5 backdrop-blur-xl min-[375px]:px-3 sm:px-5 sm:py-3 xl:px-8">
      <div className="mx-auto flex min-w-0 max-w-[1500px] items-center gap-1.5 min-[375px]:gap-2 sm:gap-3 lg:gap-4">
        <button className="grid min-h-11 min-w-11 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white p-2 text-slate-700 shadow-sm lg:hidden" onClick={() => setSidebarOpen(true)} aria-label="Open navigation">
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="hidden text-xs font-bold uppercase text-on-surface-variant min-[425px]:block">{currentRole === 'TEACHER' ? 'Teacher Workspace' : currentRole === 'PARENT' ? 'Parent Workspace' : currentRole === 'STUDENT' ? 'Student Workspace' : 'Campus Control Panel'}</p>
          <h2 className="truncate text-base font-bold text-primary min-[375px]:text-lg sm:text-xl">{currentRole === 'PARENT' ? parentTitles[pathname] || pageTitles[pathname] || 'Dashboard' : currentRole === 'STUDENT' ? studentTitles[pathname] || pageTitles[pathname] || 'Dashboard' : pageTitles[pathname] || 'Dashboard'}</h2>
        </div>
        <div className="relative hidden w-48 shrink-0 md:block xl:w-80">
          <Input icon={Search} placeholder={currentRole === 'TEACHER' ? 'Search my students, classes, assignments...' : currentRole === 'PARENT' ? 'Search my children, assignments, fees...' : currentRole === 'STUDENT' ? 'Search my assignments, results, fees...' : 'Search students, teachers, fees...'} value={query} onChange={(event) => setQuery(event.target.value)} />
          {query ? (
            <div className="absolute right-0 top-12 z-50 w-full rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-2 shadow-soft">
              {results.length ? results.map((item) => (
                <button
                  key={`${item.type}-${item.title}`}
                  className="min-h-11 w-full rounded-xl px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-white/10"
                  onClick={() => {
                    navigate(item.path);
                    setQuery('');
                  }}
                >
                  <p className="text-xs font-bold uppercase tracking-normal text-primary">{item.type}</p>
                  <p className="font-semibold text-on-surface">{item.title}</p>
                  <p className="truncate text-xs font-semibold text-slate-500">{item.subtitle}</p>
                </button>
              )) : <p className="px-3 py-4 text-sm font-bold text-slate-500">No matching records found.</p>}
            </div>
          ) : null}
        </div>
        <button
          onClick={toggleTheme}
          className="grid min-h-11 min-w-11 shrink-0 place-items-center rounded-full p-2 text-on-surface-variant transition hover:bg-primary-container/10 hover:text-primary"
          aria-label="Toggle light and dark mode"
        >
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
        <div className="relative">
        <button
          onClick={() => setNotificationsOpen((value) => !value)}
          className="relative grid min-h-11 min-w-11 shrink-0 place-items-center rounded-full p-2 text-on-surface-variant transition hover:bg-primary-container/10 hover:text-primary"
          aria-label="Open notifications"
        >
          <Bell className="h-5 w-5" />
          {unread ? <span className="absolute right-2 top-2 grid h-5 min-w-[1.25rem] place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">{unread}</span> : null}
        </button>
          {notificationsOpen ? (
            <div className="fixed inset-x-2 top-[4.25rem] z-50 max-h-[calc(100dvh-5rem)] overflow-hidden rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-3 shadow-soft min-[375px]:inset-x-3 sm:absolute sm:inset-x-auto sm:right-0 sm:top-14 sm:w-80">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-on-surface">Notifications</p>
                <button className="min-h-10 rounded-lg px-2 text-xs font-bold text-primary hover:bg-primary/5" onClick={markAllNotificationsRead}>Mark all read</button>
              </div>
              <div className="max-h-80 space-y-2 overflow-y-auto">
                {notifications.map((item) => (
                  <button
                    key={item.id}
                    className="min-h-11 w-full rounded-xl border border-slate-100 p-3 text-left hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/10"
                    onClick={() => markNotificationRead(item.id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-semibold text-on-surface">{item.title}</p>
                      {!item.read ? <span className="mt-1 h-2 w-2 rounded-full bg-oryx-500" /> : null}
                    </div>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{item.message}</p>
                    <p className="mt-2 text-[11px] font-bold text-slate-400">{item.time}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
        <div className="hidden items-center gap-3 border-l border-outline-variant/40 pl-3 md:flex lg:hidden xl:flex xl:pl-4">
          <Avatar name={currentUser?.name} tone={currentUser?.avatarTone} size="sm" />
          <div className="hidden xl:block">
            <p className="text-sm font-semibold text-on-surface">{currentUser?.name}</p>
            <p className="text-xs font-semibold text-slate-400">{currentUser?.role}</p>
          </div>
        </div>
        <Button variant="ghost" icon={LogOut} onClick={handleLogout} className="hidden sm:inline-flex">Logout</Button>
      </div>
    </header>
  );
}
