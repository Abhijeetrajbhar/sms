import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  BookOpen,
  CalendarCheck,
  Check,
  CheckCircle2,
  Command,
  CreditCard,
  Eye,
  EyeOff,
  GraduationCap,
  Layers,
  Lock,
  Mail,
  Moon,
  Radio,
  Search,
  Shield,
  ShieldCheck,
  Sparkles,
  Sun,
  Terminal,
  UserPlus,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import BrandLogo from '../components/common/BrandLogo.jsx';
import Button from '../components/ui/Button.jsx';
import { cn } from '../utils/cn.js';

const portalRoles = [
  { role: 'ADMIN', label: 'Administrator', badge: 'Super Admin', shortcut: '1' },
  { role: 'TEACHER', label: 'Faculty Lead', badge: 'Instructor', shortcut: '2' },
  { role: 'STUDENT', label: 'Learner', badge: 'Enrolled', shortcut: '3' },
  { role: 'PARENT', label: 'Guardian', badge: 'Family Access', shortcut: '4' },
];

const telemetryLogs = [
  { time: '10:48:12', tag: 'ACADEMIC', action: 'GRADEBOOK_PUBLISHED', detail: 'Term 1 Physics Gradebook published for Class 10-A (42 records)', tone: 'emerald' },
  { time: '10:46:04', tag: 'AUTH', action: 'ADMIN_SIGN_IN', detail: 'Administrator authenticated from secure session', tone: 'indigo' },
  { time: '10:42:55', tag: 'FINANCE', action: 'PAYMENT_SETTLED', detail: 'Razorpay settled tuition fee invoice #INV-2026-884 for ₹12,500', tone: 'sky' },
  { time: '10:39:18', tag: 'ATTENDANCE', action: 'ROLL_CALL_MARKED', detail: 'Grade 10-A attendance submitted (36 Present, 2 Excused)', tone: 'amber' },
  { time: '10:31:02', tag: 'SECURITY', action: 'DOCUMENT_VERIFIED', detail: 'Verified student compliance record for Student Profile #6AC8', tone: 'indigo' },
];

const institutionalEngines = [
  {
    id: 'FEAT-01',
    title: 'Attendance & Roll Call',
    subtitle: 'Fast daily attendance marking with automated guardian alerts',
    icon: CalendarCheck,
    badge: 'Daily Operations',
    stats: 'Instant Sync',
    description: 'Faculty mark attendance in under 15 seconds. Automated notifications dispatch to guardians via email/SMS with absence escalation.',
    metrics: [
      { label: 'Attendance Rate', value: '97.4%' },
      { label: 'Guardian Alerts', value: 'Instant' },
    ],
  },
  {
    id: 'FEAT-02',
    title: 'Fee Billing & Invoicing',
    subtitle: 'Digital invoicing with native Razorpay checkout and receipts',
    icon: CreditCard,
    badge: 'Finance & Billing',
    stats: 'Full Reconciliation',
    description: 'Instant invoices, automated payment reminders, and dual payment options. Online checkouts reconcile automatically with downloadable PDF receipts.',
    metrics: [
      { label: 'Payment Modes', value: 'Online & Cash' },
      { label: 'Receipt Generation', value: 'Automated PDF' },
    ],
  },
  {
    id: 'FEAT-03',
    title: 'Gradebook & Academic Reports',
    subtitle: 'GPA distributions, exam term weighting, and dynamic report cards',
    icon: Activity,
    badge: 'Examinations',
    stats: 'GPA & Percentiles',
    description: 'Configure custom grading bands and exam weighting. Generates official school report cards with automated percentile benchmarks and ranking.',
    metrics: [
      { label: 'Grading Scales', value: 'Custom Bands' },
      { label: 'Export Formats', value: 'PDF / CSV' },
    ],
  },
  {
    id: 'FEAT-04',
    title: 'Role-Based Access & Security',
    subtitle: 'Granular permissions and complete activity audit trail',
    icon: ShieldCheck,
    badge: 'Security & RBAC',
    stats: 'Access Controlled',
    description: 'Every sensitive operation records actor ID, client IP, timestamp, and payload changes for full administrative accountability.',
    metrics: [
      { label: 'User Roles', value: 'Admin, Staff, Family' },
      { label: 'Audit Trail', value: 'Full Session Logs' },
    ],
  },
];

