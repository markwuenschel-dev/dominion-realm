# PRD — The Dominion Realm: Site Overhaul

> Master PRD for the pre-launch overhaul. Architectural decisions referenced here are
> recorded as ADRs in [`../adr/`](../adr/). No project issue tracker is configured yet,
> so this PRD lives as a file; publish to a tracker later if one is set up.

## Problem Statement

The book *The Dominion Realm* (Realmwalkers · Book One) is mid-draft and unreleased. The
current site is a single cinematic scroll plus one interactive page — a strong first
impression, but it can't yet build a returning audience, has placeholder content, a fake
email signup, and no way to grow a worldbuilding presence over time. The author needs the
site to (a) draw and retain an audience through an immersive experience and (b) stand up an
author/credibility platform — both *before* there's anything to sell.

## Solution

Overhaul the site into an immersive, content-driven world hub on the same visual soul,
leveled up. Keep the cinematic homepage as the spine and grow deep subpages for a **World
Codex**, a **Reading Sample**, and an **Author Journal**, plus one signature interactive
(**The Interface Overlay**). Content is authored as Astro Content Collections; spoilers are
governed by a four-tier reveal model; the email signup becomes real (Kit); GA4 measures
whether audience-building is working. The whole thing stays a static site on free hosting.

## User Stories

**Reader / visitor (immersive experience)**

1. As a curious visitor, I want a cinematic homepage that pitches the premise in one scroll, so that I understand the book's hook within seconds.
2. As a visitor, I want a refreshed, premium look that still feels like the existing world, so that the site feels crafted and trustworthy.
3. As an intrigued reader, I want to browse a World Codex of characters, concepts, factions, and places, so that I can explore the world beyond the pitch.
4. As a reader, I want each character to have a full profile (role, arc-safe bio, relationships, their Eye stage, portrait), so that I can connect with the cast.
5. As a reader, I want codex entries to cross-link to each other, so that I can follow threads through the world.
6. As a reader, I want to search the codex, so that I can find a term or character quickly.
7. As a spoiler-averse reader, I want the codex to default to spoiler-safe (Teaser) content, so that I'm never spoiled by accident.
8. As a returning/finished reader, I want to raise the reveal level (Reader / Deep / Beyond), so that I can see more once I'm ready.
9. As a reader, I want individual sections of an entry to unseal as I raise the reveal level, so that I can read part of an entry without unlocking all of it.
10. As a reader, I want my chosen reveal level remembered between visits, so that I don't reset it every time.
11. As a prospective reader, I want to read the prologue and first chapter freely, so that I can judge the writing before committing.
12. As a reader, I want the reading sample beautifully typeset, so that the prose is a pleasure to read on any device.
13. As a fan, I want a signature interactive (the Interface Overlay) that toggles the RPG interface over a real scene and then lets it fray, so that I *feel* the book's central conceit.
14. As a fan, I want a polished Eyes of Meszkhal experience, so that the existing showpiece matches the new design bar.
15. As a returning visitor, I want an Author Journal with in-world "Field Notes" and author-voice "From the Desk" posts, so that I have reasons to come back.
16. As a reader, I want to filter the journal by stream, so that I can read just the lore or just the process updates.
17. As a reader, I want an RSS feed for the journal, so that I can follow updates in my reader.
18. As any visitor, I want the site to respect reduced-motion and work without heavy JS, so that it's usable and accessible.

**Audience-building / author**

19. As the author, I want a real email signup wired to Kit, so that I capture and own an audience pre-launch.
20. As the author, I want confirmation feedback after signup, so that readers know they're on the list.
21. As the author, I want GA4 analytics with consent handling, so that I can see whether audience-building is working without violating privacy norms.
22. As the author, I want to add codex entries and journal posts as Markdown/MDX with a validated schema, so that content stays consistent and I can't ship a malformed entry.
23. As the author, I want an "About the Author" page scaffolded now, so that I can drop in real name/bio/headshot/socials later without a redesign.
24. As the author, I want forward-looking buy/retailer placeholders, so that the path to "buyable" exists without implying the book is for sale yet.

**Industry / credibility**

25. As an agent or industry visitor, I want the depth and polish of the world and prose to be immediately evident, so that the project reads as serious.
26. As any sharer, I want good Open Graph/Twitter cards per page, so that links look great when shared.

