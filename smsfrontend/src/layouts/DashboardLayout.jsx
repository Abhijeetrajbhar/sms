import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';
import { useApp } from '../context/AppContext.jsx';

export default function DashboardLayout() {
  const { sidebarOpen, setSidebarOpen, dataError, isDataLoading, retryData } = useApp();

  return (
    <div className="min-h-screen min-w-0 overflow-x-hidden bg-background text-on-surface">
      <div className="fixed inset-0 noise-overlay pointer-events-none opacity-60" />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="relative min-w-0 lg:pl-64">
        <Topbar />
        <main className="mx-auto w-full min-w-0 max-w-[1500px] px-3 py-4 min-[375px]:px-4 sm:px-5 sm:py-6 xl:px-8">
          {dataError ? (
            <div role="alert" className="mb-4 flex flex-col gap-3 rounded-xl border border-amber-300/50 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between dark:bg-amber-400/10 dark:text-amber-100">
              <span className="font-semibold">{dataError}</span>
              <button className="min-h-10 rounded-lg px-3 font-bold hover:bg-amber-100 disabled:opacity-60 dark:hover:bg-white/10" onClick={retryData} disabled={isDataLoading}>
                {isDataLoading ? 'Retrying...' : 'Retry'}
              </button>
            </div>
          ) : null}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
