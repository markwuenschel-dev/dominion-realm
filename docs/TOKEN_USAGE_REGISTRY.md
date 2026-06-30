# Token Usage Registry

Ground-truth map of where every theme-derived token is consumed, and AS WHAT
(text color, background, border, SVG fill/stroke, shadow/glow). Built by
grepping codex.css, journal.css, reading.css, relationships.css, map.css,
interface.css, calculator.css.

This file is the source of truth for which tokens are "text-bearing" (must
independently pass contrast) vs. "surface" (background/border, governed by
relative contrast against adjacent surfaces, not absolute) vs. "decorative"
(SVG world-color, glow, gradient stop — no contrast requirement, but should
not be silently load-bearing for legibility anywhere).

A token is classified TEXT if it appears in any `color:` or SVG `fill:` /
`stroke:` declaration on an element that renders user-readable text or is
itself a glyph. This is exactly the rule `accent-bright` broke: it was
assumed decorative but is consumed as text in 3 places below.

---

## --ink

| File | Selector | Usage | Class |
|---|---|---|---|
| codex.css | `.codex-head__title`, `.codex-card__name`, `.codex-entry__title`, `.codex-prose strong`, `.codex-prose h2/h3`, `.codex-rel__item` | text color | TEXT |
| journal.css | `.journal-head__title`, `.journal-item__title`, `.journal-post__title`, `.journal-prose strong/h2/h3` | text color | TEXT |
| reading.css | `.reading-head__title`, `.reading-item__title`, `.reading-article__title`, `.reading-prose p`, `.reading-prose strong/h2/h3` | text color | TEXT |
| relationships.css | `.node--hub .node-label` | SVG fill (glyph) | TEXT |
| map.css | `.hub-name` | SVG fill (glyph) | TEXT |
| interface.css | `.sheet-name`, `.stat-label`, `.skill-name`, `.inv-name` | text color | TEXT |
| **Requirement** | | | **≥ 7:1 vs bg AND bg-panel (primary text)** |

## --ink-dim

| File | Selector | Usage | Class |
|---|---|---|---|
| codex.css | `.codex-top__home`, `.codex-head__intro`, `.codex-card__summary`, `.codex-prose p`, `.codex-entry__summary` | text color | TEXT |
| journal.css | `.journal-head__intro`, `.journal-item__summary` | text color | TEXT |
| reading.css | `.reading-head__intro`, `.reading-item__summary`, `.reading-article__summary`, `.reading-prose blockquote` | text color | TEXT |
| relationships.css | `.node-label`, `.rel-row__kind`, `.rel-legend__item` | SVG fill / text | TEXT |
| map.css | `.ruin-name` | SVG fill (glyph) | TEXT |
| interface.css | `.sheet-title`, `.skill-desc`, `.inv-note`, `.stat-note` | text color | TEXT |
| **Requirement** | | | **≥ 4.5:1 vs bg AND bg-panel** |

## --ink-faint

| File | Selector | Usage | Class |
|---|---|---|---|
| codex.css | `.codex-top__nav a`, `.codex-group__count`, `.codex-card__tier`, `.codex-back`, `.codex-footer`, `.codex-rel__rel` | text color | TEXT |
| journal.css | `.journal-empty` | text color | TEXT |
| reading.css | `.reading-top__nav a`, `.reading-back`, `.reading-footer`, `.reading-nav__dir`, `.reading-download__action` | text color | TEXT |
| map.css | `.realm-map__cap`, `.rm-cartouche`, `.rm-compass__s`, `ruin-kicker`, `.land-legend__kind` | text/SVG fill | TEXT |
| interface.css | `.sheet-level__label`, `.stat-val span`, `.iface-top__nav a` | text color | TEXT |
| **Requirement** | | | **≥ 4.5:1 vs bg (placeholder/tertiary — AA minimum acceptable, AAA preferred)** |

## --gold

