import { ArrowLeft, Mail } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import BrandLogo from '../components/common/BrandLogo.jsx';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import Input from '../components/ui/Input.jsx';
import { authApi } from '../services/api.js';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');
    setMessage('');
    try {
      const response = await authApi.forgotPassword({ email });
      setMessage(response.message || 'If the account exists, a reset link has been sent.');
    } catch (submitError) {
      setError(submitError.message || 'The reset request could not be submitted.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-10 text-on-surface">
      <Card className="w-full max-w-md p-5 sm:p-7">
        <div className="mb-6 flex items-center gap-3">
          <BrandLogo className="h-11 w-11" imageClassName="h-9 w-9" />
          <div><p className="text-xs font-bold uppercase text-primary">Account recovery</p><h1 className="text-2xl font-bold">Reset your password</h1></div>
        </div>
        <p className="mb-5 text-sm leading-6 text-on-surface-variant">Enter your verified school email. For privacy, the response is the same whether or not an account exists.</p>
        <form className="grid gap-4" onSubmit={submit}>
          <Input icon={Mail} type="email" label="Email address" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" />
          {message ? <p role="status" className="rounded-lg border border-emerald-300/50 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{message}</p> : null}
          {error ? <p role="alert" className="rounded-lg bg-error-container p-3 text-sm font-semibold text-on-error-container">{error}</p> : null}
          <Button type="submit" variant="aurora" disabled={isSubmitting}>{isSubmitting ? 'Sending...' : 'Send reset link'}</Button>
        </form>
        <Link className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-primary hover:underline" to="/"><ArrowLeft className="h-4 w-4" />Back to sign in</Link>
      </Card>
    </main>
  );
}
