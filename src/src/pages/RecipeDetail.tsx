import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useSession } from '../hooks/useSession';
import { deleteRecipe, getRecipe } from '../lib/recipes';
import { getLikesForRecipe, toggleLike } from '../lib/likes';
import { getImageUrl } from '../lib/image';
import type { RecipeView } from '../lib/types';
import Comments from '../components/Comments';

export default function RecipeDetail() {
  const { id } = useParams<{ id: string }>();
  const session = useSession();
  const nav = useNavigate();

  const [recipe, setRecipe] = useState<RecipeView | null | 'not-found'>(null);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  // We only expose the like *count* and whether the current user liked this
  // recipe — never the list of users who did, for privacy.
  const [likeCount, setLikeCount] = useState<number>(0);
  const [liked, setLiked] = useState<boolean>(false);
  const [busyLike, setBusyLike] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    if (!session.ready) return;
    if (!session.isAuthenticated) {
      setRecipe(null);
      setImgUrl(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setRecipe(null);
    setImgUrl(null);
    (async () => {
      try {
        const r = await getRecipe(id);
        if (cancelled) return;
        if (!r) {
          setRecipe('not-found');
          return;
        }
        setRecipe(r);
        if (r.imageKey) {
          const url = await getImageUrl(r.imageKey);
          if (!cancelled) setImgUrl(url);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, session.ready, session.isAuthenticated]);

  useEffect(() => {
    if (!id) return;
    if (!session.isAuthenticated) {
      setLikeCount(0);
      setLiked(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await getLikesForRecipe(id);
        if (cancelled) return;
        setLikeCount(data.length);
        setLiked(!!session.userId && data.some((l) => l.user_id === session.userId));
      } catch {
        if (!cancelled) {
          setLikeCount(0);
          setLiked(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, session.isAuthenticated, session.userId]);

  const onToggleLike = async () => {
    if (!session.userId || !id || busyLike) return;
    setBusyLike(true);
    try {
      await toggleLike(id, session.userId, session.displayName ?? session.email ?? null);
      const fresh = await getLikesForRecipe(id);
      setLikeCount(fresh.length);
      setLiked(fresh.some((l) => l.user_id === session.userId));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyLike(false);
    }
  };

  const onDelete = async () => {
    if (!recipe || recipe === 'not-found') return;
    const ok = window.confirm(`Delete "${recipe.name}"? This cannot be undone.`);
    if (!ok) return;
    try {
      await deleteRecipe(recipe.id);
      nav('/my', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const onShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ url, title: recipeTitleSafe(recipe) });
      else await navigator.clipboard.writeText(url);
    } catch {
      /* ignore */
    }
  };

  if (recipe === 'not-found') {
    return (
      <div className="page-narrow">
        <h1>Recipe not found</h1>
        <p>It may be private, removed, or the link may be incorrect.</p>
        <Link to="/" className="btn btn-primary">Back to discover</Link>
      </div>
    );
  }

  if (session.ready && !session.isAuthenticated) {
    return (
      <div className="page-narrow">
        <h1>Sign in to view this recipe</h1>
        <Link
          to="/login"
          state={{ from: { pathname: `/recipes/${id ?? ''}` } }}
          className="btn btn-primary"
        >
          Sign in
        </Link>
      </div>
    );
  }

  if (!recipe) {
    return <div className="page-narrow"><p>Loading…</p></div>;
  }

  const isOwner = session.userId === recipe.user_id;
  const totalTime = recipe.prepTimeMinutes + recipe.cookTimeMinutes;

  return (
    <article className="page recipe-page">
      <Link to="/" className="back-link">← Back</Link>

      <header className="recipe-header">
        <div className="recipe-meta-row">
          <span className="meta-type">{recipe.type}</span>
          <span className="meta-dot">•</span>
          <span>{recipe.cuisine}</span>
          <span className="meta-dot">•</span>
          <span>{recipe.originCountry}</span>
          {recipe.visibility !== 'public' && (
            <span className={`badge badge-${recipe.visibility}`}>{recipe.visibility}</span>
          )}
        </div>
        <h1 className="recipe-title">{recipe.name}</h1>
        <p className="recipe-desc">{recipe.description}</p>
        {recipe.authorName && (
          <p className="recipe-author">by <strong>{recipe.authorName}</strong></p>
        )}

        <div className="recipe-actions">
          <button
            type="button"
            className={`btn ${liked ? 'btn-liked' : 'btn-ghost'}`}
            onClick={onToggleLike}
            disabled={busyLike || !session.isAuthenticated}
            title={!session.isAuthenticated ? 'Sign in to like recipes' : undefined}
          >
            {liked ? '❤' : '♡'} {likeCount}
          </button>
          {recipe.visibility !== 'private' && (
            <button type="button" className="btn btn-ghost" onClick={onShare}>
              Share link
            </button>
          )}
          {isOwner && (
            <>
              <Link to={`/recipes/${recipe.id}/edit`} className="btn btn-ghost">Edit</Link>
              <button type="button" className="btn btn-ghost btn-danger" onClick={onDelete}>
                Delete
              </button>
            </>
          )}
        </div>
      </header>

      {imgUrl && (
        <figure className="recipe-hero">
          <img src={imgUrl} alt={recipe.imageAlt ?? recipe.name} />
        </figure>
      )}

      <section className="recipe-stats">
        <Stat label="Prep" value={`${recipe.prepTimeMinutes} min`} />
        <Stat label="Cook" value={`${recipe.cookTimeMinutes} min`} />
        <Stat label="Total" value={`${totalTime} min`} />
        <Stat label="Servings" value={`${recipe.servings}`} />
        <Stat label="Difficulty" value={'★'.repeat(recipe.difficulty) + '☆'.repeat(3 - recipe.difficulty)} />
        {recipe.kcalPerServing != null && (
          <Stat
            label="Calories"
            value={`${recipe.kcalPerServing} kcal${recipe.nutritionEstimated ? ' (est.)' : ''}`}
          />
        )}
      </section>

      {recipe.allergens.length > 0 && (
        <section className="recipe-allergens">
          <h3>Allergens</h3>
          <ul className="chip-row">
            {recipe.allergens.map((a) => (
              <li key={a} className="chip chip-warn">{a.replace('_', ' ')}</li>
            ))}
          </ul>
        </section>
      )}

      <div className="recipe-cols">
        <section className="ingredients">
          <h2>Ingredients</h2>
          <ul>
            {recipe.ingredients.map((i, idx) => (
              <li key={idx}>
                <span className="amt">{i.amount} {i.unit}</span>
                <span className="name">{i.name}</span>
                {i.notes && <span className="note"> — {i.notes}</span>}
              </li>
            ))}
          </ul>
        </section>

        <section className="steps">
          <h2>Method</h2>
          <ol>
            {recipe.steps
              .slice()
              .sort((a, b) => a.order - b.order)
              .map((s) => (
                <li key={s.order}>
                  <span className="step-num">{s.order}</span>
                  <span>{s.instruction}</span>
                </li>
              ))}
          </ol>
        </section>
      </div>

      <Comments recipe={recipe} />

      {error && <div className="alert alert-error">{error}</div>}
    </article>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
    </div>
  );
}

function recipeTitleSafe(r: RecipeView | null | 'not-found'): string {
  return r && r !== 'not-found' ? r.name : 'Contoso Chef';
}
