// ─────────────────────────────────────────────────────────────────────────────
// test/fixtures/formulas/lockedAttributes.ts — shared attribute fixture for
// locked-expansion formula tests (audit RHA-11). Test-only, and lives under
// test/ (not src/lib/formulas/) so nothing in production code can import it
// by accident — src/lib/formulas is production surface; test/ is not.
//
// Deliberately asymmetric — no two attributes share a value — so a swapped
// coefficient-to-attribute mapping changes the expected result instead of
// canceling out the way an all-equal fixture (e.g. every attribute at 10)
// would. Every locked test's expected value is a plain numeric literal,
// independently hand-computed against the coefficients in src/lib/constants.ts
// at the time the test was written; this fixture supplies inputs only and must
// never import from '@/lib/constants' or any other coefficient source.
// ─────────────────────────────────────────────────────────────────────────────

import type { Attributes } from '@/types';

export const LOCKED_ATTRS_FIXTURE: Attributes = {
  CON: 12,
  END: 8,
  STR: 3,
  AGI: 4,
  DEX: 5,
  INT: 20,
  WIS: 15,
  CHA: 7,
  CVN: 9,
  MYS: 11,
};
