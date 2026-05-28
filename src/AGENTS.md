# AGENTS.md

This project ships agent context: skills under `.agents/skills/` (`rayfin`, `frontend-design`) and MCP servers in `.mcp.json` (`rayfin`). **Load them before writing code.** Use the `rayfin` skill for any backend/schema/auth/deploy work; use `frontend-design` when building or restyling UI.

## Project

**Contoso Chef** — a recipe-sharing sample app built with [Rayfin](https://aka.ms/rayfin) on Microsoft Fabric. React + Vite + TypeScript frontend, Rayfin code-first backend (entities, storage, RLS policies). Runs locally via Docker (`rayfin dev`) with email/password auth, deploys to Fabric (`rayfin up`) with Fabric SSO. See [README.md](README.md) for the full walkthrough and [SPEC.md](SPEC.md) for the original brief.

## Repo map

```
rayfin/                   Backend (Rayfin code-first definitions)
  data/                   @entity classes (Recipe, Like) + schema.ts
  storage/                @blob folders (RecipeImage) + schema.ts
  rayfin.yml              Backend config (auth, data, storage, static app)
  .env                    Backend env vars (interpolated into rayfin.yml)
src/                      Frontend (React 18 + Vite + TS)
  client.ts               Single ExtendableRayfinClient instance
  fabricAuth.ts           Embedded + popup Fabric SSO helpers
  lib/                    recipes, likes, image, seed, types
  components/             Layout, RecipeCard, RecipeForm, RequireAuth
  pages/                  Home, RecipeDetail, New/Edit, MyRecipes, Liked, Login
  hooks/                  React hooks
data/                     Seed dataset (recipes.json + images/*.jpg)
scripts/seed.ts           Idempotent CLI seeder (tsx)
public/, index.html, vite.config.ts, tsconfig*.json
```

## Data model

| Entity | Notes |
|---|---|
| `Recipe` | `slug` is the dedup key. `visibility`: `private` (owner only, default) / `unlisted` (link-only) / `public` (discoverable). Ingredients/steps/allergens stored as JSON strings. RLS enforced server-side — never add `user_id` filters client-side. |
| `Like` | Per-user favorite. Anonymous-readable (public like counts). Authenticated users can only create/delete their own. |

Cover images live in the `RecipeImage` blob folder. Uploads use an **anonymous** client (publishable key only) so blobs are readable by every visitor.

## Build / dev / lint commands

| Command | What it does |
|---|---|
| `npm install` | Install deps (requires GitHub Packages auth — run `./setup-npm-auth.sh` first) |
| `npm run rayfin:dev` | Start backend (Docker). Prints API URL + publishable key |
| `npm run rayfin:dev:watch` | Auto-apply schema changes on save |
| `npm run rayfin:dev:status` / `:down` / `:purge` | Show status / stop / nuke data |
| `npm run rayfin:storage` | Apply `rayfin/storage/` config (run once after `rayfin dev`, and after any storage change) |
| `npm run seed` | CLI seed via `tsx scripts/seed.ts` (uses demo user `chef@contoso.local`) |
| `npm run dev` | Vite dev server (port 5173). `predev` regenerates `.env` via `rayfin env --framework vite` |
| `npm run build` | `tsc -b && vite build` |
| `npm run build:fabric` | Vite build in `fabric` mode (loads `.env.fabric`) |
| `npm run lint` | `tsc -b --noEmit` — this is the only lint/typecheck. **There are no unit tests.** |
| `npx rayfin up` | Deploy to Fabric (provisions item, applies schema, builds, deploys) |
| `npx rayfin up staticapp deploy` | Redeploy frontend only |

Run `npm run lint` after any TS change. Verify backend schema changes with `rayfin dev watch` or `rayfin dev db apply`.

## Conventions

- **Frontend never filters by `user_id`** — row-level policies do that on the backend.
- **Seed is idempotent** by `slug`. Don't change a recipe's slug. Frontend seed (`src/lib/seed.ts`) and CLI seed (`scripts/seed.ts`) both dedupe and self-heal missing image blobs.
- **Two seed paths**: CLI for local dev (`npm run seed`), in-browser self-seed on first authenticated visit for deployed Fabric backends. Both create recipes with `authorName: "Contoso Chef"`.
- **Auth adapts at runtime**: email/password locally, Fabric SSO when `VITE_FABRIC_*` env vars are present (auto-written by `rayfin up` into `.env.fabric`). Same `rayfin.yml` supports both.
- **Storage uploads use the anonymous client** (publishable key only) so covers are publicly readable.
- **Visibility**: Discover page filters strictly to `visibility = public`. `unlisted` is reachable only by direct ID.
- **No new tooling** (lint/test/format) unless explicitly requested.
- TypeScript strict, ESM (`"type": "module"`), React function components + hooks, React Router v6.

## Project-specific rules

- Never commit `.env`, `.env.fabric`, or anything under `rayfin/.env`.
- Schema migrations that drop data require `npx rayfin up --force` — only run after confirming with the user.
- When modifying `rayfin/storage/`, remind the user to run `npm run rayfin:storage` (not auto-applied by `rayfin dev`).
- Don't add a `user_id` filter on the client — RLS handles it. Adding one will hide records the user is legitimately allowed to see (e.g. public recipes from other authors).
- For any Rayfin API question (decorators, client methods, schema, deploy), consult the `rayfin` skill / MCP server rather than guessing.