| File | Selector | Usage | Class |
|---|---|---|---|
| codex.css | `.codex-head__label`, `.codex-card__kicker`, `.codex-entry__kicker`, `.codex-rel__label`, `.dr-search__kind` | text color (kicker) | TEXT |
| journal.css | `.journal-head__label`, `.journal-item__kicker`, `.journal-post__kicker`, `.journal-filter__btn:hover` | text color | TEXT |
| reading.css | `.reading-head__label`, `.reading-item__kicker`, `.reading-article__kicker`, `.reading-cta` background | text color + bg | TEXT + SURFACE |
| relationships.css | `.rel-chip__rel` | text color | TEXT |
| map.css | `.map-key__title`, `.hub-kicker`, `.rm-compass__n/__lbl`, marker dot border | SVG fill/stroke | TEXT |
| interface.css | many kickers, `.sheet-kicker`-adjacent | text color | TEXT |
| **Requirement** | | | **≥ 4.5:1 vs bg (small caps/uppercase labels — treat as normal text, not large text, since letter-spacing doesn't grant the large-text 3:1 exception)** |

## --gold-bright  ⚠ PREVIOUSLY MISCLASSIFIED AS DECORATIVE-ONLY

| File | Selector | Usage | Class |
|---|---|---|---|
| codex.css | `.codex-head__title em`, `.codex-top__home em` | **inline emphasis TEXT** | TEXT |
| journal.css | `.journal-head__title em` | **inline emphasis TEXT** | TEXT |
| reading.css | `.reading-head__title em`, drop cap `::first-letter`, `.reading-prose a` | **inline TEXT + link** | TEXT |
| codex.css | `.codex-prose a` | link text | TEXT |
| journal.css | `.journal-prose a` | link text | TEXT |
| map.css | marker hover state, `.hub-core` glow | fill / drop-shadow | DECORATIVE (glow only, not text) |
| **Requirement** | | | **≥ 4.5:1 vs bg AND bg-raise. This is the token that broke on Solstice — it IS text-bearing, confirmed by 6 separate text/link consuming sites above.** |

## --bg / --bg-raise / --bg-panel

| File | Selector | Usage | Class |
|---|---|---|---|
| all files | every `.card`, `.panel`, page background, `.codex-card`, `.reading-item`, `.skill`, `.inv-item` | background-color | SURFACE |
| **Requirement** | | | **No absolute contrast requirement. Must maintain ≥ 6 lightness-points of separation between bg → bg-panel → bg-raise (relative, not absolute) so surfaces read as distinct layers.** |

## --line / --line-soft

| File | Selector | Usage | Class |
|---|---|---|---|
| all files | borders, dividers, `hr`, table cell separators | border-color | SURFACE (structural) |
| **Requirement** | | | **No absolute contrast requirement against text, but must be visually distinguishable from bg — target opacity high enough to read as a hairline on the lightest surface in the theme (bg, not bg-panel).** |

## --btn-ink

| File | Selector | Usage | Class |
|---|---|---|---|
| reading.css | `.reading-cta` | text on gold button | TEXT |
| journal.css | `.journal-filter__btn[aria-pressed='true']` | text on gold button | TEXT |
| calculator.css | primary button text | text on primary button | TEXT |
| **Requirement** | | | **≥ 4.5:1 vs --gold (the button background it sits on, NOT vs page bg)** |

## --spectral-ui / --spectral-ui-dim

| File | Selector | Usage | Class |
|---|---|---|---|
| interface.css | `.sheet-level__num`, `.stat-val`, `.skill-tier`, `.sheet-tab.is-active` bg, stat bar fill gradient | text + bg + glow | TEXT + SURFACE |
| **Requirement** | | | **≥ 4.5:1 vs bg AND bg-panel (it renders large numeric stat values — frequently the most-read content on the calculator page)** |

## --color-muted-foreground (shadcn)

| File | Selector | Usage | Class |
|---|---|---|---|
| calculator.css | formula subtext under stat blocks, XP percentage, scaffold tag labels | text color | TEXT |
| **Requirement** | | | **≥ 4.5:1 vs bg AND bg-panel — this was the original bug (Parchment 3.1:1, Slate 2.6:1) that started this whole audit.** |

## --color-primary-foreground (shadcn)

| File | Selector | Usage | Class |
|---|---|---|---|
| calculator.css | button text, active states | text on primary button bg | TEXT |
| **Requirement** | | | **≥ 4.5:1 vs --color-primary (the button bg), not vs page bg.** |

---

## Decorative-only tokens (confirmed, no text usage found anywhere)

| Token | Usage | Why it's safe to skip AA |
|---|---|---|
| `--theme-accent-bright-hsl` as raw input hex (pre-fix) | drop cap, `hr` ornament glyphs only IF those are the only consumers | N/A — disproven, see --gold-bright above |
| ley-thread hues, threat colors, ruin-portal fill | `map.css` world-color constants (`#9b6cf0`, `#a6c479`, etc.) | Fixed lore colors, not theme tokens, not user-readable body text — same treatment for every theme |
| `--spectral` / `--spectral-v` gradient | decorative rule under headings | Never used as text/fill on glyphs |
| `box-shadow` / `filter: drop-shadow` glow values | hover glow effects | Glow sits behind/around an element, doesn't carry text legibility itself — BUT if the glowed element is text-on-glow (e.g. `.hub-core` near `.hub-name`), the glow color should still roughly match the text token to avoid a clashing halo |
