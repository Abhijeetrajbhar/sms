import { useState } from 'react';
import { Lock, ShieldCheck, CheckCircle2 } from 'lucide-react';
import Input from '../ui/Input.jsx';
import Button from '../ui/Button.jsx';
import { api } from '../../services/api.js';
import { useApp } from '../../context/AppContext.jsx';

export default function MustChangePasswordModal({ open, onPasswordUpdated }) {
  const { currentUser } = useApp();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!open) return null;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (form.newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    setSaving(true);
    try {
      await api.patch('/auth/change-password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      setSuccess(true);
      setTimeout(() => {
        onPasswordUpdated();
      }, 1500);
    } catch (err) {
      setError(err.message || 'Unable to update password. Verify your temporary password and try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/75 p-4 backdrop-blur-md">
      <div className="w-full max-w-md rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-6 shadow-2xl sm:p-7">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-500/10 text-amber-600 dark:bg-amber-400/20 dark:text-amber-400">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-on-surface">Update Temporary Password</h2>
            <p className="text-xs font-semibold text-on-surface-variant">Required for first-time account setup</p>
          </div>
        </div>

        {success ? (
          <div className="mt-6 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
            <h3 className="mt-3 text-base font-bold text-on-surface">Password Updated Successfully!</h3>
            <p className="mt-1 text-xs text-on-surface-variant">Loading your dashboard...</p>
          </div>
        ) : (
          <form className="mt-5 grid gap-3.5" onSubmit={handleSubmit}>
            <p className="text-xs leading-5 text-on-surface-variant">
              You logged in using a temporary admission credential. For security, create your private permanent password before continuing.
            </p>

            <Input
              icon={Lock}
              type="password"
              placeholder="Current temporary password"
              value={form.currentPassword}
              onChange={(e) => setForm((v) => ({ ...v, currentPassword: e.target.value }))}
              required
            />

            <Input
              icon={Lock}
              type="password"
              placeholder="Create new password (min. 8 chars)"
              value={form.newPassword}
              onChange={(e) => setForm((v) => ({ ...v, newPassword: e.target.value }))}
              required
              minLength="8"
            />

            <Input
              icon={Lock}
              type="password"
              placeholder="Confirm new password"
              value={form.confirmPassword}
              onChange={(e) => setForm((v) => ({ ...v, confirmPassword: e.target.value }))}
              required
              minLength="8"
            />

            {error ? (
              <p role="alert" className="rounded-lg bg-error-container px-3 py-2 text-xs font-semibold text-on-error-container">
                {error}
              </p>
            ) : null}

            <Button type="submit" variant="aurora" className="mt-2" disabled={saving}>
              {saving ? 'Updating Password...' : 'Save & Enter Workspace'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
