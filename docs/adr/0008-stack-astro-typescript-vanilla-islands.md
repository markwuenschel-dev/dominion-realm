# Stack: Astro + TypeScript, vanilla-first islands

The site stays on **Astro** with **TypeScript** enabled project-wide. Interactivity is written in typed vanilla JS/TS; a lightweight island framework (Preact or Svelte) is introduced only if a specific stateful piece — the reveal toggle or the Interface Overlay — proves genuinely unwieldy in vanilla. We explicitly do **not** adopt React app-wide, Next.js, a Node runtime server, or a Rust stack.

Astro is purpose-built for static content sites, ships zero JS by default, and already hosts our content model and hosting decisions ([ADR-0001](0001-static-site-third-party-services.md), [ADR-0002](0002-content-collections.md)). TypeScript makes Content Collections and the reveal-tier logic type-safe at near-zero cost. Next.js (React-coupled, SSR-oriented), a Node server, and a Rust stack (Zola / Leptos / Axum) each either fight the static/free-hosting decision or discard the existing Astro site for no benefit; React-as-island is the heaviest interactivity option and isn't justified by two interactive pieces.

Status: superseded by [ADR-0010](0010-migrate-astro-to-nextjs.md).

Consequence: when an island framework is eventually needed, prefer Preact or Svelte (light, compile-friendly) over React, and add it for a single island — not globally.
