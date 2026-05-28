/**
 * Idempotent seed script.
 *
 * Reads `data/recipes.json` and creates one Recipe per entry under a fixed
 * "Contoso Chef" demo user, uploading the cover image for each recipe to
 * Rayfin storage. Re-running is safe: existing recipes are skipped by slug.
 *
 * Usage:
 *   npm run seed
 *
 * Required env (loaded from .env at project root):
 *   VITE_RAYFIN_API_URL          - Rayfin backend URL (e.g. http://localhost:5168)
 *   VITE_RAYFIN_PUBLISHABLE_KEY  - Rayfin publishable key (from `rayfin dev status`)
 *   SEED_USER_EMAIL              - email for the demo user (default: chef@contoso.local)
 *   SEED_USER_PASSWORD           - password for the demo user (default: ChefDemo!2026)
 *   SEED_USER_NAME               - display name (default: Contoso Chef)
 */
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ExtendableRayfinClient } from '@microsoft/rayfin-client/experimental';
import { createStorageClient, type StorageClient } from '@microsoft/rayfin-storage';
import type { AppSchema } from '../rayfin/data/schema.ts';
import type { AppStorageSchema } from '../rayfin/storage/schema.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

// Allow `--env-file <path>` (or `SEED_ENV_FILE=<path>`) to point the seed at
// a deployed environment, e.g. `npm run seed:fabric` (loads `.env.fabric`).
const envFile = parseEnvFileArg() ?? process.env.SEED_ENV_FILE ?? '.env';
await loadEnvFile(resolve(repoRoot, envFile));

const baseUrl = required('VITE_RAYFIN_API_URL');
const publishableKey = required('VITE_RAYFIN_PUBLISHABLE_KEY');
const seedEmail = process.env.SEED_USER_EMAIL ?? 'chef@contoso.local';
const seedPassword = process.env.SEED_USER_PASSWORD ?? 'ChefDemo!2026';
const seedName = process.env.SEED_USER_NAME ?? 'Contoso Chef';

console.log(`→ Loaded env from ${envFile}`);

interface Dataset {
  schemaVersion: string;
  datasetLanguage: string;
  recipes: SeedRecipe[];
}

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

type Services = { storage: StorageClient<AppStorageSchema> };

const client = ExtendableRayfinClient.create<AppSchema, Services>({
  baseUrl,
  publishableKey,
  authStorage: false,
  services: {
    storage: createStorageClient<AppStorageSchema>,
  },
});

/**
 * Separate, unauthenticated client used only for image uploads.
 * Rayfin storage scopes blobs by uploader id, so anonymous uploads make
 * cover images readable to every visitor.
 */
const anonClient = ExtendableRayfinClient.create<AppSchema, Services>({
  baseUrl,
  publishableKey,
  authStorage: false,
  services: {
    storage: createStorageClient<AppStorageSchema>,
  },
});

console.log(`→ Seeding against ${baseUrl} as ${seedEmail}`);

await ensureSignedIn();

const session = client.auth.getSession() as
  | { isAuthenticated?: boolean; user?: { id?: string; sub?: string } }
  | null;
const userId = session?.user?.id ?? session?.user?.sub;
if (!userId) {
  console.error('Could not determine user id from session.');
  process.exit(1);
}

const datasetPath = resolve(repoRoot, 'data', 'recipes.json');
const raw = await readFile(datasetPath, 'utf8');
const dataset = JSON.parse(raw) as Dataset;

console.log(`→ Loaded ${dataset.recipes.length} recipes from ${datasetPath}`);

let created = 0;
let skipped = 0;
let imageOk = 0;
let imageMissing = 0;
let imageBackfilled = 0;

