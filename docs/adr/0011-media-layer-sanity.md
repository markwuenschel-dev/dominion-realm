# Media moves to a hosted store (Sanity), decoupled from git and deploys

Images — both the files *and* their associations to entities — move **out of git**
into **Sanity**, a hosted headless CMS used purely as the media layer, delivered
through Sanity's image CDN. Prose stays exactly where it is: git Markdown edited
via Keystatic. An author uploads a picture in Sanity's browser Studio and it goes
live in seconds, with **no commit and no redeploy**.

> **Hosting note (2026-07-09):** "Railway" references below are historical — the site
> now runs on **AWS EC2** (Docker + Caddy), per [ADR-0012](0012-host-on-aws-ec2.md).
> Set any env var this ADR says to put "in Railway" in the EC2 deploy env file
> `env/dominion-realm.env` instead. The media-layer design is otherwise unchanged.

This is a **scoped reversal** of [ADR-0002](0002-content-collections.md) and
[ADR-0009](0009-cms-keystatic.md), which kept *all* content in git and rejected a
hosted CMS. The rejection still holds for **prose** (canon lives in git with
reveal-gating and search indexing, tied to the Realmwalkers repo). It no longer
holds for **media**, because the picture workload outgrew the git model on four
fronts at once: hand-edited paths broke (casing bugs), every change forced a full
redeploy, the browser editor wasn't usable, and one image per entity was too few.

Status: accepted. Amends ADR-0002 and ADR-0009 for the media slice only.

## The decision, in parts

- **Boundary.** Prose = git/Keystatic. Media (binaries + associations) = Sanity.
  The two halves are joined by **slug**, matched automatically by a sync so the
  author never types a slug (removing the class of casing bugs entirely).
- **Type-agnostic media.** Pictures attach to a generic **Subject** whose `kind`
  is an open label. Adding a new kind of thing (Item, Creature, Combat System, …)
  never requires new picture plumbing — the direct answer to "scalable for the
  entire universe."
- **Rich model per Subject.** A Primary image (focal-point auto-cropped
  everywhere), an ordered Gallery, kind-specific Type slots (Map/Sigil/Banner),
  and Scene art bound to chapters/timeline Events. Every Asset carries required
  alt text and optional artist credit. See [CONTEXT.md](../../CONTEXT.md#media).
- **Folded in:** per-page social/share (OG) images sourced from the Primary; the
  homepage book cover (previously a one-off in `public/covers/`) managed the same
  way as everything else; and a separate landscape `siteSettings.socialImage`
  for public default social cards. The social image is not the portrait cover:
  its role is a 1200×630 preview, with a static `public/og-default.png` fallback.
  V1 references Sanity CDN crops directly in metadata; a Next-generated branded
  card remains later polish.

## Considered and rejected

- **Stay in git (status quo, improved).** Rejected: cannot deliver "live in
  seconds without redeploy" — the author's chosen dream flow — because a git
  change always triggers a deploy.
- **Payload (self-hosted in the Next app + Postgres + object storage).** Full data
  ownership, one deploy. Rejected for now: more infrastructure to stand up and
  keep running than a solo author wants; Sanity reaches the same author experience
  with nothing to host.
- **Cloudinary (image CDN + tag/metadata).** Simplest infra, but has no real data
  model — galleries, roles, and scene links devolve into fragile tag conventions
  at universe scale.

## Consequences

- The author now has **two editors**: Keystatic (words) and Sanity Studio
  (pictures). The auto-sync keeps them from drifting.
- Media data lives on a SaaS. To keep ownership, an **automatic export** copies
  every Asset + label to storage the author controls (see backups task).
- Entity pages must render fresh media without a rebuild — resolved with
  on-demand revalidation driven by a Sanity change webhook (implementation detail,
  not fixed by this ADR).
- Sanity's free tier covers a solo universe at this scale; revisit if usage grows.
- **Forced a Next 15 → 16 upgrade.** Embedding the Studio at `/studio` needs
  React 19.2's `useEffectEvent`, which the whole Sanity Studio stack imports but
  Next 15.5's *bundled* precompiled React does not export (Next aliases the app's
  React to its own copy, so bumping the app's React alone doesn't help). Next 16
  bundles a React that exports it. Consequences of the bump, all handled: builds
  now use Turbopack (MDX plugins in `next.config.mjs` are passed as serializable
  string names); the removed `eslint` config key was dropped; `tsconfig.json`'s
  `jsx` is now `react-jsx`. The Studio's `sanity.config` import lives behind a
  `'use client'` wrapper (`src/app/studio/[[...tool]]/Studio.tsx`) so `sanity`
  never enters the RSC graph, where the `react-server` build also lacks the hook.

## Manual setup checklist (one-time, by the author)

The build cannot start until these are done. Secrets stay out of the repo (same
posture as ADR-0009).

1. **Create a Sanity account.** Go to [sanity.io](https://www.sanity.io) → sign up
   with **GitHub** or **Google** (use the account you already use).

2. **Create a project.** In the management console
   ([sanity.io/manage](https://www.sanity.io/manage)) → **Create new project**.
   Name it **Dominion Realm**. When it asks about a dataset, use the default named
   **`production`** and set its visibility to **Public** (the art is public anyway;
   this avoids needing a read token for the live site).

3. **Copy the Project ID.** On the project's page in the console, note the
   **Project ID** (a short string like `abcd1234`). This is **not** a secret —
   paste it back to Claude.

4. **Create a write token.** Project → **API** → **Tokens** → **Add API token** →
   permission **Editor**, name it **`media-sync`**. Copy it once (it won't show
   again). This **is** a secret — do **not** paste it in chat; you'll set it as an
   environment variable (Claude will tell you exactly where).

5. **Add CORS origins.** Project → **API** → **CORS origins** → **Add** both, with
   *Allow credentials* checked:
   - `http://localhost:3000` (local dev)
   - your Railway production URL (e.g. `https://your-site.up.railway.app`)

6. **Hand back to Claude:** the **Project ID** and confirmation the dataset is
   **`production`** / Public. Keep the **write token** for the env-var step.

Environment variables (Claude will finalize names during the build; expect roughly):

| Variable | Value | Where |
| --- | --- | --- |
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | the Project ID (non-secret) | Railway + local `.env` |
| `NEXT_PUBLIC_SANITY_DATASET` | `production` | Railway + local `.env` |
| `SANITY_API_WRITE_TOKEN` | the `media-sync` token (secret) | Railway + local `.env` |
| `SANITY_REVALIDATE_SECRET` | a random string (Claude generates) | Railway + Sanity webhook |
