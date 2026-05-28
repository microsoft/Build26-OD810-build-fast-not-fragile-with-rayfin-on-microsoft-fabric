import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useSession } from '../hooks/useSession';
import { signInWithFabric } from '../fabricAuth';

interface LocationState {
  from?: string;
}

export default function Login() {
  const session = useSession();
  const nav = useNavigate();
  const location = useLocation();
  const from = (location.state as LocationState | null)?.from ?? '/';

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (session.isAuthenticated) nav(from, { replace: true });
  }, [session.isAuthenticated, from, nav]);

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
