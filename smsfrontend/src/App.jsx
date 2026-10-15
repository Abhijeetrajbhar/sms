import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { navigationByRole, routeAccess } from './constants/navigation.js';
import { useApp } from './context/AppContext.jsx';
import { hasPermission } from './utils/permissions.js';

import LandingPage from './pages/LandingPage.jsx';

const DashboardLayout = lazy(() => import('./layouts/DashboardLayout.jsx'));
const DashboardPage = lazy(() => import('./pages/DashboardPage.jsx'));
const StudentsPage = lazy(() => import('./pages/StudentsPage.jsx'));
const TeachersPage = lazy(() => import('./pages/TeachersPage.jsx'));
const ClassesPage = lazy(() => import('./pages/ClassesPage.jsx'));
const AttendancePage = lazy(() => import('./pages/AttendancePage.jsx'));
const AssignmentsPage = lazy(() => import('./pages/AssignmentsPage.jsx'));
const ResultsPage = lazy(() => import('./pages/ResultsPage.jsx'));
const FeesPage = lazy(() => import('./pages/FeesPage.jsx'));
const TimetablePage = lazy(() => import('./pages/TimetablePage.jsx'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage.jsx'));
const AIInsightsPage = lazy(() => import('./pages/AIInsightsPage.jsx'));
const AnnouncementsPage = lazy(() => import('./pages/AnnouncementsPage.jsx'));
const AuditLogsPage = lazy(() => import('./pages/AuditLogsPage.jsx'));
const UsersPage = lazy(() => import('./pages/UsersPage.jsx'));
const ParentsPage = lazy(() => import('./pages/ParentsPage.jsx'));
const AcademicSetupPage = lazy(() => import('./pages/AcademicSetupPage.jsx'));
const AdmissionsPage = lazy(() => import('./pages/AdmissionsPage.jsx'));
const AcademicCalendarPage = lazy(() => import('./pages/AcademicCalendarPage.jsx'));
const DocumentsPage = lazy(() => import('./pages/DocumentsPage.jsx'));
const LeaveRequestsPage = lazy(() => import('./pages/LeaveRequestsPage.jsx'));
const ActivateAccountPage = lazy(() => import('./pages/ActivateAccountPage.jsx'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage.jsx'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage.jsx'));

function AppLoader({ compact = false }) {
  return (
    <div className={`${compact ? 'min-h-[50vh]' : 'min-h-screen'} grid place-items-center bg-background px-4 text-on-surface`}>
      <div className="rounded-2xl border border-outline-variant/50 bg-surface-container-lowest px-5 py-4 text-sm font-bold shadow-sm">
        Loading workspace...
      </div>
    </div>
  );
}

function LazyRoute({ children, compact = false }) {
  return <Suspense fallback={<AppLoader compact={compact} />}>{children}</Suspense>;
}

function ProtectedRoute({ children }) {
  const { currentUser, isAuthLoading } = useApp();

  if (isAuthLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-on-surface">
        <div className="rounded-2xl border border-outline-variant/50 bg-surface-container-lowest px-5 py-4 text-sm font-bold shadow-sm">
          Restoring secure session...
        </div>
      </div>
    );
  }

  return currentUser ? children : <Navigate to="/" replace />;
}

function PublicRoute({ children }) {
  const { currentUser, isAuthLoading } = useApp();

  if (currentUser && !isAuthLoading) {
    return <Navigate to="/app/dashboard" replace />;
  }

  return children;
}

function RoleRoute({ path, children }) {
  const { currentRole, currentUser } = useApp();
  const allowedRoles = routeAccess[`/app/${path}`] || [];
  const permission = (currentRole === 'ADMIN' ? (routeAccess[`/app/${path}:permission`] || [])[0] : null);

  if ((allowedRoles.length > 0 && !allowedRoles.includes(currentRole)) || !hasPermission(currentUser, permission)) {
    const fallback = (navigationByRole[currentRole] || []).find((item) => hasPermission(currentUser, item.permission))?.path;
    if (fallback && fallback !== `/app/${path}`) return <Navigate to={fallback} replace />;
    return (
      <div className="grid min-h-[60vh] place-items-center px-4 text-center">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Portal access is not configured</h1>
          <p className="mt-2 max-w-lg text-sm text-on-surface-variant">This account is authenticated but has no permission for this workspace. Ask a super administrator to assign portal permissions.</p>
        </div>
      </div>
    );
  }

  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<PublicRoute><LandingPage /></PublicRoute>} />
      <Route path="/activate-account" element={<PublicRoute><LazyRoute><ActivateAccountPage /></LazyRoute></PublicRoute>} />
      <Route path="/forgot-password" element={<PublicRoute><LazyRoute><ForgotPasswordPage /></LazyRoute></PublicRoute>} />
      <Route path="/reset-password" element={<PublicRoute><LazyRoute><ResetPasswordPage /></LazyRoute></PublicRoute>} />
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <LazyRoute>
              <DashboardLayout />
            </LazyRoute>
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<RoleRoute path="dashboard"><LazyRoute compact><DashboardPage /></LazyRoute></RoleRoute>} />
        <Route path="students" element={<RoleRoute path="students"><LazyRoute compact><StudentsPage /></LazyRoute></RoleRoute>} />
        <Route path="users" element={<RoleRoute path="users"><LazyRoute compact><UsersPage /></LazyRoute></RoleRoute>} />
        <Route path="parents" element={<RoleRoute path="parents"><LazyRoute compact><ParentsPage /></LazyRoute></RoleRoute>} />
        <Route path="academic-setup" element={<RoleRoute path="academic-setup"><LazyRoute compact><AcademicSetupPage /></LazyRoute></RoleRoute>} />
        <Route path="admissions" element={<RoleRoute path="admissions"><LazyRoute compact><AdmissionsPage /></LazyRoute></RoleRoute>} />
        <Route path="calendar" element={<RoleRoute path="calendar"><LazyRoute compact><AcademicCalendarPage /></LazyRoute></RoleRoute>} />
        <Route path="documents" element={<RoleRoute path="documents"><LazyRoute compact><DocumentsPage /></LazyRoute></RoleRoute>} />
        <Route path="leaves" element={<RoleRoute path="leaves"><LazyRoute compact><LeaveRequestsPage /></LazyRoute></RoleRoute>} />
        <Route path="teachers" element={<RoleRoute path="teachers"><LazyRoute compact><TeachersPage /></LazyRoute></RoleRoute>} />
        <Route path="classes" element={<RoleRoute path="classes"><LazyRoute compact><ClassesPage /></LazyRoute></RoleRoute>} />
        <Route path="attendance" element={<RoleRoute path="attendance"><LazyRoute compact><AttendancePage /></LazyRoute></RoleRoute>} />
        <Route path="assignments" element={<RoleRoute path="assignments"><LazyRoute compact><AssignmentsPage /></LazyRoute></RoleRoute>} />
        <Route path="results" element={<RoleRoute path="results"><LazyRoute compact><ResultsPage /></LazyRoute></RoleRoute>} />
        <Route path="fees" element={<RoleRoute path="fees"><LazyRoute compact><FeesPage /></LazyRoute></RoleRoute>} />
        <Route path="timetable" element={<RoleRoute path="timetable"><LazyRoute compact><TimetablePage /></LazyRoute></RoleRoute>} />
        <Route path="analytics" element={<RoleRoute path="analytics"><LazyRoute compact><AnalyticsPage /></LazyRoute></RoleRoute>} />
        <Route path="ai-insights" element={<RoleRoute path="ai-insights"><LazyRoute compact><AIInsightsPage /></LazyRoute></RoleRoute>} />
        <Route path="announcements" element={<RoleRoute path="announcements"><LazyRoute compact><AnnouncementsPage /></LazyRoute></RoleRoute>} />
        <Route path="audit-logs" element={<RoleRoute path="audit-logs"><LazyRoute compact><AuditLogsPage /></LazyRoute></RoleRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
