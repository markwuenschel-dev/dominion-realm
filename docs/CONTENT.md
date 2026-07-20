# Editing the Site — An Author's Guide

> **Stack note (2026):** the site has migrated from Astro to **Next.js + React**,
> hosted on **AWS EC2** (Docker + Caddy) — see [ADR-0010](adr/0010-migrate-astro-to-nextjs.md)
> and [ADR-0012](adr/0012-host-on-aws-ec2.md). For
> authors, almost nothing changes: content is still Markdown/MDX files under
> `src/content/`, validated at build. The differences are where the hand-coded
> pages live (`src/app/*` instead of `src/pages/*.astro`) and that the Keystatic
> CMS now runs on the main site, not a separate Netlify URL.

This is the practical guide to updating *The Dominion Realm* site: adding codex
entries, writing journal posts, publishing reading chapters, and tweaking the
homepage. No deep technical background needed — most edits are just writing
Markdown and saving.

If you only read one thing: **most new content is a Markdown file you drop into a
folder.** The site validates it when it builds, so a broken entry can't go live —
it just stops the deploy until it's fixed. That safety net means you can edit with
confidence.

---

## 1. The two kinds of content

The site has two layers, and they're edited differently:

1. **Markdown collections — the growing stuff.** The World Codex, the Author
   Journal, and the Reading Sample are all **Content Collections**: folders of
   Markdown files under `src/content/`. Each file is one entry — one character,
   one journal post, one chapter. This is where the site grows over time, and
   it's the easy, repeatable part. Add a file, write the frontmatter and body,
   commit. (See ADR-0002 for why content is modeled this way.)

2. **The hand-coded homepage and fixed pages — the crafted stuff.** The homepage
   (`src/app/page.tsx`) and the Eyes interactive (`src/app/eyes/page.tsx`)
   are **not** collections. They're hand-written React/JSX page markup — the logline, the
   buy buttons, the character/world/Eyes pitch blocks, the author bio. You edit
   these by finding the right line of markup and changing the text. It's a little
   more fiddly, but you rarely touch them. Section 4 has a map.

Rule of thumb: **a codex entry, a journal post, or a chapter → Markdown file
(Sections 2–3). A change to the front door or the Eyes page → edit the page
markup (Section 4).**

---

## 2. The file map — where each kind of content lives

Every collection is a folder under `src/content/`. **The filename becomes the URL
slug.** For example, `src/content/characters/marcus.md` is served at
`/codex/characters/marcus`. Use lowercase, hyphenated filenames (`serra-hawthorne.md`,
not `Serra Hawthorne.md`).

The four **codex** collections — characters, concepts, factions, places — share a
common set of fields and each add a few of their own.

### Codex collections

| Collection | Folder | URL | Required fields | Optional fields |
|---|---|---|---|---|
| **Characters** | `src/content/characters/` | `/codex/characters/<slug>` | `name`, `summary`, `reveal`, **`role`** | `image`, `imageAlt`, `relationships`, `draft`, `aliases`, `eyeStage` (1–6), `status` (`alive`\|`dead`\|`unknown`, default `unknown`) |
| **Concepts** | `src/content/concepts/` | `/codex/concepts/<slug>` | `name`, `summary`, `reveal` | `image`, `imageAlt`, `relationships`, `draft`, `kind` (`magic-system`\|`artifact`\|`phenomenon`\|`term`, default `term`), `stage` (1–6) |
| **Factions** | `src/content/factions/` | `/codex/factions/<slug>` | `name`, `summary`, `reveal` | `image`, `imageAlt`, `relationships`, `draft`, `kind` (`faction`\|`people`\|`threat`, default `faction`) |
| **Places** | `src/content/places/` | `/codex/places/<slug>` | `name`, `summary`, `reveal` | `image`, `imageAlt`, `relationships`, `draft`, `region`, `timeline` |

**Shared codex fields** (every codex entry has these):

