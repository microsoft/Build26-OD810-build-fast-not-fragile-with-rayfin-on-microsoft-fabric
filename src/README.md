<div align="center">

<img src="public/favicon.svg" width="56" alt="Contoso Chef logo" />

# Contoso Chef

**A recipe-sharing sample app built with [Rayfin](https://aka.ms/rayfin) on Microsoft Fabric.**

Store your private recipes, share favourites with a link, and discover community-made dishes — locally with email/password auth, or hosted on Fabric with SSO.

[Quick start](#quick-start) · [Features](#features) · [Architecture](#architecture) · [Deploy to Fabric](#deploy-to-fabric)

</div>

---

## Features

- **Discover** — Browse a curated catalogue of 100 chef-tested recipes from around the world.
- **Three visibility levels per recipe** — _private_ (default, owner only), _unlisted_ (anyone with the link), _public_ (discoverable by everyone).
- **Likes** — Authenticated users can favourite recipes; like counts and the list of likers are public on visible recipes.
- **Image uploads** — Drop a cover photo when creating or editing a recipe; images are stored in Rayfin Storage.
- **Auth that adapts** — Email + password locally, [Microsoft Fabric SSO](https://aka.ms/rayfin) when hosted in a Fabric workspace (popup _and_ embedded modes).
- **Idempotent seed** — One command imports the bundled `data/recipes.json` (and the matching cover images) into an empty database.

## Quick start

> [!NOTE]
> **Prerequisites**: Node.js 20+, Docker Desktop running, and a GitHub account with access to the `@microsoft/rayfin-*` packages on GitHub Packages.



### 2. Install dependencies

```bash
npm install
```

### 3. Start the Rayfin backend (Docker)

```bash
npm run rayfin:dev
```

The CLI prints the **API URL** and **publishable key** when it's ready. Re-run later with:

```bash
npm run rayfin:dev:status   # show URLs, ports, publishable key
npm run rayfin:dev:watch    # auto-apply schema changes on save
npm run rayfin:dev:down     # stop containers, keep data
npm run rayfin:dev:purge    # nuke containers AND data (clean slate)
```

### 4. Configure the frontend

Copy [.env.example](.env.example) to `.env` and paste the values printed by `rayfin dev`:

```env
VITE_RAYFIN_API_URL=http://localhost:5168
VITE_RAYFIN_PUBLISHABLE_KEY=pk-xxxxxxxxxxxxxxxxxxxx
```

### 5. Apply the storage configuration

Storage folders aren't auto-applied by `rayfin dev`. Run this once after the backend starts (and after any change to `rayfin/storage/`):

```bash
npm run rayfin:storage
```

### 6. Seed the catalogue (first run only)

```bash
npm run seed
```

The seed script signs up a `chef@contoso.local` demo user, then imports every recipe in [data/recipes.json](data/recipes.json) and uploads the matching JPG from [data/images/](data/images/). It's safe to re-run — already-seeded recipes are skipped by their `slug`.

### 7. Start the frontend

```bash
npm run dev
```

Open <http://localhost:5173>. Sign in as `chef@contoso.local` / `ChefDemo!2026` to edit the seeded recipes, or create a new account to start your own collection.

## How the seed works

[scripts/seed.ts](scripts/seed.ts) is a small Node script (run with `tsx`) that talks to the Rayfin backend over the public SDK — exactly like the frontend does — using the publishable key in `.env`.

```text
recipes.json (100 entries)        data/images/<slug>.jpg
        │                                  │
        ▼                                  ▼
   for each entry:
        ├─ ensure demo user is signed in (signUp + signIn)
        ├─ look up Recipe by slug
        │     └─ create if missing
        ├─ verify cover blob is downloadable
        │     └─ delete + re-upload (anonymous client) if missing or corrupt
        └─ patch Recipe.imageKey + imageAlt
```

Key behaviours:

- **Idempotent.** Re-running is always safe — recipes are matched by `slug`, never duplicated.
- **Self-healing for images.** Each run actively probes `RecipeImage.download(...)` for the recipe's cover. If the bytes are missing (e.g. the Azurite volume was reset), the script deletes the stale metadata row and re-uploads. So if you ever see "image download failed" warnings in the browser console, just re-run `npm run seed`.
- **Anonymous uploads.** Rayfin storage scopes blobs by uploader, so the seed (and the React app) upload via an _unauthenticated_ client; the publishable key alone is enough. This makes covers readable by every visitor.
- **Demo user.** Login is `chef@contoso.local` / `ChefDemo!2026`. Override with `SEED_USER_EMAIL` / `SEED_USER_PASSWORD` / `SEED_USER_NAME` env vars if you want a different demo identity.

### Updating the base recipes

To change the seed dataset (add new recipes, fix typos, swap an image…):

1. **Edit [data/recipes.json](data/recipes.json)** — keep each recipe's `id` (the slug) stable; that's the dedup key. Validate the file against [data/recipe-dataset.schema.json](data/recipe-dataset.schema.json) if your editor supports JSON Schema.
2. **Drop or replace cover images in [data/images/](data/images/)** — file names must match the `image.url` field in `recipes.json` (e.g. `images/amaretti-cookies.jpg` ↔ `data/images/amaretti-cookies.jpg`).
3. **Run `npm run seed` again.**

What happens for each kind of change:

| Change | Effect on a re-run |
|---|---|
| New recipe (new slug) | Inserted as a new row, image uploaded |
| Edited image file (same slug) | Cover blob is re-uploaded; the new image takes effect immediately |
| Edited fields (name, ingredients, steps, …) | **Not** updated by the seed (recipes already in the DB are skipped). To pick up edits, either delete the row through the UI / `rayfin dev --purge` and re-seed, or extend the script to call `Recipe.update(...)` on existing rows |
| Removed slug | Existing row is left in the database — clean it up manually if you want it gone |

The simplest reset is `npm run rayfin:dev:purge` followed by `npm run rayfin:dev`, `npm run rayfin:storage`, and `npm run seed`. The whole reset takes under a minute.

## Architecture

```
contoso-chef/
├── rayfin/                      Backend (Rayfin code-first definitions)
│   ├── data/
│   │   ├── Recipe.ts            @entity – recipe with visibility + ownership policies
│   │   ├── Like.ts              @entity – per-user favorite, anonymous-readable
│   │   └── schema.ts            AppSchema map for type-safe RayfinClient
│   ├── storage/
│   │   ├── RecipeImage.ts       @blob folder for cover images
│   │   └── schema.ts            AppStorageSchema map
│   ├── rayfin.yml               Backend config (auth, data, storage, static hosting)
│   └── .env                     Backend env vars (interpolated into rayfin.yml)
├── src/                         Frontend (React + Vite + TypeScript)
│   ├── client.ts                Single ExtendableRayfinClient instance
│   ├── fabricAuth.ts            Embedded + popup Fabric SSO helpers
│   ├── lib/
│   │   ├── recipes.ts           Recipe queries & mutations
│   │   ├── likes.ts             Like queries + toggle helper
│   │   ├── image.ts             Storage download + cached object URLs
│   │   └── types.ts             Frontend view types and JSON helpers
│   ├── components/              Layout, RecipeCard, RecipeForm, RequireAuth
│   └── pages/                   Home, RecipeDetail, NewRecipe, EditRecipe, MyRecipes, Liked, Login
├── data/                        Seed dataset
│   ├── recipes.json             100 recipes (matches recipe-dataset.schema.json)
│   └── images/                  Cover JPGs, one per recipe slug
├── scripts/
│   ├── seed.ts                  Idempotent dataset importer (Node, tsx)
│   └── generate_recipe_images.py  How the dataset images were originally generated
├── index.html · vite.config.ts · tsconfig*.json · package.json
└── .env.example                 Template for frontend env
```

### Data model

| Entity | Key fields | Permissions |
|---|---|---|
| `Recipe` | `id`, `slug`, `name`, `type`, `visibility`, `user_id`, `imageKey`, … | Anonymous _read_ when `visibility != private`. Authenticated _read/write_ when owner; can also _read_ non-private recipes from others. |
| `Like` | `id`, `user_id`, `recipe_id` | Anonymous _read_ (so like counts are public). Authenticated users can _create/delete_ only their own likes. |

Ingredients, steps, and allergens are stored as JSON-encoded strings on `Recipe`. This keeps the model flat (no parent/child policy juggling) while preserving the structured frontend types in [src/lib/types.ts](src/lib/types.ts).

Recipe ownership is enforced server-side by Rayfin row-level policies — the React client never adds a `user_id` filter to its queries.

### Visibility semantics

- **private** (default) — Only visible to the creator. Excluded from the discover list and direct-link reads for anyone else.
- **unlisted** — Reachable by anyone who has the recipe ID (functions as an unguessable share link), but excluded from the discover list. The discover page filters strictly to `visibility = public`.
- **public** — Surfaced on the discover page and readable by anonymous visitors.

## Deploy to Fabric

> [!IMPORTANT]
> Fabric deployment requires `services.data.dialect: mssql` (already set) and Fabric SSO. The same `rayfin.yml` keeps **both** auth modes enabled — locally the React app shows email/password, on Fabric it switches to Microsoft SSO automatically based on the build-time `VITE_FABRIC_*` env vars.

### 1. Sign in to Microsoft Fabric

```bash
npx rayfin login
# or for a specific tenant:
npx rayfin login --tenant <tenant-id>
```

### 2. Preview, then deploy

```bash
npx rayfin up --dry-run
npx rayfin up
# or target a specific workspace:
npx rayfin up --workspace-id <workspace-id>
```

`rayfin up` provisions/updates the Rayfin item, applies the schema, runs `npm run build:fabric` (which uses Vite mode `fabric` so the auto-generated `.env.fabric` is loaded), deploys the bundle, and finally writes/refreshes `.env.fabric` with the Fabric URLs and identifiers.

> [!NOTE]
> **First-time deploy**: on a brand new project, `.env.fabric` doesn't exist when the build runs, so the first build inlines the local URLs. Re-run `npx rayfin up` once and the second build picks up the freshly-generated `.env.fabric` — the deployed app then knows it's on Fabric and shows "Continue with Microsoft Fabric" on the login page.

> [!WARNING]
> **Schema migrations that drop data** (e.g. changing a field's type, removing a column, tightening a constraint) are blocked by default with `Migration would result in data loss`. Re-run with `--force` to allow the destructive change:
>
> ```bash
> npx rayfin up --force
> ```
>
> For a sample / demo project this is fine. After a forced migration, re-seed the database with `npm run seed` (after pointing your local `.env` at the Fabric backend, see step 3).

To rebuild & redeploy the frontend only (after the schema is already applied):

```bash
npx rayfin up staticapp deploy
```

### 3. Seeding the deployed Fabric database

The deployed Fabric backend starts **empty**, but the app self-seeds on first authenticated visit:

1. Open the deployed URL — Discover shows an empty-state card asking you to sign in to populate the demo.
2. Sign in with Microsoft Fabric SSO.
3. Because the database is still empty, the React app loads `/seed/recipes.json` (bundled with the static app), uploads each cover image to Rayfin storage and creates 100 `Recipe` rows. A progress banner shows live status; the whole import takes ~30 seconds.
4. Subsequent visits skip the seed (idempotent: each run dedupes by slug, and a per-browser localStorage flag avoids re-checking).

The same flow works locally — `npm run dev` then sign in via the UI and the seed runs in the browser. The CLI `npm run seed` remains as a no-sign-in shortcut for local dev (it uses the email/password demo user), but it is not required.

> [!NOTE]
> The browser-side seed is implemented in [src/lib/seed.ts](src/lib/seed.ts) and the bundled assets are wired up by a small Vite plugin in [vite.config.ts](vite.config.ts) (serves `data/` at `/seed/*` in dev, copies to `dist/seed/` at build time). Recipes are created with `authorName: "Contoso Chef"` regardless of which user triggered the seed, so the catalogue looks consistent.

## Resources

- [Rayfin documentation](https://aka.ms/rayfin)
- [Microsoft Fabric](https://fabric.microsoft.com)
- [Recipe dataset schema](data/recipe-dataset.schema.json)
- [SPEC.md](SPEC.md) — original product brief

---

<div align="center">

Built with Rayfin · Sample for Microsoft Build 2026

</div>
