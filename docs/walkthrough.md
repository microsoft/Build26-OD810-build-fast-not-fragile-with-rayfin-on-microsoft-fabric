# OD810 — Session walkthrough

A written companion to the on-demand session **Build fast, not fragile on Microsoft Fabric**, presented at Microsoft Build 2026 by Yohan Lasorsa ([@sinedied](https://github.com/sinedied)).

The session is demo-heavy and split into five demos around a single sample app — **Contoso Chef**, a recipe-sharing app — that lives in [`/src/`](../src). This document walks through the same beats so you can revisit the story, follow up on a specific demo, or recreate it yourself.

> 💡 If you want to **run the app**, head straight to the [Contoso Chef README](../src/README.md) — it covers deploying to Microsoft Fabric with `rayfin up`.

---

## The setup: prototyping has changed, production hasn't

Coding agents have shrunk the gap between an idea and a working app from months to minutes. More people — including non-developers — can take a real shot at building the app they imagined.

The risk is treating the first working demo as the production foundation. Industry research (IDC, Everest Group, RAND) repeatedly shows that **~80–90% of AI-generated prototypes and AI pilots never reach production**. Vibe-coded apps face the same risk: they start as demos and only later try to add identity, governance, security, deployment, and analytics-ready data.

Because while development speed has accelerated, the **production bar hasn't moved**:

| Pillar | What it still takes |
|---|---|
| **Identity** | Users, roles, permissions, access policies |
| **Data integrity** | Typed schemas, migrations, safe data boundaries |
| **Governance** | Lineage, compliance, policies, ownership |
| **Security** | Scanning, fixes, secrets, continuous review |
| **Deployment** | Hosting, scale, environments, observability |
| **Analytics** | Queryable, governed, AI-ready data |

The shift: agents make idea → prototype easy. The real gap is now prototype → production.

## Apps on Fabric, with Rayfin

[Rayfin](https://aka.ms/rayfin) is a managed backend-as-a-service for building enterprise apps, built on top of Microsoft Fabric. It bundles the primitives a web app needs — **database, auth, hosting, functions, storage, real-time** — into one code-first platform.

What makes it different from a generic BaaS is that it was built to be **enterprise-ready and Fabric-native from day one**. Everything you already get from Fabric — security, governance, compliance, and integration with your Fabric data estate — is automatic:

- **Enterprise security** — Microsoft Entra ID, RBAC, conditional access
- **Unified analytics** — BI, AI, and data in one platform
- **Elastic scale** — serverless, auto-scaling compute
- **Governance** — Purview lineage and compliance
- **Native integration** — OneLake, Power BI, Data Warehouse
- **AI-ready** — built-in ML and Copilot capabilities

It was also designed from the start with coding agents in mind, so vibe-coded apps inherit all of this without extra work.

---

## Demo agenda

| # | Demo | Theme |
|---|---|---|
| 1 | Bootstrap with a coding agent | From a spec to a running app in one prompt |
| 2 | Secure access | Identity and access control are part of the foundation |
| 3 | Protect data integrity | Safe schema evolution as the app changes |
| 4 | Deploy to production | One command from local to Fabric — same app, same behaviour |
| 5 | Unlock analytics and intelligence | Turn app data into a dashboard with Rayfin Analytics Apps |

---

## Demo 1 — Bootstrap with a coding agent

**Goal:** show that the platform is designed for developers _and_ agents, and that the agent doesn't have to invent enterprise architecture from scratch.

The app, **Contoso Chef**, comes from a real-world itch: keeping a family's Italian recipes alive across generations — with the hard requirement that family secrets stay secret. The brief is captured in [`src/SPEC.md`](../src/SPEC.md).

What you see on screen:

1. Bootstrap a new Rayfin project from one command:
   ```bash
   npm create @microsoft/rayfin@latest
   ```
2. Point a coding agent at `SPEC.md` and let it implement the app. The agent loads the **Rayfin skill** ([`src/.agents/skills/rayfin/SKILL.md`](../src/.agents/skills/rayfin/SKILL.md)) and the **Rayfin MCP server** (configured in `.mcp.json`) before writing code, so it knows the platform's conventions for entities, row-level security (RLS) policies, storage, and auth.

   > **RLS (row-level security)** is a database feature that filters which rows a given user is allowed to read or write — enforced inside the data layer, so the rules apply no matter which client, query, or API hits the database.
3. Provision the backend in Fabric and link the app:
   ```bash
   npx rayfin up --workspace-uri <fabric-workspace-uri>
   ```
4. Run the app locally (*Note: may be experimental at the time of release*):
   ```bash
   npm run dev
   ```
5. Tour the generated code:
   - [`src/rayfin/rayfin.yml`](../src/rayfin/rayfin.yml) — backend config (auth, data, storage, static app)
   - [`src/rayfin/data/`](../src/rayfin/data) — `@entity` classes for `Recipe`, `Like`, `Comment` and the `schema.ts` map used by the typed client
   - [`src/rayfin/storage/`](../src/rayfin/storage) — `@blob` folder for `RecipeImage`

**Why this matters:** the agent didn't have to invent how auth should work, how the database should be exposed, or how APIs should be shaped. It focused on the app experience while the platform handled the foundation.

## Demo 2 — Secure access

**Goal:** prove that identity and access control are part of the app foundation, not bolted on later. This is the moment most prototypes start a rewrite — Contoso Chef doesn't.

The recipe model supports three visibility levels:

- **private** _(default)_ — only the owner can see it. Family-secret-safe.
- **unlisted** — reachable by anyone with the direct link, but excluded from the public discover list. Useful for sharing with friends.
- **public** — discoverable by everyone.

What you see on screen:

1. Open the app in a private window — you can't see a recipe created by the signed-in user.
2. Edit the recipe's visibility to **unlisted** and share the link. The private window now opens the recipe.
3. Walk through the visibility rules in [`src/rayfin/data/Recipe.ts`](../src/rayfin/data/Recipe.ts) — RLS is enforced server-side, and the React frontend never adds `user_id` filters to its queries.

> **⚠️ Important — anonymous access at release.**
> Anonymous data access to Fabric sources is **not supported** for Fabric apps at release. A tenant setting for administrators to enable it will be available later. Until then, the `unlisted` and `public` flows shown above require an authenticated user — the visibility rules still apply, but every visitor needs to be signed in.

**Why this matters:** Identity and access control rules live with the data model, in code, governed by Rayfin's RLS. The MVP keeps things simple with three levels, but you can imagine sharing with specific authenticated users or groups using the same primitives.

## Demo 3 — Protect data integrity

**Goal:** show that the app can evolve safely after launch. Production apps change — safe schema evolution matters more than getting the first happy path right.

The feature: add **comments** to recipes.

What you see on screen:

1. Ask the coding agent to "implement the comment feature in SPEC.md". The agent adds a `Comment` entity, wires it into the frontend, and updates the typed client.
2. Apply the migration against the backend:
   ```bash
   npx rayfin up db apply
   ```
   (Or `npx rayfin up` to apply schema + redeploy the app together.)
3. Open a public recipe and add a comment. Open the same recipe in a private window — comments are visible, but commenting requires sign-in.

In the shipped repo you can see the result in [`src/rayfin/data/Comment.ts`](../src/rayfin/data/Comment.ts) and the comment UI on the recipe detail page.

> [!WARNING]
> Schema migrations that would drop or coerce existing data are **blocked by default** with `Migration would result in data loss`. Re-run with `npx rayfin up --force` to allow the destructive change after confirming it's safe.

**Why this matters:** Apps change after launch. Safe migrations and generated typed clients catch the breakage before it reaches production data.

## Demo 4 — Deploy to production

**Goal:** answer the question "what does it take to put this app into production?" — and reveal it's already there.

The `npx rayfin up` command you ran in Demo 1 didn't just create the backend. It deployed the app:

- Provisioned the Rayfin item in your Fabric workspace
- Applied the schema
- Built the frontend with `npm run build:fabric` (Vite mode `fabric`, which loads the auto-generated `.env.fabric`)
- Deployed the static app to Fabric hosting
- Refreshed `.env.fabric` with the Fabric URLs so subsequent local builds know they're Fabric-aware

What you see on screen:

1. Open the Fabric portal — the Rayfin item is there, with the app reachable from a Fabric-hosted URL.
2. Open the deployed app — sign in with **Microsoft Fabric SSO** and you land on the same UI you've been iterating on, populated with the recipes you seeded.
3. The single auth path is wired through `services.auth.fabric.enabled: true` in `rayfin.yml`. When loaded inside the Fabric portal, the React app uses embedded SSO; opened standalone or from `npm run dev`, it falls back to a popup sign-in — same identity, same code path.

**Why this matters:** moving from dev to production should be boring. Same foundation, same code path, no rewrite at the identity layer.

## Demo 5 — Unlock analytics and intelligence

**Goal:** show what happens when the data your app creates lives natively in Fabric.

[Rayfin **Analytics Apps**](https://aka.ms/rayfin) (public preview) extend Rayfin from "build an app" to "build a dashboard on the same data". Currently they offer:

- Seamless support for **Fabric semantic models** — data the Contoso Chef app produces is immediately queryable for analytics
- A robust visual stack with an **enterprise-grade design skill** for AI agents, so a coding agent can turn raw data into polished, readable visuals
- _Coming soon:_ built-in signal detection, and tighter integration with custom actions triggered by data

What you see on screen:

A Copilot-built dashboard on top of the Contoso Chef semantic model — popular recipes, ingredient trends, comment activity. Built from a single prompt pointing the agent at the Fabric workspace and semantic model, in minutes.

**Why this matters:** you're not building an app and then hand-rolling a data integration project to extract value from it. The data starts where the business wants it to end up: governed, queryable, and AI-ready.

---

## Recap — vibe-coding with guardrails

Yes, this app was vibe-coded. The trick is that the agent didn't have to figure out everything on its own. It had:

- **Primitives** — auth, database, GraphQL APIs, functions, storage already in place
- **Lifecycle** — automatic schema migrations, one-command deployment
- **Agent-native context** — a `SKILL.md`, an MCP server, GitHub Copilot starter prompts, CLI commands
- **Templates** — enterprise-ready starting points

So the agent focused on the app experience while the platform handled the rest. That's the difference between a fast prototype and a fast _production-ready_ app.

## Build fast. Start production-ready.

| | |
|---|---|
| 🚀 **Build fast** | Coding agents move at full speed inside platform guardrails |
| 🛡 **Hardened platform** | Identity, data, security, and deployment are part of the foundation, not bolted on |
| 🧩 **Fabric-native** | Start where analytics and AI need the data to end up |

## Next steps

- **Try the app yourself** — clone this repo and follow the [Contoso Chef README](../src/README.md) for local setup and Fabric deployment.
- **Explore Rayfin** — [aka.ms/rayfin](https://aka.ms/rayfin)
- **Learn Microsoft Fabric** — [learn.microsoft.com/fabric](https://learn.microsoft.com/fabric/)
- **Connect identity** — [Microsoft Entra ID documentation](https://learn.microsoft.com/entra/identity/)
- **Continue with Copilot** — see the **💬 Keep Learning with Copilot** section in the [root README](../README.md) for follow-up prompts.