const roleMatrix = [
  {
    role: 'Leadership & Admins',
    desc: 'Total campus visibility, fee cash-flow health, staff allocation, and institutional compliance.',
    capabilities: ['Real-time school KPI dashboard', 'Fee invoicing & refund authorizations', 'Teacher approvals & role delegation', 'Master academic calendar & timetable'],
    color: 'from-indigo-500/20 to-indigo-500/0',
    border: 'hover:border-indigo-500/40',
    icon: Shield,
  },
  {
    role: 'Faculty & Educators',
    desc: 'Streamlined pedagogical tools that eliminate clerical fatigue and empower classroom teaching.',
    capabilities: ['One-tap attendance register', 'Assignment creation & submission grading', 'Weighted gradebook calculations', 'Instant student profile insights'],
    color: 'from-sky-500/20 to-sky-500/0',
    border: 'hover:border-sky-500/40',
    icon: BookOpen,
  },
  {
    role: 'Learners & Students',
    desc: 'A focused, distraction-free cockpit for coursework, schedules, exam marks, and school updates.',
    capabilities: ['Personal daily timetable & room locator', 'Assignment deadlines & upload portal', 'Verified exam report cards & rankings', 'Campus broadcast notices'],
    color: 'from-emerald-500/20 to-emerald-500/0',
    border: 'hover:border-emerald-500/40',
    icon: GraduationCap,
  },
  {
    role: 'Guardians & Parents',
    desc: 'Unprecedented peace of mind with transparent visibility into academic and fee records.',
    capabilities: ['Real-time attendance & absence alerts', 'Secure fee checkout via Razorpay', 'Downloadable receipts & invoice records', 'Direct educator remark review'],
    color: 'from-amber-500/20 to-amber-500/0',
    border: 'hover:border-amber-500/40',
    icon: Users,
  },
];

