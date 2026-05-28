import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSession } from '../hooks/useSession';
import { getMyLikes, getRecipesByIds } from '../lib/likes';
import RecipeCard from '../components/RecipeCard';
import { rowToView, type RecipeRow, type RecipeView } from '../lib/types';

export default function Liked() {
  const session = useSession();
  const [recipes, setRecipes] = useState<RecipeView[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session.userId) return;
    let cancelled = false;
    (async () => {
      try {
        const likes = await getMyLikes(session.userId!);
        const ids = likes.map((l) => l.recipe_id);
        if (ids.length === 0) {
          if (!cancelled) setRecipes([]);
          return;
        }
        const rows = (await getRecipesByIds(ids)) as unknown as RecipeRow[];
        const ordered = ids
          .map((id) => rows.find((r) => r.id === id))
          .filter(Boolean) as RecipeRow[];
        if (!cancelled) setRecipes(ordered.map(rowToView));
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session.userId]);

  return (
    <div className="page">
      <header className="section-head">
        <div>
          <h1 className="section-title">Liked recipes</h1>
          <p className="section-sub">Recipes you've saved as favourites.</p>
        </div>
      </header>

      {error && <div className="alert alert-error">{error}</div>}
      {!recipes && !error && <p>Loading…</p>}
      {recipes && recipes.length === 0 && (
        <div className="empty">
          <h3>No likes yet.</h3>
          <p>Find a recipe you love on the Discover page and tap the heart.</p>
          <Link to="/" className="btn btn-primary">Browse recipes</Link>
        </div>
      )}
      {recipes && recipes.length > 0 && (
        <div className="grid">
          {recipes.map((r) => (
            <RecipeCard key={r.id} recipe={r} liked />
          ))}
        </div>
      )}
    </div>
  );
}
