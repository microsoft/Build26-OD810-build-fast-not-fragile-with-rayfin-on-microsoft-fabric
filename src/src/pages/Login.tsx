import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { client } from '../client';
import { useSession } from '../hooks/useSession';
import { isFabricMode, signInWithFabric } from '../fabricAuth';

interface LocationState {
  from?: string;
}

export default function Login() {
  const session = useSession();
  const nav = useNavigate();
  const location = useLocation();
  const from = (location.state as LocationState | null)?.from ?? '/';

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (session.isAuthenticated) nav(from, { replace: true });
  }, [session.isAuthenticated, from, nav]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === 'signup') {
        await client.auth.signUp({ email, password });
      }
      await client.auth.signIn({ email, password });
      nav(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setBusy(false);
    }
  };

  const onFabric = async () => {
    setError(null);
    setBusy(true);
    try {
      await signInWithFabric();
      nav(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fabric sign-in failed');
    } finally {
      setBusy(false);
    }
  };

  // When the build was made for Microsoft Fabric (VITE_FABRIC_* env present),
  // we only offer Fabric SSO. Email/password is local-development-only.
  if (isFabricMode) {
    return (
      <div className="page-narrow">
        <div className="auth-card">
          <header className="auth-head">
            <h1>Welcome back</h1>
            <p>Sign in with your Microsoft account to save private recipes and like your favourites.</p>
          </header>

          <button
            type="button"
            className="btn btn-fabric btn-lg btn-block"
            onClick={onFabric}
            disabled={busy}
            autoFocus
          >
            {busy ? 'Signing in…' : 'Continue with Microsoft Fabric'}
          </button>

          {error && <div className="alert alert-error">{error}</div>}

          <Link to="/" className="auth-back">← Back to discover</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-narrow">
      <div className="auth-card">
        <header className="auth-head">
          <h1>{mode === 'signin' ? 'Welcome back' : 'Join the table'}</h1>
          <p>
            {mode === 'signin'
              ? 'Sign in to save private recipes and like your favourites.'
              : 'Create an account to start sharing your recipes.'}
          </p>
        </header>

        <form className="form" onSubmit={onSubmit}>
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              required
              onChange={(e) => setEmail(e.target.value)}
              className="input"
            />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              type="password"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              minLength={8}
              value={password}
              required
              onChange={(e) => setPassword(e.target.value)}
              className="input"
            />
          </label>
          {error && <div className="alert alert-error">{error}</div>}
          <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={busy}>
            {busy ? 'Working…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <div className="auth-toggle">
          {mode === 'signin' ? (
            <>
              No account yet?{' '}
              <button type="button" className="link" onClick={() => setMode('signup')}>
                Create one
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button type="button" className="link" onClick={() => setMode('signin')}>
                Sign in
              </button>
            </>
          )}
        </div>

        <Link to="/" className="auth-back">← Back to discover</Link>
      </div>
    </div>
  );
}
