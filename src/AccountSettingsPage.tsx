import { useEffect, useId, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { ArrowDownLeft, ArrowLeft, ArrowRight, ArrowUpRight, Compass, KeyRound, LogOut, Route, ShieldCheck, UserRound } from 'lucide-react';
import type { User } from '../shared/types';
import { api } from './api';
import { sendPasswordReset } from './lib/auth';
import './account-settings.css';

type AccountSettingsProps = {
  user: User | null;
  ready: boolean;
  cloud: boolean;
  onBack: () => void;
  onLogin: () => void;
  onViewTrips: () => void;
  onSignOut: () => Promise<void>;
  onDeleted: () => void;
};

function SettingsCard({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  const id = useId();
  return <section className="account-card" aria-labelledby={id}>
    <div className="account-card-heading"><span className="account-card-icon" aria-hidden="true">{icon}</span><h2 id={id}>{title}</h2></div>
    {children}
  </section>;
}

function SecurityActions({ email, cloud, onSignOut }: Pick<AccountSettingsProps, 'cloud' | 'onSignOut'> & { email: string }) {
  const [sending, setSending] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  async function requestReset() {
    setSending(true);
    setStatus('');
    setError('');
    try {
      await sendPasswordReset(email);
      setStatus('Check your inbox for your reset link. It may also be in Spam.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not request a reset link. Try again.');
    } finally {
      setSending(false);
    }
  }

  async function signOut() {
    setSigningOut(true);
    try { await onSignOut(); } finally { setSigningOut(false); }
  }

  return <>
    <p>{cloud ? 'Send a link to your account email to reset your password.' : 'Password-reset emails are unavailable for local preview accounts.'}</p>
    <div className="account-card-actions">
      {cloud && email && <button type="button" className="btn btn-outline" disabled={sending || signingOut} onClick={requestReset}>
        {sending ? 'Requesting link…' : 'Send password reset link'} <ArrowRight size={16} aria-hidden="true"/>
      </button>}
      <button type="button" className="account-text-action" disabled={signingOut || sending} onClick={signOut}>
        <LogOut size={16} aria-hidden="true"/> {signingOut ? 'Signing out…' : 'Sign out of Roam'}
      </button>
    </div>
    {status && <p className="account-message" role="status">{status}</p>}
    {error && <p className="account-message account-message-error" role="alert">{error}</p>}
  </>;
}

function LocalAccountDeletion({ onDeleted }: Pick<AccountSettingsProps, 'onDeleted'>) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function remove(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!window.confirm('Permanently delete your local account and its saved trips?')) return;
    const password = new FormData(event.currentTarget).get('password');
    setBusy(true);
    setError('');
    try {
      await api('/account', { method: 'DELETE', body: JSON.stringify({ password }) });
      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete your local account. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return <details className="account-local-delete">
    <summary>Delete this local account</summary>
    <form className="auth-form" onSubmit={remove}>
      <label className="field"><span>Confirm your password</span><input type="password" name="password" required autoComplete="current-password"/></label>
      <button type="submit" className="btn btn-outline" disabled={busy}>{busy ? 'Deleting…' : 'Delete local account'}</button>
      {error && <p className="account-message account-message-error" role="alert">{error}</p>}
    </form>
  </details>;
}

export default function AccountSettingsPage({ user, ready, cloud, onBack, onLogin, onViewTrips, onSignOut, onDeleted }: AccountSettingsProps) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'Account settings · Roam';
    window.scrollTo(0, 0);
    heading.current?.focus({ preventScroll: true });
    return () => { document.title = previousTitle; };
  }, []);

  return <div className="account-page">
    <button type="button" className="account-back" onClick={onBack}><ArrowLeft size={17} aria-hidden="true"/> Back to Roam</button>

    <div className="account-masthead">
      <Compass className="account-compass" size={220} strokeWidth={0.65} aria-hidden="true"/>
      <h1 ref={heading} tabIndex={-1}>Account settings<span>.</span></h1>
      <p>Manage your Roam profile, sign-in, and data.</p>
    </div>

    {!ready ? <p className="account-gate" role="status">Loading your account…</p> : user ?
      <div className="account-grid" key={user.id}>
        <SettingsCard title="Profile" icon={<UserRound size={21}/>}>
          <div className="account-profile">
            <span className="account-profile-avatar" aria-hidden="true">{user.name.charAt(0).toUpperCase()}</span>
            <dl>
              <div><dt>Name</dt><dd>{user.name}</dd></div>
              <div><dt>Account email</dt><dd>{user.email || 'No email on this account'}</dd></div>
            </dl>
          </div>
        </SettingsCard>

        <SettingsCard title="Sign-in & security" icon={<KeyRound size={21}/>}>
          <SecurityActions key={user.email} email={user.email} cloud={cloud} onSignOut={onSignOut}/>
        </SettingsCard>

        <SettingsCard title="Itineraries" icon={<Route size={21}/>}>
          <p>Open a trip in the planner to export a copy. Deleting a saved trip removes it from your account.</p>
          <div className="account-card-actions"><button type="button" className="btn btn-outline" onClick={onViewTrips}>Open my itineraries <ArrowRight size={16} aria-hidden="true"/></button></div>
        </SettingsCard>

        <SettingsCard title="Privacy & data" icon={<ShieldCheck size={21}/>}>
          <p>Device drafts and favorites stay in this browser until you clear them. Contact ROAM Support to request a data copy or delete your account.</p>
          <div className="account-card-actions">
            <a className="btn btn-outline" href="/support.html?topic=Account%20deletion" target="_blank" rel="noreferrer">Request account deletion or a data copy <ArrowUpRight size={16} aria-hidden="true"/></a>
            <a className="account-text-action" href="/privacy.html" target="_blank" rel="noreferrer">Privacy and data handling <ArrowUpRight size={15} aria-hidden="true"/></a>
          </div>
          {!cloud && <LocalAccountDeletion onDeleted={onDeleted}/>}
        </SettingsCard>
      </div> : <section className="account-gate" aria-labelledby="account-sign-in">
        <h2 id="account-sign-in">Sign in to see your settings</h2>
        <p>Your profile and account tools are available after you sign in.</p>
        <button type="button" className="btn btn-yellow" onClick={onLogin}>Log in to Roam <ArrowDownLeft size={17} aria-hidden="true"/></button>
      </section>}
  </div>;
}
