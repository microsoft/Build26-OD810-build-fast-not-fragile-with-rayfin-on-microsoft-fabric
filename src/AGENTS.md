# AGENTS.md

This project ships agent context: skills under `.agents/skills/` (`rayfin`, `frontend-design`) and MCP servers in `.mcp.json` (`rayfin`). **Load them before writing code.** Use the `rayfin` skill for any backend/schema/auth/deploy work; use `frontend-design` when building or restyling UI.

## Project

**Contoso Chef** — a recipe-sharing sample app built with [Rayfin](https://aka.ms/rayfin) on Microsoft Fabric. React + Vite + TypeScript frontend, Rayfin code-first backend (entities, storage, RLS policies). The backend is hosted on Microsoft Fabric — there is no local backend; `npm run dev` points the Vite dev server at the deployed Fabric backend. Auth is Microsoft Fabric SSO (Entra ID). See [README.md](README.md) for the full walkthrough and [SPEC.md](SPEC.md) for the original brief.

## Repo map

```
rayfin/                   Backend (Rayfin code-first definitions)
  data/                   @entity classes (Recipe, Like, Comment) + schema.ts
  storage/                @blob folders (RecipeImage) + schema.ts
  rayfin.yml              Backend config (auth, data, storage, static app)
  .env                    Backend env vars (interpolated into rayfin.yml)
src/                      Frontend (React 18 + Vite + TS)
  client.ts               Single RayfinClient instance
  fabricAuth.ts           Embedded + popup Fabric SSO helpers
  lib/                    recipes, likes, comments, image, storage, seed, types
  components/             Layout, RecipeCard, RecipeForm, RequireAuth
  pages/                  Home, RecipeDetail, New/Edit, MyRecipes, Liked, Login, Reset
  hooks/                  React hooks
data/                     Seed dataset (recipes.json + images/*.jpg)
public/, index.html, vite.config.ts, tsconfig*.json
```

## Data model

| Entity | Notes |
|---|---|
| `Recipe` | `slug` is the dedup key. `visibility`: `private` (owner only, default) / `unlisted` (link-only) / `public` (discoverable). Ingredients/steps/allergens stored as JSON strings. RLS enforced server-side — never add `user_id` filters client-side. |
| `Like` | Per-user favorite. Any signed-in user can read all likes (so the UI can show like counts); only the like's owner can create or delete it. |
| `Comment` | Per-user comment on a recipe. Authenticated read on visible recipes. Authors can create; recipe owners and comment authors can delete. |

Cover images live in the `RecipeImage` blob folder. Uploads go through the signed-in `apiClient` (see [src/lib/storage.ts](src/lib/storage.ts)); blobs are readable by every signed-in visitor.

## Build / dev / lint commands

| Command | What it does |
|---|---|
| `npm install` | Install deps |
| `npx rayfin login` | Sign in to Microsoft Fabric (Entra ID) |
| `npx rayfin up` | Deploy the app: provisions the Fabric item, applies schema, builds, deploys, writes `.env.fabric` |
| `npx rayfin up status` | Check deployment health + print hosting URL |
| `npx rayfin up staticapp deploy` | Redeploy the frontend only (schema unchanged) |
| `npx rayfin up db apply` | Apply schema-only (no static rebuild) |
| `npx rayfin up --force` | Allow destructive schema migrations |
| `npm run dev` | Vite dev server (port 5173). `predev` regenerates `.env` from `.env.fabric` via `rayfin env --framework vite` |
| `npm run build` | `tsc -b && vite build` |
| `npm run build:fabric` | Vite build in `fabric` mode (loads `.env.fabric`) — used by `rayfin up` |
| `npm run lint` | `tsc -b --noEmit` — this is the only lint/typecheck. **There are no unit tests.** |

Run `npm run lint` after any TS change. For backend schema changes, re-run `npx rayfin up` (or `npx rayfin up db apply` to skip the static rebuild) and verify with `npx rayfin up status`.

## Conventions

- **Frontend never filters by `user_id`** — row-level policies do that on the backend. Adding a client-side `user_id` filter will hide records the user is legitimately allowed to see (e.g. public recipes from other authors).
- **Single seed path.** The app self-seeds in the browser on the first authenticated visit to an empty database ([src/lib/seed.ts](src/lib/seed.ts)). The `/reset` admin page (authenticated only) deletes everything the RLS policy lets you delete and triggers a re-seed on the next visit. Recipes are created with `authorName: "Contoso Chef"` regardless of which user triggers the seed.
- **Seed is idempotent** by `slug`. Don't change a recipe's slug.
- **Auth is Microsoft Fabric SSO only.** Email/password is not enabled. `signInWithFabric` (popup) is used in local dev (`npm run dev`) and in standalone-hosted mode; `initEmbeddedAuth` runs automatically when the app is loaded inside the Fabric Portal.
- **Storage uploads use the signed-in `apiClient`** (see [src/lib/storage.ts](src/lib/storage.ts)) so blobs are readable by every signed-in visitor.
- **Visibility**: Discover page filters strictly to `visibility = public`. `unlisted` is reachable only by direct ID.
- **No new tooling** (lint/test/format) unless explicitly requested.
- TypeScript strict, ESM (`"type": "module"`), React function components + hooks, React Router v6.

## Project-specific rules

- Never commit `.env`, `.env.fabric`, or anything under `rayfin/.env`.
- Schema migrations that drop data require `npx rayfin up --force` — only run after confirming with the user.
- Anonymous data access to Fabric sources is **not supported** at release. Don't add features that assume an unauthenticated visitor can read data — sign-in is required for every visitor.
- Don't add a `user_id` filter on the client — RLS handles it.
- For any Rayfin API question (decorators, client methods, schema, deploy), consult the `rayfin` skill / MCP server rather than guessing.