export default function LandingPage() {
  const { login, register, authError, isAuthLoading, isAuthenticated, theme, toggleTheme } = useApp();
  const [mode, setMode] = useState('login');
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState(portalRoles[0].role);
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState('telemetry');
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'PARENT',
  });
  const [requestMessage, setRequestMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) navigate('/app/dashboard', { replace: true });
  }, [isAuthenticated, navigate]);

  // Keyboard shortcut listener: Cmd/Ctrl + K to open auth modal, ESC to close
  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setIsAuthOpen((prev) => !prev);
      } else if (event.key === 'Escape' && isAuthOpen) {
        setIsAuthOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAuthOpen]);

  const selectRole = (role) => {
    setMode('login');
    setSelectedRole(role);
  };

  const openAuth = (nextMode, rolePreset = null) => {
    setMode(nextMode);
    setRequestMessage('');
    if (rolePreset) {
      setSelectedRole(rolePreset);
    }
    setIsAuthOpen(true);
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    await login(loginForm);
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    const result = await register(registerForm);
    setRequestMessage(result?.message || 'Access request submitted for administrator review.');
    setRegisterForm({ firstName: '', lastName: '', email: '', phone: '', role: 'PARENT' });
  };

  return (
    <div className="relative min-h-screen bg-slate-50 font-sans text-slate-900 transition-colors duration-300 selection:bg-indigo-500/20 selection:text-indigo-900 dark:bg-[#07090e] dark:text-slate-100 dark:selection:bg-indigo-500/30 dark:selection:text-indigo-200">
      {/* Background Ambient Beam & Micro-Grid */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-15%,rgba(99,102,241,0.12),transparent_70%)] dark:bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(99,102,241,0.18),transparent)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(15,23,42,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.035)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:48px_48px]" />
        <div className="absolute -left-48 top-1/4 h-96 w-96 rounded-full bg-indigo-500/10 blur-[128px] dark:bg-indigo-600/10" />
        <div className="absolute -right-48 top-1/2 h-96 w-96 rounded-full bg-cyan-500/10 blur-[128px] dark:bg-cyan-600/10" />
      </div>

      {/* Floating Linear-Grade Header */}
      <header className="fixed inset-x-0 top-0 z-40 px-3 py-3 sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-2.5 shadow-sm backdrop-blur-xl transition-colors duration-200 dark:border-white/[0.08] dark:bg-[#0c0f17]/85 dark:shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.08)]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="flex items-center gap-2.5 text-left transition hover:opacity-90"
            >
              <BrandLogo className="h-9 w-9 rounded-xl border border-indigo-500/20 bg-indigo-500/10 dark:border-white/10 dark:bg-indigo-500/15" imageClassName="h-6 w-6" />
              <div>
                <span className="font-display text-base font-extrabold tracking-tight text-slate-900 dark:text-white">CampusOryx</span>
                <span className="ml-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">School Portal</span>
              </div>
            </button>
            <div className="hidden items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-50 px-2.5 py-0.5 font-mono text-[11px] font-medium text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 lg:flex">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-600 dark:bg-emerald-500" />
              </span>
              All Systems Operational
            </div>
          </div>

          <nav className="hidden items-center gap-7 text-xs font-semibold tracking-wide text-slate-600 dark:text-slate-400 md:flex">
            <a href="#overview" className="transition hover:text-slate-900 dark:hover:text-white">Overview</a>
            <a href="#features" className="transition hover:text-slate-900 dark:hover:text-white">Features</a>
            <a href="#roles" className="transition hover:text-slate-900 dark:hover:text-white">Portals</a>
            <a href="#security" className="transition hover:text-slate-900 dark:hover:text-white">Security</a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Dark / Light Mode Toggle Button */}
            <button
              onClick={toggleTheme}
              className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-slate-100 text-slate-700 shadow-sm transition hover:bg-slate-200 hover:text-slate-900 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-slate-300 dark:hover:bg-white/[0.08] dark:hover:text-white"
              aria-label="Toggle theme mode"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-300" /> : <Moon className="h-4 w-4 text-indigo-600" />}
            </button>

            <button
              onClick={() => openAuth('login')}
              className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-slate-100/80 px-3.5 py-1.5 text-xs font-semibold text-slate-800 transition hover:bg-slate-200 hover:text-slate-900 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-slate-200 dark:hover:border-white/20 dark:hover:bg-white/[0.07] sm:inline-flex"
            >
              Sign In
              <span className="raycast-kbd ml-1">⌘K</span>
            </button>

            <button
              onClick={() => openAuth('login', 'ADMIN')}
              className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-indigo-600 px-4 py-1.5 text-xs font-bold text-white shadow-sm transition-all duration-200 hover:bg-indigo-700 active:scale-95 dark:bg-gradient-to-r dark:from-indigo-500 dark:via-indigo-600 dark:to-indigo-700 dark:shadow-[0_0_20px_rgba(99,102,241,0.35)] dark:hover:shadow-[0_0_28px_rgba(99,102,241,0.55)]"
            >
              <span>Explore Demo</span>
              <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 pt-28 sm:pt-36">
        <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center">
            {/* Version Pill */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3.5 py-1 text-xs font-semibold text-indigo-700 shadow-sm transition dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300">
              <Sparkles className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Integrated School Management</span>
              <span className="h-1 w-1 rounded-full bg-indigo-500 dark:bg-indigo-400" />
              <span className="font-mono text-[11px] text-indigo-600 dark:text-indigo-200">v2.4 Production</span>
            </div>

            {/* Main Headline */}
            <h1 className="max-w-4xl text-4xl font-extrabold tracking-tight text-slate-900 sm:text-6xl sm:leading-[1.1] md:text-7xl dark:text-white">
              Modern management software for{' '}
              <span className="bg-gradient-to-r from-indigo-600 via-sky-600 to-emerald-600 bg-clip-text text-transparent dark:from-indigo-300 dark:via-sky-200 dark:to-emerald-300">
                schools and educators.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg sm:leading-relaxed dark:text-slate-400">
              Streamline student attendance, gradebooks, fee payments, and family communication in one reliable, unified platform.
            </p>

            {/* CTAs & Quick Launch */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
              <button
                onClick={() => openAuth('login')}
                className="group inline-flex items-center gap-2.5 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white shadow-md transition hover:bg-slate-800 active:scale-98 dark:bg-white dark:text-slate-950 dark:shadow-[0_12px_28px_rgba(255,255,255,0.12)] dark:hover:bg-slate-100"
              >
                <span>Sign In to Portal</span>
                <span className="raycast-kbd border-slate-700 bg-slate-800 text-slate-200 dark:border-slate-300 dark:bg-slate-200/60 dark:text-slate-800">↵</span>
              </button>

              <button
                onClick={() => openAuth('register')}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300 dark:hover:border-white/20 dark:hover:bg-white/[0.08] dark:hover:text-white"
              >
                <UserPlus className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                Request Parent Access
              </button>
            </div>
          </div>

          {/* Interactive Hero Command Center / Live Telemetry Preview */}
          <div id="overview" className="relative mx-auto mt-16 max-w-5xl">
            <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xl dark:border-white/[0.12] dark:bg-[#0c0f17]/90 dark:shadow-[0_24px_64px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.1)]">
              {/* Terminal Window Header Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/[0.08] dark:bg-white/[0.02] sm:px-6">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-rose-500" />
                  <div className="h-3 w-3 rounded-full bg-amber-500" />
                  <div className="h-3 w-3 rounded-full bg-emerald-500" />
                  <span className="ml-3 font-mono text-xs text-slate-600 dark:text-slate-400">campusoryx.school/portal • active session</span>
                </div>

                <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white p-1 dark:border-white/[0.08] dark:bg-black/40">
                  {[
                    { id: 'telemetry', label: 'Recent Activity', icon: Terminal },
                    { id: 'finance', label: 'Fee Overview', icon: CreditCard },
                    { id: 'cohort', label: 'Class Summary', icon: Layers },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        'flex items-center gap-1.5 rounded-md px-3 py-1 font-mono text-xs transition',
                        activeTab === tab.id
                          ? 'border border-indigo-200 bg-indigo-50 font-bold text-indigo-800 shadow-sm dark:border-white/10 dark:bg-white/10 dark:text-white'
                          : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                      )}
                    >
                      <tab.icon className="h-3 w-3" />
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Terminal Tab Content Area */}
              <div className="p-4 sm:p-6">
                {activeTab === 'telemetry' && (
                  <div className="space-y-2.5 font-mono text-xs">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2 text-[11px] text-slate-500 dark:border-white/[0.05] dark:text-slate-500">
                      <span>TIMESTAMP</span>
                      <span>MODULE</span>
                      <span>ACTION</span>
                      <span className="hidden sm:inline">STATUS</span>
                    </div>
                    {telemetryLogs.map((log, i) => (
                      <div
                        key={i}
                        className="group flex flex-wrap items-center justify-between gap-2 rounded-lg border border-transparent px-2.5 py-1.5 transition hover:border-slate-200 hover:bg-slate-50 dark:hover:border-white/[0.08] dark:hover:bg-white/[0.03]"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-slate-500">{log.time}</span>
                          <span
                            className={cn(
                              'rounded px-1.5 py-0.5 text-[10px] font-bold',
                              log.tone === 'emerald' && 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20',
                              log.tone === 'indigo' && 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/20',
                              log.tone === 'sky' && 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/20',
                              log.tone === 'amber' && 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20'
                            )}
                          >
                            {log.tag}
                          </span>
                          <span className="font-semibold text-slate-900 dark:text-slate-200">{log.action}</span>
                        </div>
                        <p className="w-full text-slate-600 sm:w-auto dark:text-slate-400">{log.detail}</p>
                        <span className="hidden items-center gap-1 text-[11px] font-bold text-emerald-600 sm:inline-flex dark:text-emerald-400">
                          <CheckCircle2 className="h-3.5 w-3.5" /> OK
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'finance' && (
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-white/[0.08] dark:bg-white/[0.02]">
                      <p className="font-mono text-xs text-slate-500 dark:text-slate-400">Total Billed Invoices</p>
                      <p className="mt-2 font-display text-2xl font-bold text-slate-900 dark:text-white">₹14,80,000</p>
                      <div className="mt-3 flex items-center justify-between text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        <span>100% Reconciled</span>
                        <span>42 Transactions</span>
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-white/[0.08] dark:bg-white/[0.02]">
                      <p className="font-mono text-xs text-slate-500 dark:text-slate-400">Razorpay Realtime Sync</p>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        <span className="font-semibold text-slate-900 dark:text-white">Webhook Active</span>
                      </div>
                      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">Zero latency signature verify</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-white/[0.08] dark:bg-white/[0.02]">
                      <p className="font-mono text-xs text-slate-500 dark:text-slate-400">Offline Receipt Audit</p>
                      <p className="mt-2 font-display text-2xl font-bold text-indigo-600 dark:text-indigo-400">100% Verified</p>
                      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">Anti-fraud counter check</p>
                    </div>
                  </div>
                )}

                {activeTab === 'cohort' && (
                  <div className="grid gap-3 sm:grid-cols-4">
                    {[
                      { grade: 'Grade 10-A', students: '38 Active', att: '97.2%', teacher: 'Sarah Jenkins' },
                      { grade: 'Grade 10-B', students: '35 Active', att: '94.8%', teacher: 'David Vance' },
                      { grade: 'Grade 11-Science', students: '41 Active', att: '98.1%', teacher: 'Elena Rostova' },
                      { grade: 'Grade 12-Prep', students: '32 Active', att: '99.0%', teacher: 'Marcus Chen' },
                    ].map((item, idx) => (
                      <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 dark:border-white/[0.08] dark:bg-white/[0.02]">
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{item.grade}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{item.teacher}</p>
                        <div className="mt-3 flex items-center justify-between text-xs font-mono">
                          <span className="text-slate-500">{item.students}</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">{item.att}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Terminal Footer Bar */}
              <div className="flex flex-wrap items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-2.5 text-[11px] font-mono text-slate-600 sm:px-6 dark:border-white/[0.08] dark:bg-black/40 dark:text-slate-500">
                <div className="flex items-center gap-4">
                  <span>Runtime: Node.js + Prisma</span>
                  <span>Database: MongoDB</span>
                </div>
                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                  <Terminal className="h-3.5 w-3.5" />
                  <span>Activity Logging & Role-Based Access Enabled</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Bento Grid: 4 Core Institutional Engines */}
        <section id="features" className="border-t border-slate-200 bg-slate-100/60 py-24 dark:border-white/[0.08] dark:bg-black/30">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-14">
              <span className="font-mono text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Core Capabilities</span>
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-5xl dark:text-white">
                Built for everyday school operations.
              </h2>
              <p className="mt-3 max-w-2xl text-slate-600 dark:text-slate-400">
                Essential tools for administrators, teachers, students, and guardians to stay organized and informed.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {institutionalEngines.map((engine) => (
                <div
                  key={engine.id}
                  className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:border-indigo-400 hover:shadow-md dark:border-white/[0.08] dark:bg-[#0c0f17]/60 dark:hover:border-indigo-500/40 dark:hover:bg-[#0c0f17]/90 dark:hover:shadow-[0_16px_40px_rgba(99,102,241,0.12)] sm:p-8"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="grid h-12 w-12 place-items-center rounded-xl border border-slate-200 bg-slate-50 text-indigo-600 group-hover:border-indigo-300 group-hover:bg-indigo-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-indigo-400 dark:group-hover:border-indigo-500/40 dark:group-hover:bg-indigo-500/10">
                      <engine.icon className="h-6 w-6" />
                    </div>
                    <span className="font-mono text-xs font-bold text-slate-400 dark:text-slate-500">{engine.id}</span>
                  </div>

                  <div className="mt-6">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md border border-indigo-200 bg-indigo-50 px-2 py-0.5 font-mono text-[10px] font-semibold text-indigo-700 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-300">
                        {engine.badge}
                      </span>
                      <span className="font-mono text-[11px] font-bold text-emerald-600 dark:text-emerald-400">{engine.stats}</span>
                    </div>
                    <h3 className="mt-2.5 text-xl font-bold text-slate-900 dark:text-white">{engine.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{engine.description}</p>
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-3 border-t border-slate-200 pt-4 font-mono text-xs dark:border-white/[0.08]">
                    {engine.metrics.map((m, idx) => (
                      <div key={idx}>
                        <span className="text-[11px] text-slate-500">{m.label}</span>
                        <p className="mt-0.5 font-bold text-slate-800 dark:text-slate-200">{m.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Role Matrix Section */}
        <section id="roles" className="border-t border-slate-200 bg-white py-24 dark:border-white/[0.08] dark:bg-[#07090e]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-14 text-center">
              <span className="font-mono text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">User Portals</span>
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-5xl dark:text-white">
                Tailored for every campus stakeholder.
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-slate-600 dark:text-slate-400">
                Dedicated, role-aware workspaces for administrators, educators, students, and parents.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {roleMatrix.map((item, idx) => (
                <div
                  key={idx}
                  className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50/70 p-6 shadow-sm transition duration-300 hover:border-slate-300 hover:bg-white hover:shadow-md dark:border-white/[0.08] dark:bg-[#0c0f17]/40 dark:hover:border-white/20 dark:hover:bg-[#0c0f17]/80"
                >
                  <div>
                    <div className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 bg-white text-indigo-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-indigo-300">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">{item.role}</h3>
                    <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">{item.desc}</p>
                    <ul className="mt-4 space-y-2 border-t border-slate-200 pt-3 text-xs text-slate-700 dark:border-white/[0.06] dark:text-slate-300">
                      {item.capabilities.map((cap, capIdx) => (
                        <li key={capIdx} className="flex items-center gap-2">
                          <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                          <span>{cap}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    onClick={() => openAuth('login', portalRoles[idx]?.role || 'ADMIN')}
                    className="mt-6 flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2 text-xs font-bold text-slate-800 shadow-sm transition hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-900 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-slate-300 dark:hover:border-indigo-500/40 dark:hover:bg-indigo-500/10 dark:hover:text-white"
                  >
                    <span>Sign in to {portalRoles[idx]?.label || item.role}</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Security & Audit Proof Section */}
        <section id="security" className="border-t border-slate-200 bg-slate-100/60 py-24 dark:border-white/[0.08] dark:bg-black/40">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid items-center gap-12 lg:grid-cols-12">
              <div className="lg:col-span-7">
                <span className="font-mono text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Audit Trail & Security</span>
                <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-5xl dark:text-white">
                  Complete transparency with automated activity logging and role security.
                </h2>
                <p className="mt-4 text-slate-600 dark:text-slate-400">
                  Every sensitive action—from grade updates and fee waivers to account changes—is safely logged with timestamps and user attribution.
                </p>
                <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/[0.08] dark:bg-white/[0.02]">
                    <p className="font-mono text-2xl font-bold text-slate-900 dark:text-white">36+</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Audited Events</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/[0.08] dark:bg-white/[0.02]">
                    <p className="font-mono text-2xl font-bold text-emerald-600 dark:text-emerald-400">Zero</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Untracked Changes</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/[0.08] dark:bg-white/[0.02]">
                    <p className="font-mono text-2xl font-bold text-indigo-600 dark:text-indigo-400">100%</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Session Attribution</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/[0.08] dark:bg-[#0c0f17] font-mono text-xs lg:col-span-5">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3 text-slate-500 dark:border-white/[0.08] dark:text-slate-400">
                  <span>SAMPLE AUDIT LOG ENTRY</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">STATUS: PASS</span>
                </div>
                <div className="mt-4 space-y-2 text-slate-800 dark:text-slate-300">
                  <p><span className="text-slate-500">Actor:</span> Sarah Jenkins (Teacher)</p>
                  <p><span className="text-slate-500">Action:</span> ATTENDANCE_MARKED</p>
                  <p><span className="text-slate-500">Entity:</span> Class 10-A (ID: 6ac8723510c...)</p>
                  <p><span className="text-slate-500">Network IP:</span> ::1 (Verified Gateway)</p>
                  <p><span className="text-slate-500">Agent:</span> Mozilla/5.0 (Windows NT 10.0)</p>
                  <p className="border-t border-slate-200 pt-2 font-bold text-emerald-600 dark:border-white/[0.06] dark:text-emerald-400">// Verified audit entry saved in database</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Global Footer */}
        <footer className="border-t border-slate-200 bg-white py-12 text-xs text-slate-500 dark:border-white/[0.08] dark:bg-[#07090e] dark:text-slate-500">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-4 sm:flex-row sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <BrandLogo className="h-7 w-7 rounded-lg border border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-indigo-500/10" imageClassName="h-5 w-5" />
              <span className="font-bold text-slate-900 dark:text-slate-300">CampusOryx OS</span>
              <span>• Engineered for Modern Institutions</span>
            </div>
            <div className="flex items-center gap-6">
              <button onClick={() => openAuth('login')} className="hover:text-slate-900 dark:hover:text-slate-300">Sign In</button>
              <button onClick={() => openAuth('register')} className="hover:text-slate-900 dark:hover:text-slate-300">Request Access</button>
              <a href="#architecture" className="hover:text-slate-900 dark:hover:text-slate-300">Architecture</a>
            </div>
          </div>
        </footer>
      </main>

      {/* Raycast-Inspired Floating Command Window Auth Modal */}
      {isAuthOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center p-3 sm:p-4">
          {/* Backdrop Blur */}
          <button
            onClick={() => setIsAuthOpen(false)}
            aria-label="Close modal"
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity dark:bg-black/75"
          />

          {/* Modal Container */}
          <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl transition-all duration-200 animate-in fade-in zoom-in-95 dark:border-white/[0.12] dark:bg-[#0d1018] dark:shadow-[0_32px_96px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.1)]">
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className="grid h-7 w-7 place-items-center rounded-lg border border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400">
                    <Command className="h-4 w-4" />
                  </div>
                  <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                    {mode === 'login' ? 'Sign In to EduManage' : 'Register Parent Account'}
                  </h3>
                </div>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                  {mode === 'login'
                    ? 'Sign in to access your school dashboard'
                    : 'Submit verification request for guardian student link'}
                </p>
              </div>
              <button
                onClick={() => setIsAuthOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-900 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-slate-400 dark:hover:bg-white/[0.08] dark:hover:text-white"
                aria-label="Close modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Mode Switcher */}
            <div className="mt-5 flex rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-white/[0.08] dark:bg-black/40">
              <button
                onClick={() => setMode('login')}
                className={cn(
                  'flex-1 rounded-lg py-1.5 text-xs font-semibold transition',
                  mode === 'login' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                )}
              >
                Sign In
              </button>
              <button
                onClick={() => setMode('register')}
                className={cn(
                  'flex-1 rounded-lg py-1.5 text-xs font-semibold transition',
                  mode === 'register' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                )}
              >
                Request Access
              </button>
            </div>

            {/* Target Portal Selector */}
            {mode === 'login' && (
              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  <span>SELECT TARGET PORTAL</span>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {portalRoles.map((roleItem) => (
                    <button
                      key={roleItem.role}
                      type="button"
                      onClick={() => selectRole(roleItem.role)}
                      className={cn(
                        'flex flex-col items-start rounded-xl border p-2 text-left transition',
                        selectedRole === roleItem.role
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-900 shadow-sm dark:border-indigo-500/60 dark:bg-indigo-500/15 dark:text-white dark:shadow-[0_0_12px_rgba(99,102,241,0.2)]'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-slate-400 dark:hover:border-white/20 dark:hover:text-slate-200'
                      )}
                    >
                      <span className="text-xs font-bold leading-tight">{roleItem.label}</span>
                      <span className="mt-0.5 truncate text-[10px] text-slate-500">{roleItem.badge}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Forms */}
            {mode === 'login' ? (
              <form className="mt-5 space-y-3.5" onSubmit={handleLogin}>
                <div>
                  <label className="mb-1 block font-mono text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400">EMAIL ADDRESS</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                    <input
                      type="email"
                      required
                      value={loginForm.email}
                      onChange={(e) => setLoginForm((prev) => ({ ...prev, email: e.target.value }))}
                      placeholder="name@school.edu"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-xs font-medium text-slate-900 placeholder-slate-400 transition focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-white/[0.08] dark:bg-black/40 dark:text-white dark:placeholder-slate-600"
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between font-mono text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400">
                    <label>PASSWORD</label>
                    <button
                      type="button"
                      onClick={() => navigate('/forgot-password')}
                      className="text-indigo-600 hover:underline dark:text-indigo-400"
                    >
                      Forgot?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={loginForm.password}
                      onChange={(e) => setLoginForm((prev) => ({ ...prev, password: e.target.value }))}
                      placeholder="••••••••••••"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-10 text-xs font-medium text-slate-900 placeholder-slate-400 transition focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-white/[0.08] dark:bg-black/40 dark:text-white dark:placeholder-slate-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {authError && (
                  <div className="rounded-xl border border-rose-500/30 bg-rose-50 p-2.5 text-xs font-medium text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
                    {authError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isAuthLoading}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-xs font-bold text-white shadow-md transition hover:bg-indigo-700 active:scale-98 disabled:opacity-50 dark:shadow-[0_0_24px_rgba(99,102,241,0.4)] dark:hover:bg-indigo-500"
                >
                  <span>{isAuthLoading ? 'Authenticating Session...' : 'Authenticate & Enter Workspace'}</span>
                  <span className="raycast-kbd border-indigo-400/40 bg-indigo-700/60 text-indigo-100">↵</span>
                </button>
              </form>
            ) : (
              <form className="mt-5 space-y-3" onSubmit={handleRegister}>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block font-mono text-[11px] font-bold text-slate-600 dark:text-slate-400">FIRST NAME</label>
                    <input
                      required
                      value={registerForm.firstName}
                      onChange={(e) => setRegisterForm((prev) => ({ ...prev, firstName: e.target.value }))}
                      placeholder="Jane"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-white/[0.08] dark:bg-black/40 dark:text-white dark:placeholder-slate-600"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-mono text-[11px] font-bold text-slate-600 dark:text-slate-400">LAST NAME</label>
                    <input
                      required
                      value={registerForm.lastName}
                      onChange={(e) => setRegisterForm((prev) => ({ ...prev, lastName: e.target.value }))}
                      placeholder="Doe"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-white/[0.08] dark:bg-black/40 dark:text-white dark:placeholder-slate-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block font-mono text-[11px] font-bold text-slate-600 dark:text-slate-400">EMAIL ADDRESS</label>
                  <input
                    type="email"
                    required
                    value={registerForm.email}
                    onChange={(e) => setRegisterForm((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="parent@example.com"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-white/[0.08] dark:bg-black/40 dark:text-white dark:placeholder-slate-600"
                  />
                </div>

                <div>
                  <label className="mb-1 block font-mono text-[11px] font-bold text-slate-600 dark:text-slate-400">PHONE NUMBER (OPTIONAL)</label>
                  <input
                    value={registerForm.phone}
                    onChange={(e) => setRegisterForm((prev) => ({ ...prev, phone: e.target.value }))}
                    placeholder="+1 555-0199"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-white/[0.08] dark:bg-black/40 dark:text-white dark:placeholder-slate-600"
                  />
                </div>

                {requestMessage && (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-50 p-2.5 text-xs font-medium text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300">
                    {requestMessage}
                  </div>
                )}

                {authError && (
                  <div className="rounded-xl border border-rose-500/30 bg-rose-50 p-2.5 text-xs font-medium text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
                    {authError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isAuthLoading}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-xs font-bold text-white shadow-md transition hover:bg-indigo-700 active:scale-98 disabled:opacity-50 dark:shadow-[0_0_24px_rgba(99,102,241,0.4)] dark:hover:bg-indigo-500"
                >
                  <span>{isAuthLoading ? 'Submitting Application...' : 'Submit Verification Request'}</span>
                  <UserPlus className="h-4 w-4" />
                </button>
              </form>
            )}

            {/* Modal Keyboard Hint Footer */}
            <div className="mt-5 flex items-center justify-between border-t border-slate-200 pt-3 text-[11px] font-mono text-slate-500 dark:border-white/[0.08]">
              <span>Press <span className="raycast-kbd">ESC</span> to dismiss</span>
              <span className="flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                256-bit TLS Session
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