- `name` — the display name / title of the entry. **Required.**
- `summary` — a one- or two-sentence, spoiler-safe summary. Shows on cards and in
  share previews. **Required.**
- `reveal` — the spoiler tier (`teaser` / `reader` / `deep` / `beyond`).
  **Required** — there's no default, on purpose, so you never accidentally ship a
  spoiler as public. See Section 3 for what each tier means.
- `image` / `imageAlt` — optional portrait or key art, and its alt text. Easiest
  is to drag a picture onto the **Image** field in `/keystatic` (see the README's
  "Editing in the browser" section); it stores the file under
  `src/content/<collection>/<slug>/` and fills in `image` with the finished
  `/content-media/…` URL for you. A relative `./file.png` beside the entry also
  works. A character's image feeds both its Codex page and its homepage cast card.
- `relationships` — optional list of cross-links to other codex entries (any of
  the four collections). Each item is `entry: <slug>`, with an optional
  `collection:` and `label:`. Example in Section 3.
- `draft` — optional `true`/`false` (default `false`). `draft: true` hides the
  entry from the live site but keeps it visible in local preview. See Section 3.

### Journal and Reading

| Collection | Folder | URL | Required fields | Optional fields |
|---|---|---|---|---|
| **Journal** | `src/content/journal/` | `/journal/<slug>` | `title`, `summary`, `category` (`field-notes`\|`from-the-desk`), `pubDate`, `reveal` | `updatedDate`, `image`, `imageAlt`, `draft` |
| **Reading** | `src/content/reading/` | `/read/<slug>` | `title`, `order`, `summary` | `kind` (`prologue`\|`chapter`, default `chapter`), `image`, `imageAlt`, `draft` |

Two things to note:

- **Journal posts have a `reveal` tier; reading chapters do not.** The Reading
  Sample (the Prologue and Chapter One) is deliberately fully open — it's the
  free bait that wins readers — so there's no spoiler gate on it at all. Don't
  add a `reveal` field to a reading file; it isn't part of the schema.
- **`order` controls reading order.** The reader's prev/next navigation sorts by
  the `order` number, not by filename. The Prologue is `order: 0`, Chapter One is
  `order: 1`, and so on.

### Timeline (file-backed, not in the CMS)

Timeline beats live in `src/content/timeline/*.md` and are Zod-validated like the
other collections, but they are **deliberately not in Keystatic** — so you won't
see them in `/keystatic`. They're a seed **chronology spine**: a small set of
example beats you edit directly in the files until the manuscript's real beats
land. This is intentional, not an oversight; Keystatic mirrors the other
collections, and timeline is the documented exception.

Two things to know before you add or rename a beat:

- **The filename slug is a join key.** A beat's `id` (its filename without `.md`)
  is what Sanity Scene art joins to (`beatRef`) and what the on-page `#anchor` and
  search use. Renaming a file silently orphans its Scene art and breaks links.
- **Regenerate after any add/rename.** Run the content-manifest regen (so Studio
  panes and `TIMELINE_BEATS` stay in sync) and `pnpm scene:check` (so an orphaned
  Scene join goes red) before committing.

If a non-developer ever needs to edit beat copy or ordering, that's the trigger to
add a frontmatter-only Keystatic collection for timeline (no body field, with the
filename-is-a-join-key caveat surfaced) — see audit CAND-06.

---

## 3. Worked examples (copy-paste these)

Every Markdown file has two parts: the **frontmatter** (the block between the
`---` lines at the top — these are the structured fields the site reads) and the
**body** (everything below, written in normal Markdown — paragraphs, headings,
`*emphasis*`, links).

### The `reveal` tier — what each level means

`reveal` is the spoiler gate. It's the project's canonical vocabulary (ADR-0004),
so use these exact lowercase names in frontmatter:

