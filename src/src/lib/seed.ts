import { client } from '../client';
import { bundledImageKey } from './image';

/**
 * Browser-side seed: imports the bundled `data/recipes.json` (served at
 * `/seed/recipes.json` by `vite-plugin-seed-assets`) into the connected
 * Rayfin backend, uploading each cover image from `/seed/images/<slug>.jpg`.
 *
 * Runs against the SAME backend the app is currently talking to:
 * - locally: the Docker dev stack
 * - in Fabric: the deployed Rayfin item
 *
 * Authentication: requires the user to be already signed in (they own the
 * created recipes). Uploads use the helpers in `./storage.ts` to bypass a
 * URL-construction bug in the Rayfin storage SDK that affects path-prefixed
 * Fabric backends.
 */

interface SeedRecipe {
  id: string;
  name: string;
  description: string;
  type:
    | 'main' | 'appetizer' | 'dessert' | 'cocktail' | 'drink'
    | 'breakfast' | 'snack' | 'side' | 'sauce' | 'bread';
  cuisine: string;
  originCountry: string;
  servings: number;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  difficulty: number;
  ingredients: { name: string; amount: string; unit: string; notes: string }[];
  steps: { order: number; instruction: string }[];
  image: { url: string; alt: string };
  nutrition: { kcalPerServing: number; estimated: boolean };
  allergens: string[];
}

interface Dataset {
  schemaVersion: string;
  datasetLanguage: string;
  recipes: SeedRecipe[];
}

export interface SeedProgress {
  done: number;
  total: number;
  current: string;
}

export interface SeedOptions {
  userId: string;
  authorName?: string | null;
  /** Called after each recipe is processed (created or skipped). */
  onProgress?: (p: SeedProgress) => void;
  signal?: AbortSignal;
}

export interface SeedResult {
  created: number;
  skipped: number;
  failed: number;
}

export async function seedFromBundle(options: SeedOptions): Promise<SeedResult> {
  const { userId, authorName, onProgress, signal } = options;

  const datasetRes = await fetch('/seed/recipes.json', { signal });
  if (!datasetRes.ok) {
    throw new Error(`Failed to load /seed/recipes.json (HTTP ${datasetRes.status})`);
  }
  const dataset = (await datasetRes.json()) as Dataset;
  const total = dataset.recipes.length;
  let created = 0;
  let skipped = 0;
  let failed = 0;
  let done = 0;

  for (const r of dataset.recipes) {
    if (signal?.aborted) break;
    try {
      const existing = (await client.data.Recipe
        .select(['id', 'imageKey'])
        .where({ slug: { eq: r.id } })
        .first(1)
        .execute()) as Array<{ id: string; imageKey?: string | null }>;

      let recipeId: string;
      let needsImage: boolean;
      if (existing.length > 0) {
        recipeId = existing[0]!.id;
        needsImage = !existing[0]!.imageKey;
        skipped++;
      } else {
        const recipe = (await client.data.Recipe.create({
          slug: r.id,
          name: r.name,
          description: r.description,
          type: r.type,
          cuisine: r.cuisine,
          originCountry: r.originCountry,
          servings: r.servings,
          prepTimeMinutes: r.prepTimeMinutes,
          cookTimeMinutes: r.cookTimeMinutes,
          difficulty: r.difficulty,
          ingredients: JSON.stringify(r.ingredients),
          steps: JSON.stringify(r.steps),
          allergens: JSON.stringify(r.allergens ?? []),
          kcalPerServing: r.nutrition?.kcalPerServing ?? null,
          nutritionEstimated: r.nutrition?.estimated ?? null,
          visibility: 'public',
          user_id: userId,
          authorName: authorName ?? 'Contoso Chef',
          createdAt: new Date(),
        } as never)) as { id: string };
        recipeId = recipe.id;
        needsImage = true;
        created++;
      }

      if (needsImage) {
        await pointRecipeAtBundledCover(recipeId, r);
      }
    } catch (err) {
      failed++;
      // eslint-disable-next-line no-console
      console.warn('[seed]', r.id, err);
    } finally {
      done++;
      onProgress?.({ done, total, current: r.name });
    }
  }

  return { created, skipped, failed };
}

/**
 * Point the seeded Recipe at the cover image bundled with the static app
 * (`/seed/images/<slug>.jpg`) instead of uploading it to Rayfin storage.
 *
 * Why: the Rayfin storage data plane currently fails on Microsoft Fabric with
 * a `TenantResolutionMiddleware` 500 — the request reaches the right backend
 * with all the standard SDK headers but the storage controller can't resolve
 * the project context. Until that's fixed upstream, we encode bundled assets
 * directly into the Recipe row using the `bundle:images/<slug>.jpg` form
 * (resolved client-side by `getImageUrl`).
 *
 * User-uploaded covers (via **+ New recipe**) still use Rayfin storage —
 * they work locally and can switch back to that path once the upstream bug
 * is fixed.
 */
async function pointRecipeAtBundledCover(recipeId: string, r: SeedRecipe): Promise<void> {
  await client.data.Recipe.update(
    { id: recipeId } as never,
    { imageKey: bundledImageKey(r.image.url), imageAlt: r.image.alt } as never
  );
}
