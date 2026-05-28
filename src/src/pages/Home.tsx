import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSession } from '../hooks/useSession';
import { listPublicRecipes } from '../lib/recipes';
import { getLikesForRecipe, getMyLikes } from '../lib/likes';
import { seedFromBundle, type SeedProgress } from '../lib/seed';
import RecipeCard from '../components/RecipeCard';
import { RECIPE_TYPES, type RecipeType, type RecipeView } from '../lib/types';

export default function Home() {
  const session = useSession();
  const [recipes, setRecipes] = useState<RecipeView[] | null>(null);
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [myLikedIds, setMyLikedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [type, setType] = useState<RecipeType | 'all'>('all');
  const [seeding, setSeeding] = useState<SeedProgress | null>(null);
  const [seedError, setSeedError] = useState<string | null>(null);
  const seedTriggered = useRef(false);

  const refreshRecipes = useCallback(async () => {
    const list = await listPublicRecipes();
    setRecipes(list);
    const counts: Record<string, number> = {};
    await Promise.all(
      list.map(async (r) => {
        try {
          const likes = await getLikesForRecipe(r.id);
          counts[r.id] = likes.length;
        } catch {
          counts[r.id] = 0;
        }
      })
    );
    setLikeCounts(counts);
  }, []);

  // Initial fetch.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await refreshRecipes();
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshRecipes]);

  // Per-user "liked" set.
  useEffect(() => {
    if (!session.isAuthenticated || !session.userId) {
      setMyLikedIds(new Set());
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const likes = await getMyLikes(session.userId!);
        if (cancelled) return;
        setMyLikedIds(new Set(likes.map((l) => l.recipe_id)));
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session.isAuthenticated, session.userId]);

  // Run the seed against the connected backend. Idempotent server-side
  // (dedupes by slug), so re-running is safe.
  const triggerSeed = useCallback(async () => {
    if (seedTriggered.current) return;
    if (!session.isAuthenticated || !session.userId) return;
    seedTriggered.current = true;
    setSeedError(null);
    try {
      setSeeding({ done: 0, total: 100, current: '' });
      const result = await seedFromBundle({
        userId: session.userId!,
        authorName: 'Contoso Chef',
        onProgress: (p) => setSeeding(p),
      });
      // eslint-disable-next-line no-console
      console.log('[seed] complete', result);
      await refreshRecipes();
    } catch (err) {
      setSeedError(err instanceof Error ? err.message : String(err));
    } finally {
      setSeeding(null);
    }
  }, [session.isAuthenticated, session.userId, refreshRecipes]);

  // Auto-trigger when the public catalogue is empty AND a user is signed in.
  // The seed is idempotent and the in-component ref prevents duplicate runs
  // within a session, so no localStorage flag is needed.
  useEffect(() => {
    if (!session.ready || !session.isAuthenticated) return;
    if (recipes === null) return; // wait for the first fetch
    if (recipes.length > 0) return;
    void triggerSeed();
  }, [session.ready, session.isAuthenticated, recipes, triggerSeed]);

  const filtered = useMemo(() => {
    if (!recipes) return null;
    const q = query.trim().toLowerCase();
    return recipes.filter((r) => {
      if (type !== 'all' && r.type !== type) return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.cuisine.toLowerCase().includes(q) ||
        r.originCountry.toLowerCase().includes(q)
      );
    });
  }, [recipes, query, type]);

  const isEmptyDb = recipes !== null && recipes.length === 0;
  const showFilters = !isEmptyDb && !seeding;

  return (
    <div className="page">
      <section className="hero">
        <p className="hero-eyebrow">Issue · 01 · Spring Edition</p>
        <h1 className="hero-title">
          A modern <em>cookbook</em>,<br />
          shared by <span className="hero-accent">your community.</span>
        </h1>
        <p className="hero-sub">
          Browse 100 chef-curated dishes from around the world, save your own private recipes,
          and share favourites with a single link.
        </p>
        <div className="hero-actions">
          <a href="#discover" className="btn btn-primary btn-lg">Browse the kitchen</a>
          {!session.isAuthenticated && (
            <Link to="/login" className="btn btn-ghost btn-lg">Sign in to cook</Link>
          )}
        </div>
      </section>

      {seeding && <SeedingOverlay progress={seeding} />}

      <section id="discover" className="section">
        <div className="section-head">
          <div>
            <h2 className="section-title">Discover</h2>
            <p className="section-sub">Public recipes from the Contoso Chef community.</p>
          </div>
          {showFilters && (
            <div className="filters">
              <input
                type="search"
                className="input"
                placeholder="Search by name, cuisine…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <select
                className="select"
                value={type}
                onChange={(e) => setType(e.target.value as RecipeType | 'all')}
                aria-label="Filter by recipe type"
              >
                <option value="all">All types</option>
                {RECIPE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {seedError && (
          <div className="alert alert-error">
            Couldn't import sample recipes: {seedError}{' '}
            <button
              type="button"
              className="link"
              onClick={() => {
                seedTriggered.current = false;
                void triggerSeed();
              }}
            >
              Try again
            </button>
          </div>
        )}

        {!recipes && !error && <div className="grid-skeleton">Loading recipes…</div>}

        {isEmptyDb && !seeding && !session.isAuthenticated && (
          <div className="empty">
            <h3>Catalogue is empty.</h3>
            <p>Sign in to populate the demo with 100 sample recipes.</p>
            <Link to="/login" className="btn btn-primary">Sign in</Link>
          </div>
        )}

        {filtered && filtered.length === 0 && recipes && recipes.length > 0 && (
          <div className="empty">
            <h3>No recipes match your filter.</h3>
            <p>Try a different search or clear the type filter.</p>
          </div>
        )}

        {filtered && filtered.length > 0 && (
          <div className="grid">
            {filtered.map((r) => (
              <RecipeCard
                key={r.id}
                recipe={r}
                likeCount={likeCounts[r.id] ?? 0}
                liked={myLikedIds.has(r.id)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function SeedingOverlay({ progress }: { progress: SeedProgress }) {
  const pct = Math.round((progress.done / Math.max(1, progress.total)) * 100);
  return (
    <div className="seed-banner" role="status" aria-live="polite">
      <div className="seed-banner-head">
        <strong>Importing sample recipes…</strong>
        <span>{progress.done} / {progress.total}</span>
      </div>
      <div className="seed-bar">
        <div className="seed-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="seed-current">{progress.current || 'Preparing…'}</div>
    </div>
  );
}