## Implementation Decisions

- **Architecture:** fully static Astro, free hosting (GH Pages + Netlify), dynamic needs via embedded third-party services. See ADR-0001.
- **Stack:** Astro + TypeScript (enabled project-wide); vanilla-first interactivity, with a lightweight island framework (Preact/Svelte) added only if a stateful piece needs it. No React app-wide, Next.js, Node server, or Rust. See ADR-0008.
- **Content layer:** Astro Content Collections (Markdown/MDX + schema). See ADR-0002.
- **Site shape:** cinematic homepage spine + deep subpages (`/codex`, `/read`, `/journal`, `/about`, `/eyes`). See ADR-0003.
- **Codex collections (4):** Characters; Concepts & the magic system (incl. the six Eyes as structured data the eyes page renders over); Factions, peoples & threats; Places & timeline. A shared base schema (name, summary, body, image, relationships, reveal tier) with per-collection fields.
- **Reveal model:** four tiers — Teaser / Reader / Deep / Beyond — with a global persisted toggle and per-section gating. See ADR-0004.
- **Reading sample:** Prologue + Chapter 1, fully open (no gate), web reader.
- **Journal:** one collection, two streams via a `category` field (Field Notes = in-world; From the Desk = author-voice), with RSS.
- **Signature interactive:** The Interface Overlay (toggle the RPG UI over a scene, then let it fray); plus polish the existing Eyes experience.
- **Email:** Kit (ConvertKit) embedded form replacing the mock. See ADR-0005.
- **Analytics:** GA4 + cookie consent. See ADR-0006.
- **Design:** evolve & systematize the existing identity into tokens/components; do not reinvent. See ADR-0007.
- **Search:** client-side static search (e.g. Pagefind) over codex content.

### Phasing (build order)

1. **Foundation** — enable TypeScript; design-system tokens + homepage visual level-up; Content Collections infrastructure (base schema + 4-tier reveal toggle component); wire Kit, GA4, and search.
2. **World Codex** — the four collections, entry pages, index/browse, cross-linking, reveal gating. (The backbone everything references.)
3. **Reading Sample + Author Journal** — lighter, can proceed in parallel.
4. **The Interface Overlay** + Eyes polish — the heaviest, most distinctive piece, built last.

## Testing Decisions

Good tests here assert externally observable behavior, not implementation details. Priorities:

- **Build integrity:** `astro build` passes; Content Collection schemas reject malformed entries (a missing/invalid reveal tier should fail the build).
- **Reveal model (highest-value logic):** end-to-end (e.g. Playwright) — at default Teaser level, Deep/Beyond content is absent from the DOM; raising the level reveals the right sections; the choice persists across reload. This is the one piece of real client logic and the easiest to get subtly wrong.
- **The Interface Overlay:** smoke test that it toggles and degrades gracefully (and respects reduced-motion).
- **No-JS / reduced-motion:** core content (codex entries, reading sample, journal) is readable without JS and without animation, mirroring the existing homepage's "never stuck at opacity 0" robustness.
- **Prior art:** the existing homepage script already guards against frozen animation clocks and reduced-motion — reuse that posture for new interactive pieces.

## Out of Scope

- Interactive world map (backlog; most build-heavy, needs map art — codex Places entries can hook into it later).
- ~~A GUI CMS (Keystatic/Decap) — deferred; collections are edited in-repo for now.~~ **Adopted post-overhaul:** Keystatic in GitHub storage mode (see [ADR-0009](../adr/0009-cms-keystatic.md)); in-repo Markdown editing remains supported.
- Reading-sample downloads (epub/PDF) — deferred; web reader only.
- Accounts, comments, or any community/social features.
- Real retailer/buy integration and any sales-conversion optimization (the book isn't buyable yet).
- Real author identity content (name, bio, headshot, socials) — the About page is scaffolded now, filled later.

## Further Notes

- **Two goals, kept separate:** immersive experience *and* author platform are both first-class; the journal's two-stream design and the scaffolded About page are how the platform half is served without author material yet.
- **Reveal vocabulary is canon:** Teaser / Reader / Deep / Beyond are ubiquitous language — keep the names consistent across schema, UI, and copy.
- **GA4 caveat:** unlike a privacy-first analytics choice, GA4 obligates a consent banner; treat that as part of the Foundation phase.
