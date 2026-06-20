# Content is modeled as Astro Content Collections

All growing content (codex entries, the reading sample, journal posts) lives as Markdown/MDX files in the repo, validated against schemas via Astro Content Collections — not in an external/hosted CMS. This keeps the site fully static and dependency-free, gives type-safe and schema-consistent entries, and lets content be authored in-editor, via Claude Code, or via git.

Status: accepted.

Considered: a hosted headless CMS (Sanity / Storyblok / Contentful) — rejected as an unnecessary external dependency and cost for a solo author starting out.

Consequence: a git-based GUI (Keystatic or Decap CMS) can be layered on the same files later if browser editing or a non-technical collaborator is ever needed, without re-architecting the content.
