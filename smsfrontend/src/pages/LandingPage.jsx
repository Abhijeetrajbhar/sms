import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CalendarCheck,
  Check,
  GraduationCap,
  Lock,
  Mail,
  Moon,
  Quote,
  ShieldCheck,
  Sparkles,
  Sun,
  UserPlus,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import BrandLogo from '../components/common/BrandLogo.jsx';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import Input from '../components/ui/Input.jsx';
import Badge from '../components/ui/Badge.jsx';
import { cn } from '../utils/cn.js';

const accounts = [
  { role: 'ADMIN', label: 'Administrator', email: 'admin@edumanage.com', password: 'Admin@123' },
  { role: 'TEACHER', label: 'Teacher', email: 'teacher@edumanage.com', password: 'Teacher@123' },
  { role: 'STUDENT', label: 'Student', email: 'student@edumanage.com', password: 'Student@123' },
  { role: 'PARENT', label: 'Parent', email: 'parent@edumanage.com', password: 'Parent@123' },
];

const pillars = [
  {
    id: '01',
    title: 'Institutional Intelligence',
    text: 'Live analytics, risk indicators, attendance movement, and fee health flowing through one academic command layer.',
    icon: BarChart3,
    className: 'md:col-span-8',
  },
  {
    id: '02',
    title: 'Pedagogical Synthesis',
    text: 'Assignments, results, timetable, and faculty workflows synchronized for every role.',
    icon: BookOpen,
    className: 'md:col-span-4',
  },
  {
    id: '03',
    title: 'Operational Enclave',
    text: 'Role-based access, audit trails, notices, student records, fees, and parent visibility inside a protected school system.',
    icon: ShieldCheck,
    className: 'md:col-span-12',
  },
];

const roleBenefits = [
  { icon: ShieldCheck, role: 'School leaders', text: 'See attendance, performance, fees, and operations from one live dashboard.' },
  { icon: BookOpen, role: 'Teachers', text: 'Spend less time on administration and more time guiding every learner.' },
  { icon: GraduationCap, role: 'Students', text: 'Keep assignments, results, schedules, and announcements within easy reach.' },
  { icon: Users, role: 'Parents', text: 'Stay meaningfully connected to progress, attendance, and school updates.' },
];

const platformStats = [
  ['12+', 'Connected workflows'],
  ['4', 'Role-aware portals'],
  ['99.9%', 'Platform availability'],
  ['24/7', 'Academic visibility'],
];

