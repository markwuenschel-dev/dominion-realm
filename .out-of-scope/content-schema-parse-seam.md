# Rejected candidate: content-schema-parse-seam

**Date:** 2026-07-24
**Source:** architecture-review flywheel (Wave 3 scoping pass)
**Disposition:** DROPPED — premise falsified by the code.

## The proposed candidate
"Content Zod schemas are private (`src/lib/contentCore.ts:50`), so validation/parsing is
duplicated or bypassed — expose one `parseX(raw): X` seam."

## Why it was rejected
Read-only scoping found the premise does not hold:

- `.parse()` is called in exactly **one** place repo-wide — `contentCore.ts:247` inside
  `loadCollection`. No other content-frontmatter parse exists.
- Every consumer goes through the typed getters (`getCodexEntries`, `getJournalEntries`, …)
  re-exported via the `server-only` shim `content.ts`. None re-parses or hand-validates.
- The only shape "mirror" is `keystatic.config.ts` (the CMS write DSL), which is a structural
  necessity (Keystatic can't consume a Zod schema) and is already guarded by shared constants
  (`REVEAL_TIERS`, `RELATIONSHIP_COLLECTIONS`) plus `relationshipCollectionSchema` for the
  write⊆read fitness test.

Parsing is already centralized behind one exported seam (`loadCollection` + the getters).
Exposing the private per-collection `schemas` would **reduce** encapsulation — it invites
callers to parse ad hoc and bypass the image-resolution and draft-filter post-processing in
`loadCollection` (lines 254–277). Acting on this candidate is net-negative.

## If revisited
The only legitimate adjacent work would be a "keep Keystatic fields ⊆ Zod schema" **fitness
test** (schema-parity), not a parse-seam exposure. That is a different candidate.
