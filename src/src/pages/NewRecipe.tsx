import { Link, useNavigate } from 'react-router-dom';
import { useSession } from '../hooks/useSession';
import RecipeForm from '../components/RecipeForm';
import { createRecipe, updateRecipe } from '../lib/recipes';
import { uploadRecipeImage } from '../lib/image';

export default function NewRecipe() {
  const session = useSession();
  const nav = useNavigate();

  return (
    <div className="page-narrow">
      <Link to="/" className="back-link">← Back</Link>
      <h1>New recipe</h1>
      <p className="muted">Defaults to private. Switch to Unlisted to share by link, or Public to publish.</p>
      <RecipeForm
        submitLabel="Save recipe"
        onSubmit={async (value, image) => {
          if (!session.userId) throw new Error('You must be signed in.');
          const created = await createRecipe(value, {
            userId: session.userId,
            authorName: session.displayName ?? session.email ?? null,
          });
          if (image) {
            const { imageKey, imageAlt } = await uploadRecipeImage(created.id, image);
            await updateRecipe(created.id, { imageKey, imageAlt } as never);
          }
          nav(`/recipes/${created.id}`, { replace: true });
        }}
      />
    </div>
  );
}
