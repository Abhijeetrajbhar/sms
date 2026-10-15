import { useState } from 'react';
import { Check, Copy, Printer, Shield, UserCheck, KeyRound, ExternalLink, X } from 'lucide-react';
import Button from '../ui/Button.jsx';
import BrandLogo from './BrandLogo.jsx';

export default function CredentialSlipModal({ open, data, onClose }) {
  const [copied, setCopied] = useState(false);

  if (!open || !data) return null;

  const isTemp = data.credentialDelivery === 'TEMP_PASSWORD';
  const loginHandle = data.email || data.studentCode || data.employeeCode;
  const credentialSecret = isTemp ? data.temporaryPassword : data.activationUrl;

  const handleCopy = async () => {
    const textToCopy = isTemp
      ? `CampusOryx Login Credentials\nName: ${data.name}\nID/Code: ${data.code || data.email}\nLogin Email: ${data.email}\nTemporary Password: ${data.temporaryPassword}\nLogin Portal: ${window.location.origin}`
      : `CampusOryx Account Activation\nName: ${data.name}\nActivation Link: ${data.activationUrl}\n(Valid for 48 hours)`;

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback if clipboard API is restricted
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm print:p-0 print:bg-white">
      <div className="w-full max-w-xl rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-6 shadow-2xl sm:p-8 print:border-none print:shadow-none print:max-w-none">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-outline-variant/40 pb-5">
          <div className="flex items-center gap-3">
            <BrandLogo className="h-10 w-10 rounded-xl border border-outline/20 bg-surface-container-low" imageClassName="h-7 w-7" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-primary">CampusOryx OS</p>
              <h2 className="text-lg font-bold text-on-surface">Institutional Credential Slip</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-lg text-on-surface-variant hover:bg-surface-container-high print:hidden"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Identity Details Card */}
        <div className="mt-5 rounded-xl border border-outline-variant/40 bg-surface-container-low/60 p-4.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Profile Information</span>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 font-mono text-xs font-bold text-primary">
              {data.role || 'USER'}
            </span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs font-semibold text-on-surface-variant">Full Name</p>
              <p className="font-bold text-on-surface">{data.name}</p>
            </div>
            {data.code ? (
              <div>
                <p className="text-xs font-semibold text-on-surface-variant">Institutional Code</p>
                <p className="font-mono font-bold text-primary">{data.code}</p>
              </div>
            ) : null}
            <div>
              <p className="text-xs font-semibold text-on-surface-variant">Login Email</p>
              <p className="font-semibold text-on-surface">{data.email}</p>
            </div>
            {data.className ? (
              <div>
                <p className="text-xs font-semibold text-on-surface-variant">Assigned Class</p>
                <p className="font-bold text-on-surface">{data.className}</p>
              </div>
            ) : null}
          </div>
        </div>

        {/* Credentials Block */}
        <div className="mt-4 rounded-xl border border-indigo-500/30 bg-indigo-50/50 p-4.5 dark:border-indigo-400/20 dark:bg-indigo-950/20">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
              {isTemp ? 'Initial Login Credentials' : 'Direct Account Activation'}
            </h3>
          </div>

          {isTemp ? (
            <div className="mt-3">
              <p className="text-xs text-on-surface-variant">Temporary Password:</p>
              <div className="mt-1.5 flex items-center justify-between rounded-lg border border-indigo-200 bg-white px-3.5 py-2.5 font-mono text-base font-extrabold tracking-wider text-indigo-950 dark:border-indigo-900/60 dark:bg-slate-900 dark:text-indigo-200">
                <span>{data.temporaryPassword}</span>
                <span className="text-[11px] font-normal text-amber-600 dark:text-amber-400">Must change on 1st login</span>
              </div>
              <p className="mt-2 text-[11px] text-on-surface-variant">
                The user should navigate to the school portal login page and sign in with this temporary password.
              </p>
            </div>
          ) : (
            <div className="mt-3">
              <p className="text-xs text-on-surface-variant">Activation Link (48 hours validity):</p>
              <div className="mt-1.5 break-all rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs font-medium text-indigo-900 dark:border-indigo-900/60 dark:bg-slate-900 dark:text-indigo-200">
                {data.activationUrl || 'Invitation email dispatched to recipient.'}
              </div>
              <p className="mt-2 text-[11px] text-on-surface-variant">
                If the email did not arrive or SMTP is offline, copy this link directly to the recipient.
              </p>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-outline-variant/40 pt-5 print:hidden">
          <Button
            variant="secondary"
            icon={Printer}
            onClick={handlePrint}
          >
            Print Slip
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              icon={copied ? Check : Copy}
              onClick={handleCopy}
            >
              {copied ? 'Copied to Clipboard!' : isTemp ? 'Copy Credentials' : 'Copy Activation Link'}
            </Button>
            <Button
              variant="aurora"
              onClick={onClose}
            >
              Done
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
