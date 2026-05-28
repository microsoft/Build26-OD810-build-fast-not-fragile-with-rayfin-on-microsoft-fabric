<div align="center">

<img src="public/favicon.svg" width="56" alt="Contoso Chef logo" />

# Contoso Chef

**A recipe-sharing sample app built with [Rayfin](https://aka.ms/rayfin) on Microsoft Fabric.**

Store your private recipes, share favourites with a link, and discover community-made dishes — all running on a Fabric-hosted backend with Microsoft SSO.

[Quick start](#quick-start) · [Features](#features) · [Architecture](#architecture) · [Deploy & redeploy](#deploy--redeploy)

</div>

---

## Features

- **Discover** — Browse a curated catalogue of 100 chef-tested recipes from around the world.
- **Three visibility levels per recipe** — _private_ (default, owner only), _unlisted_ (anyone with the link), _public_ (discoverable by everyone).
- **Likes** — Authenticated users can favourite recipes; like counts and the list of likers are public on visible recipes.
- **Comments** — Authenticated users can comment on any recipe they can see; the recipe owner can moderate.
- **Image uploads** — Drop a cover photo when creating or editing a recipe; images are stored in Rayfin Storage.
- **Microsoft Fabric SSO** — Single sign-on via Entra ID, both as a standalone web app and embedded inside the Fabric Portal.
- **Self-seeding catalogue** — On the first authenticated visit, the app imports `data/recipes.json` (with cover images) into the empty database. Re-runs are idempotent.

## Quick start

> [!NOTE]
> **Prerequisites**: Node.js 20+ and access to a Microsoft Fabric workspace where you can create an app.

### 1. Install dependencies

```bash
npm install
```

### 2. Sign in to Microsoft Fabric

```bash
npx rayfin login
# or pin to a specific tenant:
npx rayfin login --tenant <tenant-id>
```

### 3. Deploy the backend and the app

```bash
npx rayfin up
# or target a specific workspace:
npx rayfin up --workspace-id <workspace-id>
```

`rayfin up` provisions a Rayfin item in your Fabric workspace, applies the schema, builds the Vite frontend (`npm run build:fabric`), deploys the static bundle, and writes the live URLs + publishable key into `.env.fabric`.

When it's done, `rayfin up status` prints the hosting URL — open it in a browser, sign in with Microsoft Fabric, and the app self-seeds the recipe catalogue on first visit (see [How the seed works](#how-the-seed-works)).

> [!IMPORTANT]
> **Anonymous access at release.** Anonymous data access to Fabric sources is **not supported** for Fabric apps at release. A tenant setting for administrators to enable it will be available later. This sample uses preview-only anonymous read on `Recipe`, `Like`, `Comment`, and `RecipeImage` to keep the demo flow open to unauthenticated visitors — production apps deployed at GA will need that tenant setting enabled before the same flow works.

### 4. Local development against the deployed backend

```bash
npm run dev
```

`predev` regenerates `.env` from `.env.fabric` via `rayfin env --framework vite`, so the Vite dev server (port 5173) talks to the same Fabric backend as the deployed site. Sign in with Microsoft Fabric in the popup that appears.

## How the seed works

The first time an authenticated user visits the app while the database is empty, [src/lib/seed.ts](src/lib/seed.ts) loads `/seed/recipes.json` (bundled with the static app via a small Vite plugin in [vite.config.ts](vite.config.ts) — it serves `data/` at `/seed/*` in dev and copies to `dist/seed/` at build time), uploads each cover image to Rayfin Storage, and creates 100 `Recipe` rows. A progress banner shows live status; the whole import takes ~30 seconds.

Key behaviours:

- **Idempotent.** Recipes are matched by `slug` — re-running never creates duplicates.
- **Self-healing for images.** Each run probes `RecipeImage.download(...)` for every recipe's cover. If the bytes are missing, the stale metadata row is deleted and the image is re-uploaded.
- **Anonymous uploads.** Storage scopes blobs by uploader, so seed (and the React app) upload via an unauthenticated storage client — the publishable key alone is enough — so covers are readable by every visitor.
- **Consistent attribution.** Recipes are created with `authorName: "Contoso Chef"` regardless of who triggered the seed.
- **One-time guard.** A per-browser `localStorage` flag skips the empty-database probe on subsequent visits.

### Resetting the catalogue

Navigate to **`/reset`** while signed in. The hidden admin page wipes every recipe (and likes) the RLS policy lets you delete, clears the seed flag, and sends you back to home — where the auto-seed runs again on the next load.

### Updating the base recipes

1. **Edit [data/recipes.json](data/recipes.json)** — keep each recipe's `id` (the slug) stable; that's the dedup key. Validate against [data/recipe-dataset.schema.json](data/recipe-dataset.schema.json) if your editor supports JSON Schema.
2. **Drop or replace cover images in [data/images/](data/images/)** — file names must match the `image.url` field (e.g. `images/amaretti-cookies.jpg` ↔ `data/images/amaretti-cookies.jpg`).
3. **Run `/reset`** (or just delete the affected rows in the UI) to trigger a fresh seed on the next visit.

What happens for each kind of change:

| Change | Effect on the next seed |
|---|---|
| New recipe (new slug) | Inserted as a new row, image uploaded |
| Edited image file (same slug) | Cover blob is re-uploaded; the new image takes effect immediately |
| Edited fields (name, ingredients, steps, …) | **Not** updated automatically — already-seeded rows are skipped. Delete the row through the UI or `/reset` to pick up the edits |
| Removed slug | Existing row is left in the database — clean it up manually if you want it gone |

## Architecture

```
contoso-chef/
├── rayfin/                      Backend (Rayfin code-first definitions)
│   ├── data/
│   │   ├── Recipe.ts            @entity – recipe with visibility + ownership policies
│   │   ├── Like.ts              @entity – per-user favorite
│   │   ├── Comment.ts           @entity – per-user comment, owner-moderated
│   │   └── schema.ts            AppSchema map for type-safe RayfinClient
│   ├── storage/
│   │   ├── RecipeImage.ts       @blob folder for cover images
│   │   └── schema.ts            AppStorageSchema map
│   ├── rayfin.yml               Backend config (auth, data, storage, static hosting)
│   └── .env                     Backend env vars (interpolated into rayfin.yml)
├── src/                         Frontend (React + Vite + TypeScript)
│   ├── client.ts                Single RayfinClient instance
│   ├── fabricAuth.ts            Embedded + popup Fabric SSO helpers
│   ├── lib/
│   │   ├── recipes.ts           Recipe queries & mutations
│   │   ├── likes.ts             Like queries + toggle helper
│   │   ├── comments.ts          Comment queries & mutations
│   │   ├── image.ts             Storage download + cached object URLs
│   │   ├── storage.ts           Storage upload helper
│   │   ├── seed.ts              Browser-side self-seed
│   │   └── types.ts             Frontend view types and JSON helpers
│   ├── components/              Layout, RecipeCard, RecipeForm, RequireAuth
│   └── pages/                   Home, RecipeDetail, NewRecipe, EditRecipe, MyRecipes, Liked, Login, Reset
├── data/                        Seed dataset
│   ├── recipes.json             100 recipes (matches recipe-dataset.schema.json)
│   └── images/                  Cover JPGs, one per recipe slug
├── index.html · vite.config.ts · tsconfig*.json · package.json
└── .env.fabric                  Auto-generated by `rayfin up` (Fabric URLs + publishable key)
```

### Data model

| Entity | Key fields | Permissions |
|---|---|---|
| `Recipe` | `id`, `slug`, `name`, `type`, `visibility`, `user_id`, `imageKey`, … | Authenticated _read_ when `visibility != private` or the user is the owner. Authenticated _write_ only by the owner. |
| `Like` | `id`, `user_id`, `recipe_id` | Authenticated _read_ on visible recipes. Users can _create/delete_ only their own likes. |
| `Comment` | `id`, `user_id`, `recipe_id`, `body`, `createdAt` | Authenticated _read_ on visible recipes. Authors can _create_ on any visible recipe; recipe owners and comment authors can _delete_. |

Ingredients, steps, and allergens are stored as JSON-encoded strings on `Recipe`. This keeps the model flat (no parent/child policy juggling) while preserving the structured frontend types in [src/lib/types.ts](src/lib/types.ts).

Recipe ownership is enforced server-side by Rayfin row-level policies — **the React client never adds a `user_id` filter to its queries**.

### Visibility semantics

- **private** (default) — Only visible to the creator. Excluded from the discover list and direct-link reads for anyone else.
- **unlisted** — Reachable by anyone who has the recipe ID (functions as an unguessable share link), but excluded from the discover list. The discover page filters strictly to `visibility = public`.
- **public** — Surfaced on the discover page and readable by every signed-in visitor.

## Deploy & redeploy

```bash
npx rayfin up                       # Full deploy: schema + build + static
npx rayfin up --dry-run             # Preview what would change
npx rayfin up staticapp deploy      # Frontend only (schema unchanged)
npx rayfin up db apply              # Schema only (no static rebuild)
npx rayfin up status                # Endpoint health + URLs
```

> [!WARNING]
> **Schema migrations that drop data** (e.g. changing a field's type, removing a column, tightening a constraint) are blocked by default with `Migration would result in data loss`. Re-run with `--force` to allow the destructive change:
>
> ```bash
> npx rayfin up --force
> ```

## Resources

- [Rayfin documentation](https://aka.ms/rayfin)
- [Microsoft Fabric](https://fabric.microsoft.com)
- [Recipe dataset schema](data/recipe-dataset.schema.json)
- [SPEC.md](SPEC.md) — original product brief

---

<div align="center">

Built with Rayfin · Sample for Microsoft Build 2026

</div>
