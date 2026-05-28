import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom';
import { useSession } from '../hooks/useSession';
import { client } from '../client';

export default function Layout() {
  const session = useSession();
  const nav = useNavigate();

  const onSignOut = async () => {
    try {
      await client.auth.signOut();
    } catch {
      /* ignore */
    }
    nav('/');
  };

  return (
    <div className="app">
      <header className="topbar">
        <Link to="/" className="brand" aria-label="Contoso Chef home">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 32 32" width="28" height="28">
              <path
                d="M11 4c-3.3 0-6 2.7-6 6 0 1.7.7 3.3 2 4.4V25a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3V14.4c1.3-1.1 2-2.7 2-4.4 0-3.3-2.7-6-6-6-1.5 0-2.9.6-4 1.5C15.9 4.6 14.5 4 13 4c-.7 0-1.3.1-2 .3z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              <path d="M11 18h10M11 22h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </span>
          <span className="brand-text">
            <span className="brand-title">Contoso&nbsp;Chef</span>
            <span className="brand-tag">Recipes worth keeping</span>
          </span>
        </Link>

        <nav className="topnav" aria-label="Primary">
          <NavLink to="/" end className={navClass}>
            Discover
          </NavLink>
          {session.isAuthenticated && (
            <>
              <NavLink to="/my" className={navClass}>
                My recipes
              </NavLink>
              <NavLink to="/liked" className={navClass}>
                Liked
              </NavLink>
            </>
          )}
        </nav>

        <div className="topactions">
          {session.isAuthenticated ? (
            <>
              <Link to="/new" className="btn btn-primary">
                + New recipe
              </Link>
              <div className="user-chip" title={session.email ?? undefined}>
                <span className="user-avatar" aria-hidden="true">
                  {(session.displayName ?? session.email ?? '?').slice(0, 1).toUpperCase()}
                </span>
                <span className="user-name">{session.displayName ?? session.email}</span>
              </div>
              <button type="button" className="btn btn-ghost" onClick={onSignOut}>
                Sign out
              </button>
            </>
          ) : (
            <Link to="/login" className="btn btn-primary">
              Sign in
            </Link>
          )}
        </div>
      </header>

      <main className="main">
        <Outlet />
      </main>

      <footer className="footer">
        <span>
          Built with{' '}
          <a href="https://aka.ms/rayfin" target="_blank" rel="noreferrer">
            Rayfin
          </a>{' '}
          on Microsoft Fabric.
        </span>
      </footer>
    </div>
  );
}

function navClass({ isActive }: { isActive: boolean }) {
  return isActive ? 'navlink navlink-active' : 'navlink';
}
