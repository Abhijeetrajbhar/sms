import { useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Lock } from 'lucide-react';
import BrandLogo from '../components/common/BrandLogo.jsx';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import Input from '../components/ui/Input.jsx';
import { authApi } from '../services/api.js';
import { useApp } from '../context/AppContext.jsx';

export default function ActivateAccountPage() {
  const { isAuthenticated } = useApp();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [complete, setComplete] = useState(false);

  const [resendEmail, setResendEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [resendNotice, setResendNotice] = useState('');
  const [showResend, setShowResend] = useState(!token);

  if (isAuthenticated) return <Navigate to="/app/dashboard" replace />;

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (!token) {
      setError('This activation link is missing a valid token. Enter your email below to request a new one.');
      setShowResend(true);
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSaving(true);
    try {
      await authApi.activateAccount({ token, password: form.password });
      setComplete(true);
    } catch (activationError) {
      setError(activationError.message || 'Account activation link is invalid or expired. You can request a new link below.');
      setShowResend(true);
    } finally {
      setSaving(false);
    }
  };

  const handleResend = async (event) => {
    event.preventDefault();
    setResending(true);
    setResendNotice('');
    try {
      const res = await authApi.resendActivation({ email: resendEmail });
      setResendNotice(res.message || 'If an account exists with this email, a new activation invitation has been dispatched.');
    } catch (resendErr) {
      setResendNotice(resendErr.message || 'Unable to request activation link. Please contact school administration.');
    } finally {
      setResending(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-10 text-on-surface">
      <Card className="w-full max-w-md p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <BrandLogo className="h-11 w-11 rounded-xl border border-outline/20 bg-surface-container-low" imageClassName="h-9 w-9" />
          <div><p className="text-xs font-bold uppercase text-primary">CampusOryx</p><h1 className="text-xl font-bold">Activate account</h1></div>
        </div>

        {complete ? (
          <div className="mt-8 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
            <h2 className="mt-4 text-xl font-bold">Account activated</h2>
            <p className="mt-2 text-sm text-on-surface-variant">Your password is set and you can now sign in.</p>
            <Link className="mt-6 inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-5 text-sm font-bold text-on-primary" to="/">Continue to sign in</Link>
          </div>
        ) : (
          <div className="mt-8 grid gap-5">
            <form className="grid gap-4" onSubmit={submit}>
              <p className="text-sm leading-6 text-on-surface-variant">Create your private password to accept the school invitation. This link can be used only once.</p>
              <Input icon={Lock} type="password" placeholder="Create password" value={form.password} onChange={(event) => setForm((value) => ({ ...value, password: event.target.value }))} required minLength="8" />
              <Input icon={Lock} type="password" placeholder="Confirm password" value={form.confirmPassword} onChange={(event) => setForm((value) => ({ ...value, confirmPassword: event.target.value }))} required minLength="8" />
              {error ? <p role="alert" className="rounded-lg bg-error-container px-3 py-2 text-xs font-semibold text-on-error-container">{error}</p> : null}
              <Button type="submit" variant="aurora" disabled={saving}>{saving ? 'Activating...' : 'Activate Account'}</Button>
            </form>

            {/* Resend Activation Link Section */}
            {showResend ? (
              <div className="rounded-xl border border-outline-variant/50 bg-surface-container-low/50 p-4">
                <p className="text-xs font-bold text-on-surface">Link expired or missing?</p>
                <p className="mt-1 text-xs text-on-surface-variant">Enter your registered email to receive a fresh activation link:</p>
                <form className="mt-3 flex gap-2" onSubmit={handleResend}>
                  <Input type="email" placeholder="Your email" value={resendEmail} onChange={(e) => setResendEmail(e.target.value)} required className="flex-1 text-xs" />
                  <Button size="sm" variant="secondary" type="submit" disabled={resending}>
                    {resending ? 'Sending...' : 'Resend'}
                  </Button>
                </form>
                {resendNotice ? <p className="mt-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">{resendNotice}</p> : null}
              </div>
            ) : null}
          </div>
        )}
      </Card>
    </main>
  );
}