| Tier (use lowercase) | Label | What it exposes |
|---|---|---|
| `teaser` | Teaser | Spoiler-safe. What anyone can see before reading. **The public default — start here.** |
| `reader` | Reader | What you'd know after finishing Book One. |
| `deep` | Deep | Major Book One spoilers and endgame. |
| `beyond` | Beyond | Series-level hints toward books still to come. |

The tiers are cumulative: a reader who's set their level to *Deep* sees Teaser,
Reader, and Deep content. A visitor who hasn't touched the toggle sees only
*Teaser*. **When in doubt, mark an entry `teaser`** — it's the safe choice, and
you can always raise it later.

The `reveal` you set on an entry is its *minimum* tier: the whole entry won't show
to anyone below that level. (Individual sections *within* an entry can also be
gated, but that's a feature of the entry body, not something you set in
frontmatter.)

### The `draft` flag — hiding work in progress

Set `draft: true` on any codex or journal entry (or reading file) you're not ready
to publish. A draft:

- **Stays visible** when you run the site locally (`npm run dev`), so you can keep
  working on it and preview it.
- **Is left out** of the production build, so it never appears on the live site.

When the entry is ready, change it to `draft: false` (or delete the line) and
publish. Reading and codex files default to `draft: false`, so if you omit the
field entirely, the entry is live.

### Example A — a new character

File: `src/content/characters/mira-vale.md` → lives at `/codex/characters/mira-vale`

```markdown
---
name: Mira Vale
summary: A cartographer who maps the Realm by the rules it breaks, not the ones it keeps.
role: The Mapmaker
reveal: teaser
aliases:
  - The Mapmaker of Eriadne
eyeStage: 1
status: alive
relationships:
  - entry: marcus
    collection: characters
    label: travels with
  - entry: eriadne
    collection: places
    label: hails from
draft: true
---

Mira learned the Realm the way other walkers learn a weapon: by the places it
refuses to behave. Where the interface insists a road is "complete," she walks it
twice and notes where the second walk disagrees.

She is not a fighter. Her value is the map nobody else thinks to keep — the one of
the seams.
```

- `name`, `summary`, `role`, and `reveal` are required for a character. The rest
  are optional.
- `relationships` cross-links to **any** of the four codex collections — note the
  `collection: places` link to `eriadne`. The `label` is the short phrase shown on
  the link.
- `draft: true` keeps Mira off the live site until she's ready.

### Example B — a new journal post

The journal has **two streams**, set by the `category` field:

