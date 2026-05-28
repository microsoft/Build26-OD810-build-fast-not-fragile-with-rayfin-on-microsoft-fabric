import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useSession } from '../hooks/useSession';
import RecipeForm from '../components/RecipeForm';
import { getRecipe, updateRecipe } from '../lib/recipes';
import { uploadRecipeImage } from '../lib/image';
import type { RecipeView } from '../lib/types';

export default function EditRecipe() {
  const { id } = useParams<{ id: string }>();
  const session = useSession();
  const nav = useNavigate();
  const [recipe, setRecipe] = useState<RecipeView | null | 'not-found' | 'forbidden'>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      const r = await getRecipe(id).catch(() => null);
      if (cancelled) return;
      if (!r) {
        setRecipe('not-found');
        return;
      }
      if (session.ready && session.userId !== r.user_id) {
        setRecipe('forbidden');
        return;
      }
      setRecipe(r);
    })();
    return () => {
      cancelled = true;
    };
  }, [id, session.ready, session.userId]);

  if (recipe === 'not-found') {
    return (
      <div className="page-narrow">
        <h1>Recipe not found</h1>
        <Link to="/" className="btn btn-primary">Back to discover</Link>
      </div>
    );
  }
  if (recipe === 'forbidden') {
    return (
      <div className="page-narrow">
        <h1>You can't edit this recipe</h1>
        <Link to="/" className="btn btn-primary">Back to discover</Link>
      </div>
    );
  }
  if (!recipe) return <div className="page-narrow"><p>Loading…</p></div>;

  return (
    <div className="page-narrow">
      <Link to={`/recipes/${recipe.id}`} className="back-link">← Back to recipe</Link>
      <h1>Edit recipe</h1>
      <RecipeForm
        initial={recipe}
        submitLabel="Save changes"
        onSubmit={async (value, image) => {
          await updateRecipe(recipe.id, value);
          if (image) {
            const { imageKey, imageAlt } = await uploadRecipeImage(recipe.id, image);
            await updateRecipe(recipe.id, { imageKey, imageAlt } as never);
          }
          nav(`/recipes/${recipe.id}`, { replace: true });
        }}
      />
    </div>
  );
}
