import { z } from 'zod';
import type { CharacterSheetState } from '@/types/characterSheet';
import { SHEET_ATTRIBUTE_KEYS } from '@/types/characterSheet';
import { SPECIES_TEMPLATES, SOUL_LEVELS } from '@/lib/characterTemplates';

/**
 * Schema gate for the character sheet's JSON import — the one external-input
 * path into the persisted store (audit CAND-10). `loadState` spreads its
 * argument onto state and bypasses the setters' clamps, so everything crossing
 * this boundary is validated here first.
 *
 * Semantics (grilled): wrong shapes/types reject the whole file; merely
 * out-of-range numbers clamp to the setters' ranges. Unknown top-level keys are
 * stripped (Zod's default) so junk never reaches the store. `className` stays an
 * open string because ClassKey is data-driven with a profile fallback.
 */

const SPECIES_KEYS = Object.keys(SPECIES_TEMPLATES) as [string, ...string[]];
const SOUL_LEVEL_KEYS = SOUL_LEVELS.map((s) => s.key) as [string, ...string[]];

const clamped = (min: number, max: number) =>
  z
    .number()
    .finite()
    .transform((n) => Math.max(min, Math.min(max, n)));

// All 11 sheet attributes required when the block is present — a partial block
// (e.g. a Faith/Occult-era export) is a wrong shape, not a clampable value.
const attributesSchema = z.object(
  Object.fromEntries(SHEET_ATTRIBUTE_KEYS.map((k) => [k, clamped(1, 30)])) as Record<
    (typeof SHEET_ATTRIBUTE_KEYS)[number],
    ReturnType<typeof clamped>
  >,
);

const sheetImportSchema = z.object({
  name: z.string().optional(),
  level: clamped(1, 50).optional(),
  species: z.enum(SPECIES_KEYS).optional(),
  className: z.string().optional(),
  soulLevel: z.enum(SOUL_LEVEL_KEYS).optional(),
  attributes: attributesSchema.optional(),
  conditionMods: z
    .object({
      HP: z.number().finite(),
      Mana: z.number().finite(),
      Stamina: z.number().finite(),
      Reserve: z.number().finite(),
    })
    .optional(),
  currentXP: z
    .number()
    .finite()
    .transform((n) => Math.max(0, n))
    .optional(),
});

/**
 * Validate an imported sheet document. Returns a clean partial state safe to
 * hand to `loadState`, or `null` (with a console.warn) when the document is
 * rejected — the caller keeps today's silent-ignore UX.
 */
export function parseSheetImport(data: unknown): Partial<CharacterSheetState> | null {
  const result = sheetImportSchema.safeParse(data);
  if (!result.success) {
    console.warn('Sheet import rejected:', result.error.issues);
    return null;
  }
  return result.data as Partial<CharacterSheetState>;
}
