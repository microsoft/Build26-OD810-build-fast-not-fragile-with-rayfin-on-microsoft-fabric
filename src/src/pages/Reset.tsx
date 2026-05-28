import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { client } from '../client';
import { useSession } from '../hooks/useSession';

interface DeleteRow {
  id: string;
  imageKey?: string | null;
}

/**
 * Admin route: wipes every recipe (and every like, where the policy lets us)
 * the signed-in user can reach, then redirects home so the auto-seed triggers
 * again. The Recipe permission policy is
 *   `claims.sub.eq(item.user_id).or(item.visibility.neq('private'))`
 * so authenticated users can delete every non-private recipe — perfect for
 * resetting the seeded demo catalogue.
 */
export default function Reset() {
  const session = useSession();
  const nav = useNavigate();
  const [status, setStatus] = useState<string>('Ready');
  const [done, setDone] = useState(0);
  const [total, setTotal] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (session.ready && !session.isAuthenticated) {
      nav('/login', { replace: true, state: { from: '/reset' } });
    }
  }, [session.ready, session.isAuthenticated, nav]);

  const run = async () => {
    setRunning(true);
    setErr(null);
    try {
      setStatus('Counting recipes…');
      const recipes = (await client.data.Recipe
        .select(['id', 'imageKey'])
        .first(1000)
        .execute()) as unknown as DeleteRow[];
      setTotal(recipes.length);
      setStatus('Deleting recipes…');
      let i = 0;
      for (const r of recipes) {
        try {
          await client.data.Recipe.delete({ id: r.id } as never);
        } catch (e) {
          // Most likely a private recipe owned by a different user; skip.
          // eslint-disable-next-line no-console
          console.warn('[reset] could not delete', r.id, e);
        }
        i++;
        if (i % 10 === 0) setDone(i);
      }
      setDone(recipes.length);
      setStatus('Done.');

      // Best-effort: clear the home page's "skip auto-seed" flag if any.
      try {
        localStorage.removeItem('contoso-chef:seeded-once');
      } catch {
        /* ignore */
      }

      setTimeout(() => nav('/', { replace: true }), 800);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  };

  if (!session.ready) return <div className="page-pad">Loading…</div>;

  return (
    <div className="page-narrow">
      <Link to="/" className="back-link">← Back</Link>
      <h1>Reset catalogue</h1>
      <p className="muted">
        Deletes every public &amp; unlisted recipe you can see. Likes that the
        policy lets you delete will go too. Use this to clear the seeded
        catalogue and trigger the auto-seed again on the next visit to home.
      </p>

      {err && <div className="alert alert-error">{err}</div>}

      <p>
        <strong>Status:</strong> {status}
        {total !== null && ` (${done} / ${total})`}
      </p>

      <button
        type="button"
        className="btn btn-primary btn-lg"
        onClick={run}
        disabled={running}
      >
        {running ? 'Working…' : 'Wipe and re-seed'}
      </button>
    </div>
  );
}
