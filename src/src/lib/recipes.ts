import { client } from '../client';
import { rowToView, type RecipeRow, type RecipeView, type Visibility } from './types';

const RECIPE_FIELDS = [
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
] as const;

export async function listPublicRecipes(): Promise<RecipeView[]> {
  const rows = (await client.data.Recipe
    .select(RECIPE_FIELDS)
    .where({ visibility: { eq: 'public' } })
    .orderBy({ createdAt: 'desc' })
    .first(200)
    .execute()) as unknown as RecipeRow[];
  return rows.map(rowToView);
}

/**
 * Author name stamped on every recipe imported by the seed. We exclude rows
 * whose `authorName` matches this from **My recipes** so the seeded catalogue
 * (which is technically owned by whichever user triggered the seed) doesn't
 * pollute that view.
 */
export const SEED_AUTHOR_NAME = 'Contoso Chef';

export async function listMyRecipes(userId: string): Promise<RecipeView[]> {
  const rows = (await client.data.Recipe
    .select(RECIPE_FIELDS)
    .where({
      and: [
        { user_id: { eq: userId } },
        { authorName: { neq: SEED_AUTHOR_NAME } },
      ],
    })
    .orderBy({ createdAt: 'desc' })
    .first(200)
    .execute()) as unknown as RecipeRow[];
  return rows.map(rowToView);
}

export async function getRecipe(id: string): Promise<RecipeView | null> {
  const rows = (await client.data.Recipe
    .select(RECIPE_FIELDS)
    .where({ id: { eq: id } })
    .first(1)
    .execute()) as unknown as RecipeRow[];
  return rows.length > 0 ? rowToView(rows[0]!) : null;
}

export interface CreateRecipeInput {
  name: string;
  description: string;
  type: RecipeView['type'];
  cuisine: string;
  originCountry: string;
  servings: number;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  difficulty: number;
  ingredients: RecipeView['ingredients'];
  steps: RecipeView['steps'];
  allergens: RecipeView['allergens'];
  imageKey?: string;
  imageAlt?: string;
  kcalPerServing?: number;
  nutritionEstimated?: boolean;
  visibility: Visibility;
}

export async function createRecipe(
  input: CreateRecipeInput,
  ctx: { userId: string; authorName?: string | null }
): Promise<RecipeView> {
  const payload = {
    ...input,
    ingredients: JSON.stringify(input.ingredients),
    steps: JSON.stringify(input.steps),
    allergens: JSON.stringify(input.allergens),
    user_id: ctx.userId,
    authorName: ctx.authorName ?? undefined,
    createdAt: new Date(),
  } satisfies Record<string, unknown>;

  const created = (await client.data.Recipe.create(payload as never)) as unknown as RecipeRow;
  return rowToView(created);
}

export async function updateRecipe(
  id: string,
  patch: Partial<CreateRecipeInput>
): Promise<void> {
  const data: Record<string, unknown> = { ...patch };
  if (patch.ingredients) data.ingredients = JSON.stringify(patch.ingredients);
  if (patch.steps) data.steps = JSON.stringify(patch.steps);
  if (patch.allergens) data.allergens = JSON.stringify(patch.allergens);
  await client.data.Recipe.update({ id } as never, data as never);
}

export async function deleteRecipe(id: string): Promise<void> {
  await client.data.Recipe.delete({ id } as never);
}
