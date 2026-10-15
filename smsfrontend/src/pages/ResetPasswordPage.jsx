import { ArrowLeft, LockKeyhole } from 'lucide-react';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import BrandLogo from '../components/common/BrandLogo.jsx';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import Input from '../components/ui/Input.jsx';
import { authApi } from '../services/api.js';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (!token) return setError('This reset link is incomplete. Request a new password reset email.');
    if (form.password !== form.confirmPassword) return setError('Passwords do not match.');
    setIsSubmitting(true);
    try {
      const response = await authApi.resetPassword({ token, newPassword: form.password });
      setMessage(response.message || 'Password reset successfully. You can now sign in.');
      setForm({ password: '', confirmPassword: '' });
    } catch (submitError) {
      setError(submitError.message || 'This reset link is invalid or expired.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-10 text-on-surface">
      <Card className="w-full max-w-md p-5 sm:p-7">
        <div className="mb-6 flex items-center gap-3">
          <BrandLogo className="h-11 w-11" imageClassName="h-9 w-9" />
          <div><p className="text-xs font-bold uppercase text-primary">Secure recovery</p><h1 className="text-2xl font-bold">Choose a new password</h1></div>
        </div>
        <p className="mb-5 text-sm leading-6 text-on-surface-variant">Use at least eight characters with uppercase, lowercase, a number, and a special character.</p>
        <form className="grid gap-4" onSubmit={submit}>
          <Input icon={LockKeyhole} type="password" label="New password" value={form.password} onChange={(event) => setForm((value) => ({ ...value, password: event.target.value }))} required autoComplete="new-password" />
          <Input icon={LockKeyhole} type="password" label="Confirm password" value={form.confirmPassword} onChange={(event) => setForm((value) => ({ ...value, confirmPassword: event.target.value }))} required autoComplete="new-password" />
          {message ? <p role="status" className="rounded-lg border border-emerald-300/50 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{message}</p> : null}
          {error ? <p role="alert" className="rounded-lg bg-error-container p-3 text-sm font-semibold text-on-error-container">{error}</p> : null}
          <Button type="submit" variant="aurora" disabled={isSubmitting || Boolean(message)}>{isSubmitting ? 'Updating...' : 'Update password'}</Button>
        </form>
        <Link className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-primary hover:underline" to="/"><ArrowLeft className="h-4 w-4" />Back to sign in</Link>
      </Card>
    </main>
  );
}
