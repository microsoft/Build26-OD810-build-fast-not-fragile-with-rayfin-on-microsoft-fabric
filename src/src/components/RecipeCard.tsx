import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { RecipeView } from '../lib/types';
import { getImageUrl } from '../lib/image';

export interface RecipeCardProps {
  recipe: RecipeView;
  likeCount?: number;
  liked?: boolean;
  showVisibility?: boolean;
}

export default function RecipeCard({ recipe, likeCount, liked, showVisibility }: RecipeCardProps) {
  const [imgUrl, setImgUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setImgUrl(null);
    if (recipe.imageKey) {
      void getImageUrl(recipe.imageKey).then((url) => {
        if (!cancelled) setImgUrl(url);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [recipe.imageKey]);

  const total = (recipe.prepTimeMinutes ?? 0) + (recipe.cookTimeMinutes ?? 0);

  return (
    <Link to={`/recipes/${recipe.id}`} className="card">
      <div className="card-media" aria-hidden="true">
        {imgUrl ? (
          <img src={imgUrl} alt="" loading="lazy" />
        ) : (
          <div className="card-placeholder">
            <span>{recipe.name.slice(0, 1)}</span>
          </div>
        )}
        {showVisibility && recipe.visibility !== 'public' && (
          <span className={`badge badge-${recipe.visibility}`}>{recipe.visibility}</span>
        )}
      </div>
      <div className="card-body">
        <div className="card-meta">
          <span className="meta-type">{recipe.type}</span>
          <span className="meta-dot">•</span>
          <span>{recipe.cuisine}</span>
        </div>
        <h3 className="card-title">{recipe.name}</h3>
        <p className="card-desc">{recipe.description}</p>
        <div className="card-footer">
          <span title="Total time">⏱ {total} min</span>
          <span title="Servings">🍽 {recipe.servings}</span>
          <span title="Difficulty">{'★'.repeat(recipe.difficulty)}{'☆'.repeat(3 - recipe.difficulty)}</span>
          {typeof likeCount === 'number' && (
            <span className={`like-pill ${liked ? 'like-pill-active' : ''}`} title="Likes">
              {liked ? '❤' : '♡'} {likeCount}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
