# Browser-based authoring with Keystatic in GitHub storage mode

Content is authored through **Keystatic** in **GitHub storage mode** — a browser-based editor (at `/keystatic`) whose forms mirror the Content Collections schema ([ADR-0002](0002-content-collections.md)) and commit Markdown straight back to this repo via a GitHub App. The author keeps writing in plain `src/content/<collection>/*.md` files validated at build time, but no longer needs a local editor, Git, or YAML-by-hand to add a character, journal entry, or chapter.

Keystatic's admin UI and its `/api/keystatic/*` OAuth routes need a server, which collides with our static, free-hosting baseline. We resolve this with a **two-target split**, reusing the existing GitHub-Pages flag in `astro.config.mjs`:

- **GitHub Pages** stays **100% static** — no React, no `keystatic()` integration, no adapter, no admin. This is the live deploy and must never break.
- **Netlify** additionally loads `@astrojs/react`, `@keystatic/astro`, and the `@astrojs/netlify` adapter, so `/keystatic` and the OAuth API run as on-demand serverless functions. The public pages remain prerendered; only the two injected admin routes are `prerender: false`.

This **amends [ADR-0001](0001-static-site-third-party-services.md)**: the *public* site remains fully static on both targets, but the *admin* is now a small set of Netlify functions rather than a purely embedded third-party widget. ADR-0001's principle — zero-ops, zero-cost, durable — is preserved: the functions exist only on Netlify's free tier, GitHub Pages is unaffected, and content still lives as Git-versioned Markdown with no database.

It also relaxes [ADR-0008](0008-stack-astro-typescript-vanilla-islands.md)'s "no React app-wide" stance for a single, build-scoped reason: Keystatic's editor is a React app. React ships **only** on the Netlify admin routes, never to public-site visitors on either target, so the vanilla-first island posture for the actual site is intact.

Status: accepted.

Considered and rejected: a hosted SaaS CMS (recurring cost, content leaves Git, conflicts with ADR-0001), a separate Decap/Netlify CMS (heavier OAuth proxy, less type-aligned with our Zod schema), and running the admin on GitHub Pages (impossible — it cannot execute server code).

Consequence: the Netlify site URL must be real (set `site` in `astro.config.mjs`), three secrets must be configured (below), and `keystatic.config.ts` must be kept in lockstep with `src/content.config.ts` — if a field is added to one, add it to the other or new entries won't round-trip.

## Manual setup checklist (one-time, by the author)

Cloud editing does **not** work until these are done. Nothing here is committed — secrets stay out of the repo.

1. **Pick your Netlify site URL.** Confirm the `site` value for the non-Pages branch in `astro.config.mjs` is your real Netlify URL (e.g. `https://your-site.netlify.app`). The OAuth callback below must use this exact host.

2. **Create a GitHub App** (GitHub → Settings → Developer settings → **GitHub Apps** → *New GitHub App*):
   - **Homepage URL**: your Netlify site URL.
   - **Callback URL**: `https://<netlify-site>/api/keystatic/github/oauth/callback`
     (also add `http://127.0.0.1:4321/api/keystatic/github/oauth/callback` if you want cloud editing in local `astro dev`).
   - **Request user authorization (OAuth) during installation**: enabled.
   - **Webhook**: uncheck *Active* (not needed).
   - **Repository permissions**: **Contents → Read & write**, and **Metadata → Read-only** (Metadata is mandatory and auto-selected). No other permissions.
   - **Where can this app be installed?**: *Only on this account*.
   - Create the app, then on its page note the **Client ID**, generate a **Client secret**, and **Install** the app on the `markwuenschel-dev/dominion-realm` repository.

3. **Generate a signing secret** for Keystatic sessions:
   ```bash
   openssl rand -hex 32
   ```

4. **Set the three environment variables** (same names in both places):

   | Variable | Value |
   | --- | --- |
   | `KEYSTATIC_GITHUB_CLIENT_ID` | the GitHub App's Client ID |
   | `KEYSTATIC_GITHUB_CLIENT_SECRET` | the generated Client secret |
   | `KEYSTATIC_SECRET` | the `openssl rand -hex 32` output |

   - **Netlify** (production): Site settings → **Environment variables** → add all three.
   - **Local** (optional, for cloud editing in `astro dev`): copy `.env.example` to `.env` and fill them in. `.env` is gitignored — never commit it.

5. **Deploy to Netlify** (the build runs the adapter + injects the admin routes). Then open the admin at **`https://<netlify-site>/keystatic`**, click **Sign in with GitHub**, authorize the app, and you're editing — every save opens or updates a commit/branch on the repo.

Note: the GitHub-Pages deploy has no `/keystatic` route by design. The admin lives only on the Netlify URL.
