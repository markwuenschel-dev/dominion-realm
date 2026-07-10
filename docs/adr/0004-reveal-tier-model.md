# Spoiler control: a four-tier reveal model with a reader toggle

Codex content is gated by a four-tier reveal vocabulary — **Teaser → Reader → Deep → Beyond** — where *Teaser* is safe for anyone (default, pre-launch marketing-safe), *Reader* is knowledge you'd have after finishing Book One, *Deep* is major Book One spoilers / endgame, and *Beyond* is series-level hints toward future books. Each entry declares a minimum tier; sections within an entry can be gated individually; a global reader-set "reveal level" control (persisted in `localStorage`, defaulting to Teaser) governs what renders site-wide. The book is unreleased and mid-draft, so the site must tease without burning its own reveals, and the schema must not need re-architecting once real readers exist.

This vocabulary is **ubiquitous language** — use these exact tier names in the schema, the toggle UI, and prose.

Status: accepted.

Considered: a 2-tier (Safe / Spoiler) and a 3-tier (no *Beyond*) model — rejected in favor of series-level future-proofing.

Consequence: more authoring discipline (every entry and gated section needs a tier), and the reveal toggle is a real, testable UI component, not a content detail. Public metadata is also a reveal surface: Teaser entries may publish their title, summary, and Teaser-safe Primary image; Reader, Deep, and Beyond entries must emit generic site metadata instead. This protects casual link previews and search snippets, though slugs, static route existence, and the RSC payload remain outside the accidental-spoiler boundary.
