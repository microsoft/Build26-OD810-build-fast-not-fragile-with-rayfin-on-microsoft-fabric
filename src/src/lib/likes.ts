import { client } from '../client';

export interface LikeRow {
  id: string;
  user_id: string;
  userName?: string | null;
  recipe_id: string;
  createdAt: string;
}

export async function getLikesForRecipe(recipeId: string): Promise<LikeRow[]> {
  return (await client.data.Like
    .select(['id', 'user_id', 'userName', 'recipe_id', 'createdAt'])
    .where({ recipe_id: { eq: recipeId } })
    .first(500)
    .execute()) as unknown as LikeRow[];
}

export async function getMyLikes(userId: string): Promise<LikeRow[]> {
  return (await client.data.Like
    .select(['id', 'user_id', 'userName', 'recipe_id', 'createdAt'])
    .where({ user_id: { eq: userId } })
    .first(500)
    .execute()) as unknown as LikeRow[];
}

export async function toggleLike(
  recipeId: string,
  userId: string,
  userName?: string | null
): Promise<{ liked: boolean }> {
  const existing = (await client.data.Like
    .select(['id'])
    .where({ recipe_id: { eq: recipeId }, user_id: { eq: userId } })
    .first(1)
    .execute()) as unknown as Array<{ id: string }>;

  if (existing.length > 0) {
    const id = existing[0]?.id;
    if (id) {
      await client.data.Like.delete({ id } as never);
    }
    return { liked: false };
  }

  await client.data.Like.create({
    user_id: userId,
    userName: userName ?? undefined,
    recipe_id: recipeId,
    createdAt: new Date(),
  } as never);
  return { liked: true };
}

export async function getRecipesByIds(ids: string[]): Promise<Record<string, unknown>[]> {
  if (ids.length === 0) return [];
  return (await client.data.Recipe
    .select([
      'id',
      'slug',
      'name',
      'description',
      'type',
      'cuisine',
      'originCountry',
      'servings',
      'prepTimeMinutes',
      'cookTimeMinutes',
      'difficulty',
      'ingredients',
      'steps',
      'allergens',
      'imageKey',
      'imageAlt',
      'kcalPerServing',
      'nutritionEstimated',
      'visibility',
      'user_id',
      'authorName',
      'createdAt',
    ])
    .where({ id: { in: ids } })
    .first(500)
    .execute()) as unknown as Record<string, unknown>[];
}
