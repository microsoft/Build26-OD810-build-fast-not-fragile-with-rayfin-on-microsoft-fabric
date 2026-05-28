import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSession } from '../hooks/useSession';
import { listMyRecipes } from '../lib/recipes';
import RecipeCard from '../components/RecipeCard';
import type { RecipeView } from '../lib/types';

export default function MyRecipes() {
  const session = useSession();
  const [recipes, setRecipes] = useState<RecipeView[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session.userId) return;
    let cancelled = false;
    (async () => {
      try {
        const list = await listMyRecipes(session.userId!);
        if (!cancelled) setRecipes(list);
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
          <h1 className="section-title">My recipes</h1>
          <p className="section-sub">Recipes you've created — across every visibility level.</p>
        </div>
        <Link to="/new" className="btn btn-primary">+ New recipe</Link>
      </header>

      {error && <div className="alert alert-error">{error}</div>}
      {!recipes && !error && <p>Loading…</p>}
      {recipes && recipes.length === 0 && (
        <div className="empty">
          <h3>No recipes yet.</h3>
          <p>Start by creating your first recipe — it stays private until you decide to share it.</p>
          <Link to="/new" className="btn btn-primary">Create a recipe</Link>
        </div>
      )}
      {recipes && recipes.length > 0 && (
        <div className="grid">
          {recipes.map((r) => (
            <RecipeCard key={r.id} recipe={r} showVisibility />
          ))}
        </div>
      )}
    </div>
  );
}