- **`field-notes`** — *in-world* writing. The voice of someone inside the Realm
  (e.g. Marcus's observations). This is lore.
- **`from-the-desk`** — *author-voice* writing. You, talking about craft, process,
  and progress. This is the platform/blog side.

One collection, two voices, distinguished only by `category`. Readers can filter
by stream.

File: `src/content/journal/the-seams-keep-score.md` → lives at `/journal/the-seams-keep-score`

```markdown
---
title: The Seams Keep Score
summary: Marcus notices the Realm logging things it has no interface for.
category: field-notes
pubDate: 2026-06-21
reveal: teaser
draft: false
---

The interface does not have a counter for this, and yet the Realm is counting.

I have started keeping my own tally in the margins of a thing that claims to track
everything. The discrepancy is the only honest number I own.
```

- `title`, `summary`, `category`, `pubDate`, and `reveal` are required.
- `pubDate` is a date in `YYYY-MM-DD` form. Add `updatedDate:` (same format) if you
  revise a post later.
- For an author-voice post, set `category: from-the-desk` instead. Everything else
  works the same.

### Example C — a new reading chapter

File: `src/content/reading/02-chapter-two.md` → lives at `/read/02-chapter-two`

```markdown
---
title: The Second Save
kind: chapter
order: 2
summary: The party crosses the first seam, and the interface flinches.
---

The road ended the way the interface said it would — and then it kept going,
which the interface had nothing to say about at all.

Marcus took the extra step anyway.
```

- `title`, `order`, and `summary` are required. `kind` defaults to `chapter`, so
  you only need to set it for the prologue (`kind: prologue`).
- **`order` is what sequences the reader.** Give each new chapter the next number;
  the prev/next links sort by it. The filename prefix (`02-`) is just for tidy
  sorting in your editor — the site doesn't rely on it.
- **No `reveal` field** — the reading sample is intentionally open to everyone.

---

## 4. Editing the fixed homepage and pages

The homepage and Eyes page aren't Markdown — they're hand-coded markup. To change
their text, open the file and search for a marker, then edit the words.

**`src/app/page.tsx`** — the homepage (hero, the read/explore CTAs, the
character/world/Eyes pitch blocks, the author bio/socials):

| To change… | Search for |
|---|---|
| Logline / hero | `hero-logline` |
| Hero call-to-action buttons | `buy-row` |
| Homepage characters (Marcus, Serra, Seb) | `char-name` |
| The World pitch (Eriadne, the two endings) | `world-name` |
| The six Eyes stages | `stage-name` |
| Author name / socials | `[ Author Name ]` |

The homepage character/world/Eyes blocks are a curated *pitch* — they are separate
from the full codex entries under `src/content/`. Updating a character's codex
profile does not change the homepage block, and vice versa; edit both if you want
them in sync.

**`src/app/eyes/page.tsx`** — the Neurochromatic Eyes interactive. The six stages can
also be backed by codex `concepts` entries (with a `stage:` number), but the page's
own copy and interaction live in this file.

**`src/styles/tokens.css`** — the design tokens: the colour palette (`--bg`,
`--ink`, `--gold`, …), fonts, and the spectral gradient. This is the single source
of truth for the look (ADR-0007). Change a token here and it updates everywhere.
The favicon is `public/favicon.svg`.

---

## 5. How to make an edit and publish — three paths

All three end the same way: a change lands on `main`. The site owner then deploys
it — currently a **manual container rebuild** on the EC2 host (see the README's
Deployment section); there is no auto-deploy on push yet. Pick whichever fits the edit.

### Path A — edit on github.com (best for non-technical edits)

No tools to install. Straight from the browser:

1. Go to the repo on GitHub and open the Markdown file you want (or navigate to
   the folder and click **Add file → Create new file** for a brand-new entry).
2. Click the **pencil ✏️** ("Edit this file") button.
3. Make your changes in the text box.
4. At the bottom, choose **"Create a new branch for this commit and start a pull
   request,"** then **Commit changes**.
5. **Open the pull request,** let the checks run (see Section 7), and **merge** it.
6. Merging into `main` triggers the deploy. Your change is live in a few minutes.

This is the recommended path for adding a codex entry, writing a journal post, or
fixing a typo. You never leave the browser.

### Path B — local dev (live preview while you write)

Best when you want to *see* the page as you write, or you're doing several edits at
once.

```bash
npm install        # first time only
npm run dev        # preview at http://localhost:4321
```

Edit files in `src/content/` (or the page files) and the browser refreshes live.
**Drafts show up here**, so it's the right place to work on `draft: true` entries.
When you're happy:

```bash
git checkout -b add-mira-vale      # a branch for your change
git add src/content/
git commit -m "content: add Mira Vale codex entry"
git push -u origin add-mira-vale
```

Then open a pull request on GitHub and merge it, same as Path A.

### Path C — ask Claude Code

If you have Claude Code set up, you can simply describe what you want — "add a
codex character named Mira Vale, the Mapmaker, teaser tier" or "draft a From the
Desk journal post about X" — and it will author the file with correct frontmatter,
run the checks, and ship it through the normal branch → PR → merge flow.

### Path D (coming) — the Keystatic CMS

A friendlier, form-based option is described next.

---

## 6. The Keystatic CMS — click-to-edit (recommended for the non-technical path)

A **Keystatic** CMS sits on top of these exact same collections and gives you a
**form-based editor** in the browser — no Markdown, no frontmatter to hand-type,
no git commands. It runs in **GitHub cloud mode**, which means it reads from and
writes to this repo directly.

> **One-time setup required.** Cloud editing only works after the site owner
> creates a GitHub App and adds three secrets to the EC2 deploy env
> (`env/dominion-realm.env`) — see the checklist in
> [ADR-0009](adr/0009-cms-keystatic.md) (the host is now AWS EC2, per
> [ADR-0012](adr/0012-host-on-aws-ec2.md)). Until that's done, use the
> Markdown/git paths above.

### How to use it

1. **Open the admin** at **`/keystatic`** on the live site — e.g.
   `https://<your-domain>/keystatic`. (The CMS admin needs a server to talk
   to GitHub; EC2 runs the whole site as a Node server, so the admin lives on
   the main deploy — there's no separate host any more.)
2. **Log in with GitHub.** Authorize the app the first time; after that it's one
   click.
3. **Edit with forms.** Every collection — characters, concepts, factions, places,
   journal, reading — appears as a list. Pick an entry to edit it, or create a new
   one. The fields you see are the same ones in this guide (name, summary, the
   reveal-tier dropdown, draft toggle, the body editor), just as form inputs.
4. **Save.** Keystatic **commits your change directly to the repo** on your behalf.
   Going live then needs a deploy (a container rebuild on the host) — the same end
   result as editing the Markdown by hand, but without touching git.

### One-time setup

Before anyone can log in, the **site owner** does a **one-time GitHub App setup**
(creating/connecting the Keystatic GitHub App and adding its credentials to the
EC2 deploy env, `env/dominion-realm.env`). This is a one-off; after it's done, the `/keystatic` form
just works. The steps live in
[ADR-0009 — Keystatic CMS](adr/0009-cms-keystatic.md).

### Which path should I use?

**Keystatic is the friendly, click-to-edit front door** — reach for it for routine
content. The **raw Markdown + git path (Sections 3 and 5)** is always available as
the fallback: it needs nothing set up, works offline, and gives you full control.
They edit the same files, so you can mix and match freely — write in Keystatic
today, hand-edit the Markdown tomorrow.

---

## 7. The safety net — why you can't break the live site

Two things protect the published site, so you can edit without fear:

1. **Schema validation.** Every collection has a Zod schema (defined in
   `src/lib/contentCore.ts`, re-exported by the `server-only` `src/lib/content.ts`
   shim). When the site builds (`next build`), the content loader
   checks every entry against it. If something's wrong — a missing required field, a
   misspelled `reveal` tier, a malformed date — the **build fails** instead of
   shipping broken content. The
   pull request's required **Build & validate** check turns red, which **blocks the
   merge**. A broken entry literally cannot deploy; you just fix it and push again.

2. **The `draft` flag.** `draft: true` keeps a work-in-progress entry out of the
   live site while still letting you preview it locally (Section 3). Use it freely
   for anything that isn't ready.

Together these mean the worst case for a bad edit is a red check on a pull
request — never a broken live site. Edit boldly.

---

## See also

- **README** — quick project overview and the run/deploy commands.
- [ADR-0002 — Content as Collections](adr/0002-content-collections.md) — why content is modeled this way.
- [ADR-0004 — The reveal-tier model](adr/0004-reveal-tier-model.md) — the spoiler vocabulary in depth.
- [ADR-0007 — Visual identity & tokens](adr/0007-evolve-not-reinvent-identity.md) — the design-token system.
- [ADR-0009 — Keystatic CMS](adr/0009-cms-keystatic.md) — the form-based editor (added alongside this guide).
- `src/lib/contentCore.ts` — the authoritative schema for every field above (re-exported by the `server-only` `src/lib/content.ts` shim).
- [ADR-0010 — Astro → Next.js migration](adr/0010-migrate-astro-to-nextjs.md) — the framework + original host move; hosting since moved to EC2 ([ADR-0012](adr/0012-host-on-aws-ec2.md)).