export default function LandingPage() {
  const { login, register, authError, isAuthLoading, isAuthenticated, theme, toggleTheme } = useApp();
  const [mode, setMode] = useState('login');
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState(accounts[0].role);
  const [loginForm, setLoginForm] = useState({ email: accounts[0].email, password: accounts[0].password });
  const [registerForm, setRegisterForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'STUDENT',
    password: '',
  });
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) navigate('/app/dashboard', { replace: true });
  }, [isAuthenticated, navigate]);

  const selectAccount = (account) => {
    setMode('login');
    setSelectedRole(account.role);
    setLoginForm({ email: account.email, password: account.password });
  };

  const openAuth = (nextMode) => {
    setMode(nextMode);
    setIsAuthOpen(true);
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    await login(loginForm);
    navigate('/app/dashboard', { replace: true });
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    await register(registerForm);
    navigate('/app/dashboard', { replace: true });
  };

  return (
    <main className="min-h-screen overflow-hidden bg-background text-on-surface">
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-outline/20 bg-surface/85 backdrop-blur-md">
        <div className="relative mx-auto flex w-full max-w-[1440px] items-center justify-between gap-2 px-3 py-3 min-[375px]:px-4 sm:gap-4 sm:px-8 sm:py-4 lg:px-16">
          <button className="flex items-center gap-3" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <BrandLogo className="h-10 w-10 rounded-lg border border-outline/20 bg-surface-container-low" imageClassName="h-8 w-8" />
            <span className="hidden font-display text-xl font-semibold text-on-surface min-[425px]:inline sm:text-2xl">CampusOryx</span>
          </button>
          <nav className="hidden items-center gap-8 md:flex">
            {['Features', 'Roles', 'Analytics'].map((item) => (
              <a key={item} className="text-xs font-bold uppercase text-on-surface-variant transition hover:text-primary" href={`#${item.toLowerCase()}`}>{item}</a>
            ))}
          </nav>
          <div className="flex items-center gap-2 sm:gap-4">
            <button className="grid min-h-11 min-w-11 place-items-center rounded-full p-2 text-on-surface-variant transition hover:bg-surface-container hover:text-primary" onClick={toggleTheme} aria-label="Toggle theme">
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <button className="hidden text-xs font-bold uppercase text-on-surface-variant hover:text-primary sm:inline-flex" onClick={() => openAuth('login')}>Login</button>
            <button className="min-h-11 rounded-full bg-primary px-3 py-2 text-xs font-bold uppercase text-on-primary transition hover:bg-primary-container sm:px-4" onClick={() => openAuth('register')}>Register</button>
          </div>

          {isAuthOpen ? (
            <>
              <button className="fixed inset-0 top-[73px] z-40 cursor-default bg-ink/20 backdrop-blur-[2px]" aria-label="Close authentication panel" onClick={() => setIsAuthOpen(false)} />
              <Card className="fixed inset-x-2 top-[4.5rem] z-50 max-h-[calc(100dvh-5rem)] overflow-y-auto p-4 shadow-2xl min-[375px]:inset-x-3 sm:absolute sm:left-auto sm:right-8 sm:top-[76px] sm:w-[520px] sm:p-5 lg:right-16">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase text-primary">{mode === 'login' ? 'Welcome back' : 'Join CampusOryx'}</p>
                    <h2 className="mt-1 font-display text-2xl font-semibold text-on-surface">{mode === 'login' ? 'Enter your school workspace' : 'Create your secure account'}</h2>
                  </div>
                  <button className="rounded-full p-2 text-on-surface-variant transition hover:bg-surface-container hover:text-primary" onClick={() => setIsAuthOpen(false)} aria-label="Close authentication panel">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="mb-5 flex rounded-full border border-outline/20 bg-surface-container-low p-1">
                  {['login', 'register'].map((item) => (
                    <button key={item} className={cn('flex-1 rounded-full px-4 py-2 text-xs font-bold uppercase transition', mode === item ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:text-primary')} onClick={() => setMode(item)} type="button">
                      {item}
                    </button>
                  ))}
                </div>

                {mode === 'login' ? (
                  <form className="grid gap-3" onSubmit={handleLogin}>
                    <Input icon={Mail} type="email" placeholder="Institutional email" value={loginForm.email} onChange={(event) => setLoginForm((value) => ({ ...value, email: event.target.value }))} required />
                    <Input icon={Lock} type="password" placeholder="Secure password" value={loginForm.password} onChange={(event) => setLoginForm((value) => ({ ...value, password: event.target.value }))} required />
                    {authError ? <p className="rounded-lg bg-error-container px-3 py-2 text-sm font-semibold text-on-error-container">{authError}</p> : null}
                    <Button type="submit" variant="aurora" size="lg" icon={ArrowRight} disabled={isAuthLoading}>{isAuthLoading ? 'Signing in...' : 'Sign In to Portal'}</Button>
                    <p className="pt-2 text-[11px] font-bold uppercase text-outline">Quick demo access</p>
                    <div className="grid grid-cols-2 gap-2">
                      {accounts.map((account) => (
                        <button key={account.role} type="button" onClick={() => selectAccount(account)} className={cn('rounded-lg border px-3 py-2 text-left transition', selectedRole === account.role ? 'border-primary/40 bg-primary/10 text-primary' : 'border-outline/20 bg-surface-container-low text-on-surface-variant hover:text-primary')}>
                          <span className="block text-xs font-bold">{account.label}</span>
                          <span className="mt-1 block truncate text-[10px] font-medium">{account.email}</span>
                        </button>
                      ))}
                    </div>
                  </form>
                ) : (
                  <form className="grid gap-3" onSubmit={handleRegister}>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Input placeholder="First name" value={registerForm.firstName} onChange={(event) => setRegisterForm((value) => ({ ...value, firstName: event.target.value }))} required />
                      <Input placeholder="Last name" value={registerForm.lastName} onChange={(event) => setRegisterForm((value) => ({ ...value, lastName: event.target.value }))} required />
                      <Input icon={Mail} type="email" placeholder="Email" value={registerForm.email} onChange={(event) => setRegisterForm((value) => ({ ...value, email: event.target.value }))} required />
                      <Input placeholder="Phone" value={registerForm.phone} onChange={(event) => setRegisterForm((value) => ({ ...value, phone: event.target.value }))} />
                      <select className="focus-ring h-11 rounded-lg border border-outline-variant/70 bg-surface-container-lowest px-4 text-sm font-semibold text-on-surface dark:border-white/10 dark:bg-white/10 dark:text-white" value={registerForm.role} onChange={(event) => setRegisterForm((value) => ({ ...value, role: event.target.value }))}>
                        {['TEACHER', 'STUDENT', 'PARENT'].map((role) => <option key={role} value={role}>{role}</option>)}
                      </select>
                      <Input icon={Lock} type="password" placeholder="Password" value={registerForm.password} onChange={(event) => setRegisterForm((value) => ({ ...value, password: event.target.value }))} required />
                    </div>
                    {authError ? <p className="rounded-lg bg-error-container px-3 py-2 text-sm font-semibold text-on-error-container">{authError}</p> : null}
                    <Button type="submit" variant="aurora" size="lg" icon={UserPlus} disabled={isAuthLoading}>{isAuthLoading ? 'Creating account...' : 'Create Account'}</Button>
                  </form>
                )}
              </Card>
            </>
          ) : null}
        </div>
      </header>

      <section className="relative min-h-screen border-b border-outline/10 pt-28">
        <div className="mx-auto grid w-full max-w-[1440px] grid-cols-1 gap-8 px-4 pb-16 sm:px-8 lg:grid-cols-12 lg:px-16 lg:pt-16">
          <div className="flex flex-col justify-center lg:col-span-7">
            <p className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-xs font-bold uppercase text-primary"><Sparkles className="h-4 w-4" /> One campus. Every possibility.</p>
            <h1 className="max-w-4xl font-display text-4xl font-bold leading-tight text-on-surface min-[425px]:text-5xl sm:text-6xl lg:text-7xl">
              Give your school more time to inspire.
            </h1>
            <p className="mt-7 max-w-xl text-base leading-7 text-on-surface-variant sm:text-lg">
              CampusOryx brings people, progress, and everyday school operations together so your community can focus on what matters: helping every student thrive.
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Button className="w-full sm:w-auto" variant="aurora" size="lg" icon={ArrowRight} onClick={() => openAuth('register')}>Start Your Journey</Button>
              <a className="inline-flex min-h-12 w-full items-center justify-center border border-outline/40 px-5 text-center text-sm font-bold uppercase text-on-surface transition hover:bg-surface-container sm:w-auto" href="#features">Explore the Platform</a>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-xs font-semibold text-on-surface-variant">
              {['Fast setup', 'Role-based security', 'Built for every school'].map((item) => <span key={item} className="flex items-center gap-2"><Check className="h-4 w-4 text-secondary" />{item}</span>)}
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="relative overflow-hidden border border-outline/20 bg-surface-container-lowest p-3">
              <img
                alt="Futuristic academic architecture"
                className="aspect-[4/5] w-full object-cover opacity-70 grayscale mix-blend-luminosity"
                src="https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=900&q=80"
              />
              <div className="absolute inset-x-4 top-4 flex justify-between text-[10px] font-bold uppercase text-outline">
                <span>COORD: 42.3601 N</span>
                <span>SECURE NODE</span>
              </div>
              <div className="absolute inset-x-4 bottom-4 flex justify-between border-t border-outline/20 pt-3 text-[10px] font-bold uppercase text-outline">
                <span>ENCLAVE: ACTIVE</span>
                <span>V NODE: 7.21</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-outline/10 bg-surface-container-lowest">
        <div className="mx-auto grid max-w-[1440px] grid-cols-1 divide-y divide-outline/15 px-4 min-[375px]:grid-cols-2 min-[375px]:divide-x sm:px-8 md:grid-cols-4 md:divide-y-0 lg:px-16">
          {platformStats.map(([value, label]) => (
            <div key={label} className="px-4 py-8 text-center sm:py-10">
              <p className="font-display text-3xl font-semibold text-primary sm:text-4xl">{value}</p>
              <p className="mt-2 text-xs font-bold uppercase text-on-surface-variant">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="features" className="py-20 sm:py-28">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-16">
          <div className="mb-12 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase text-secondary">Ecosystem Components</p>
              <h2 className="mt-3 font-display text-4xl font-semibold text-on-surface sm:text-5xl">Strategic Pillars</h2>
            </div>
            <p className="text-xs font-bold uppercase text-outline">Secure protocol initiated</p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
            {pillars.map((pillar) => (
              <article key={pillar.id} className={cn('group border border-outline/20 bg-surface-container-lowest p-6 transition hover:bg-surface-container-low sm:p-10', pillar.className)}>
                <div className="flex items-start justify-between gap-6">
                  <pillar.icon className="h-10 w-10 text-primary" />
                  <span className="font-display text-4xl text-outline/40">{pillar.id}</span>
                </div>
                <h3 className="mt-10 font-display text-3xl font-semibold text-on-surface">{pillar.title}</h3>
                <p className="mt-4 max-w-xl text-sm leading-7 text-on-surface-variant sm:text-base">{pillar.text}</p>
                <div className="mt-10 flex items-center gap-3 text-xs font-bold uppercase text-primary transition group-hover:gap-5">
                  View Core <ArrowRight className="h-4 w-4" />
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="roles" className="border-y border-outline/10 bg-surface-container-lowest py-20 sm:py-28">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-16">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-bold uppercase text-secondary">One connected community</p>
            <h2 className="mt-3 font-display text-4xl font-semibold text-on-surface sm:text-5xl">Everyone gets exactly what they need.</h2>
            <p className="mt-5 text-base leading-7 text-on-surface-variant">Simple, focused experiences for every person who helps your school move forward.</p>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {roleBenefits.map((item) => (
              <article key={item.role} className="group rounded-2xl border border-outline/20 bg-surface-container-low p-6 transition hover:-translate-y-1 hover:border-primary/30 hover:shadow-soft">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary"><item.icon className="h-6 w-6" /></div>
                <h3 className="mt-6 font-display text-2xl font-semibold text-on-surface">{item.role}</h3>
                <p className="mt-3 text-sm leading-6 text-on-surface-variant">{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-28">
        <div className="mx-auto grid max-w-[1440px] gap-12 px-4 sm:px-8 lg:grid-cols-2 lg:items-center lg:px-16">
          <div>
            <p className="text-xs font-bold uppercase text-secondary">From busy to beautifully organized</p>
            <h2 className="mt-3 max-w-xl font-display text-4xl font-semibold text-on-surface sm:text-5xl">A calmer school day starts here.</h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-on-surface-variant">Replace scattered spreadsheets, missed updates, and repetitive work with one dependable source of truth.</p>
            <div className="mt-8 space-y-5">
              {[
                [Zap, 'Set up quickly', 'Bring your people and academic structure together without a painful rollout.'],
                [CalendarCheck, 'Run the day with confidence', 'Attendance, schedules, fees, results, and notices stay current.'],
                [BarChart3, 'Improve with real insight', 'Spot trends early and turn school data into meaningful action.'],
              ].map(([Icon, title, text]) => (
                <div key={title} className="flex gap-4">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-secondary/10 text-secondary"><Icon className="h-5 w-5" /></div>
                  <div><h3 className="font-bold text-on-surface">{title}</h3><p className="mt-1 text-sm leading-6 text-on-surface-variant">{text}</p></div>
                </div>
              ))}
            </div>
          </div>
          <div className="relative overflow-hidden rounded-3xl bg-primary p-8 text-on-primary sm:p-12">
            <Quote className="h-12 w-12 opacity-50" />
            <blockquote className="mt-8 font-display text-3xl font-semibold leading-snug sm:text-4xl">“The right school platform should feel less like software and more like breathing room.”</blockquote>
            <p className="mt-8 text-sm font-bold uppercase opacity-80">The CampusOryx promise</p>
            <div className="absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-white/10" />
          </div>
        </div>
      </section>

      <section id="analytics" className="bg-surface-container-low py-20 text-center sm:py-28">
        <div className="mx-auto max-w-3xl px-4">
          <h2 className="font-display text-4xl font-semibold text-on-surface sm:text-5xl">Ready for a school day that flows?</h2>
          <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-on-surface-variant">Bring your whole school community into one clear, secure, and welcoming platform.</p>
          <Button className="mt-8" variant="aurora" size="lg" icon={ArrowRight} onClick={() => openAuth('register')}>Create Your Account</Button>
        </div>
      </section>

      <footer className="border-t border-outline/20 bg-surface-container-lowest">
        <div className="mx-auto grid max-w-[1440px] grid-cols-1 gap-10 px-4 py-14 sm:px-8 md:grid-cols-5 lg:px-16">
          <div className="md:col-span-2">
            <div className="flex items-center gap-3"><BrandLogo className="h-11 w-11 rounded-xl border border-outline/20 bg-surface-container-low" imageClassName="h-9 w-9" /><span className="font-display text-3xl font-semibold text-on-surface">CampusOryx</span></div>
            <p className="mt-5 max-w-sm text-sm leading-6 text-on-surface-variant">A more connected, confident, and human way to run your school.</p>
            <button className="mt-6 inline-flex items-center gap-2 text-xs font-bold uppercase text-primary hover:text-primary-container" onClick={() => openAuth('register')}>Get started <ArrowRight className="h-4 w-4" /></button>
          </div>
          {[
            ['Platform', ['Features', '#features'], ['Roles', '#roles'], ['Analytics', '#analytics']],
            ['Resources', ['Dashboard demo', '#features'], ['Security', '#features'], ['Contact', 'mailto:hello@campusoryx.com']],
            ['Company', ['About us', '#roles'], ['Our promise', '#analytics'], ['Get started', '#analytics']],
          ].map(([title, ...items]) => (
            <div key={title}>
              <p className="mb-4 text-xs font-bold uppercase text-primary">{title}</p>
              <ul className="space-y-3 text-sm text-on-surface-variant">
                {items.map(([label, href]) => <li key={label}><a className="transition hover:text-primary" href={href}>{label}</a></li>)}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-outline/15">
          <div className="mx-auto flex max-w-[1440px] flex-col gap-3 px-4 py-5 text-xs text-on-surface-variant sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-16">
            <p>© 2026 CampusOryx. Built for thriving school communities.</p>
            <div className="flex gap-5"><a className="hover:text-primary" href="#features">Privacy</a><a className="hover:text-primary" href="#features">Terms</a><a className="hover:text-primary" href="mailto:hello@campusoryx.com">hello@campusoryx.com</a></div>
          </div>
        </div>
      </footer>
    </main>
  );
}