for (const r of dataset.recipes) {
  const existing = await client.data.Recipe
    .select(['id', 'imageKey'])
    .where({ slug: { eq: r.id } })
    .first(1)
    .execute() as Array<{ id: string; imageKey?: string | null }>;

  let recipeId: string;
  let needsImage: boolean;

  if (existing.length > 0) {
    skipped++;
    recipeId = existing[0]!.id;
    // Even if the row says it has an imageKey, verify the blob is actually
    // present in storage. Volumes can drift out of sync (e.g. partial purge,
    // half-failed earlier run), so we re-upload whenever the blob is missing.
    needsImage = !existing[0]!.imageKey || !(await blobExists(recipeId));
    if (!needsImage) {
      process.stdout.write('.');
      continue;
    }
  } else {
    const recipe = await client.data.Recipe.create({
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
      authorName: seedName,
      createdAt: new Date(),
    } as never) as { id: string };
    recipeId = recipe.id;
    needsImage = true;
    created++;
  }

  if (needsImage) {
    const localImagePath = resolve(repoRoot, 'data', r.image.url);
    if (existsSync(localImagePath)) {
      try {
        const buffer = await readFile(localImagePath);
        const u8 = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
        const ext = (r.image.url.match(/\.([a-z0-9]+)$/i)?.[1] ?? 'jpg').toLowerCase();
        // Remove any stale metadata row first so upload doesn't conflict.
        // (Storage rows can survive Azurite volume resets, leaving an entry
        // pointing at bytes that are gone.)
        await anonClient.storage.RecipeImage.delete(`cover.${ext}`, { prefix: recipeId }).catch(
          () => undefined
        );
        // Upload anonymously so the blob is readable by all visitors
        // (Rayfin scopes blobs by uploader id).
        await anonClient.storage.RecipeImage.upload(`cover.${ext}`, u8, {
          contentType: contentTypeFor(ext),
          prefix: recipeId,
        });
        await client.data.Recipe.update(
          { id: recipeId } as never,
          { imageKey: `${recipeId}/cover.${ext}`, imageAlt: r.image.alt } as never
        );
        imageOk++;
        if (existing.length > 0) imageBackfilled++;
      } catch (err) {
        imageMissing++;
        const e = err as { message?: string; code?: string; status?: number };
        console.warn(
          `\n  ! Failed to upload image for ${r.id}:`,
          e.message ?? err,
          e.code ?? '',
          e.status ?? ''
        );
      }
    } else {
      imageMissing++;
    }
  }

  process.stdout.write(existing.length > 0 ? '↑' : '+');
}

process.stdout.write('\n');
console.log(
  `✓ Done. created=${created} skipped=${skipped} images=${imageOk} (backfilled=${imageBackfilled}) missing=${imageMissing}`
);

async function ensureSignedIn(): Promise<void> {
  try {
    await client.auth.signIn({ email: seedEmail, password: seedPassword });
    console.log('  ✓ signed in');
  } catch {
    console.log('  → signing up demo user');
    try {
      await client.auth.signUp({ email: seedEmail, password: seedPassword });
    } catch (err) {
      console.warn('  ! signUp failed (may already exist):', (err as Error).message);
    }
    await client.auth.signIn({ email: seedEmail, password: seedPassword });
    console.log('  ✓ signed in after sign-up');
  }
}

function required(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing required env var: ${name}.`);
    console.error('Run `npx rayfin dev`, then copy the publishable key into .env.');
    process.exit(1);
  }
  return v;
}

function contentTypeFor(ext: string): string {
  switch (ext) {
    case 'png': return 'image/png';
    case 'webp': return 'image/webp';
    case 'gif': return 'image/gif';
    case 'jpg':
    case 'jpeg':
    default: return 'image/jpeg';
  }
}

/**
 * True if the recipe's cover image blob is present and downloadable.
 *
 * We attempt an actual download (a tiny HEAD-like read) rather than just
 * listing, because Rayfin's storage metadata DB and the underlying Azurite
 * blob store can drift out of sync — `list` may report a blob whose bytes
 * have already been removed (e.g. an earlier `rayfin dev --purge` only wiped
 * the Azurite volume).
 */
async function blobExists(recipeId: string): Promise<boolean> {
  const list = await anonClient.storage.RecipeImage.list({ prefix: recipeId, limit: 1 }).catch(
    () => null
  );
  const item = list?.items?.[0] as { name?: string } | undefined;
  if (!item?.name) return false;
  try {
    const result = await anonClient.storage.RecipeImage.download(item.name, {
      prefix: recipeId,
    });
    // Drain & discard the stream to confirm the bytes are actually there.
    const reader = result.stream.getReader();
    while (true) {
      const { done } = await reader.read();
      if (done) break;
    }
    return true;
  } catch {
    return false;
  }
}

async function loadEnvFile(path: string): Promise<void> {
  if (!existsSync(path)) {
    console.warn(`! Env file not found: ${path} (continuing without it)`);
    return;
  }
  const text = await readFile(path, 'utf8');
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

/** Read `--env-file <path>` from process.argv and return the path, if any. */
function parseEnvFileArg(): string | undefined {
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === '--env-file' || a === '-e') return argv[i + 1];
    if (a.startsWith('--env-file=')) return a.slice('--env-file='.length);
  }
  return undefined;
}
