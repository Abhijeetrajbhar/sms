import { Navigate, Route, Routes } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout.jsx';
import LandingPage from './pages/LandingPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import StudentsPage from './pages/StudentsPage.jsx';
import TeachersPage from './pages/TeachersPage.jsx';
import ClassesPage from './pages/ClassesPage.jsx';
import AttendancePage from './pages/AttendancePage.jsx';
import AssignmentsPage from './pages/AssignmentsPage.jsx';
import ResultsPage from './pages/ResultsPage.jsx';
import FeesPage from './pages/FeesPage.jsx';
import TimetablePage from './pages/TimetablePage.jsx';
import AnalyticsPage from './pages/AnalyticsPage.jsx';
import AIInsightsPage from './pages/AIInsightsPage.jsx';
import AnnouncementsPage from './pages/AnnouncementsPage.jsx';
import AuditLogsPage from './pages/AuditLogsPage.jsx';
import UsersPage from './pages/UsersPage.jsx';
import ParentsPage from './pages/ParentsPage.jsx';
import AcademicSetupPage from './pages/AcademicSetupPage.jsx';
import { navigationByRole, routeAccess } from './constants/navigation.js';
import { useApp } from './context/AppContext.jsx';
import { hasPermission } from './utils/permissions.js';

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

function RoleRoute({ path, children }) {
  const { currentRole, currentUser } = useApp();
  const allowedRoles = routeAccess[`/app/${path}`] || [];
  const permission = (currentRole === 'ADMIN' ? (routeAccess[`/app/${path}:permission`] || [])[0] : null);

  if ((allowedRoles.length > 0 && !allowedRoles.includes(currentRole)) || !hasPermission(currentUser, permission)) {
    const fallback = (navigationByRole[currentRole] || []).find((item) => hasPermission(currentUser, item.permission))?.path || '/';
    return <Navigate to={fallback} replace />;
  }

  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<RoleRoute path="dashboard"><DashboardPage /></RoleRoute>} />
        <Route path="students" element={<RoleRoute path="students"><StudentsPage /></RoleRoute>} />
        <Route path="users" element={<RoleRoute path="users"><UsersPage /></RoleRoute>} />
        <Route path="parents" element={<RoleRoute path="parents"><ParentsPage /></RoleRoute>} />
        <Route path="academic-setup" element={<RoleRoute path="academic-setup"><AcademicSetupPage /></RoleRoute>} />
        <Route path="teachers" element={<RoleRoute path="teachers"><TeachersPage /></RoleRoute>} />
        <Route path="classes" element={<RoleRoute path="classes"><ClassesPage /></RoleRoute>} />
        <Route path="attendance" element={<RoleRoute path="attendance"><AttendancePage /></RoleRoute>} />
        <Route path="assignments" element={<RoleRoute path="assignments"><AssignmentsPage /></RoleRoute>} />
        <Route path="results" element={<RoleRoute path="results"><ResultsPage /></RoleRoute>} />
        <Route path="fees" element={<RoleRoute path="fees"><FeesPage /></RoleRoute>} />
        <Route path="timetable" element={<RoleRoute path="timetable"><TimetablePage /></RoleRoute>} />
        <Route path="analytics" element={<RoleRoute path="analytics"><AnalyticsPage /></RoleRoute>} />
        <Route path="ai-insights" element={<RoleRoute path="ai-insights"><AIInsightsPage /></RoleRoute>} />
        <Route path="announcements" element={<RoleRoute path="announcements"><AnnouncementsPage /></RoleRoute>} />
        <Route path="audit-logs" element={<RoleRoute path="audit-logs"><AuditLogsPage /></RoleRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
