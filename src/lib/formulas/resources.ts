// ─────────────────────────────────────────────────────────────────────────────
// lib/formulas/resources.ts
// §1  Resource Maximums — Interface-facing approximations
// §2  Current Resource Dynamics (q ratio)
// §6  Reserve Accounting and Overdraw
// ─────────────────────────────────────────────────────────────────────────────

import type {
  Attributes,
  AttributeKey,
  ResourceMaxima,
  ResourceRatios,
  CurrentResources,
} from '@/types';
import {
  HP_COEFFICIENTS,
  MANA_COEFFICIENTS,
  STAMINA_COEFFICIENTS,
  RESERVE_COEFFICIENTS,
  MANA_RESERVE_RATIO,
  STAMINA_RESERVE_RATIO,
  MANA_FLOOR_FRACTION,
  STAMINA_FLOOR_FRACTION,
} from '@/lib/constants';

// ────────────────────────────────────────────────
// §1.1  Resource Maxima
// ────────────────────────────────────────────────

/**
 * Sum a coefficient record against attribute values: Σ coeff · attrs[key].
 * Only the keys present in `coeffs` contribute — extra attribute fields are
 * ignored, matching the hand-written term-by-term sums this replaces.
 */
function sumCoefficients(
  coeffs: Partial<Record<AttributeKey, number>>,
  attrs: Attributes,
): number {
  return Object.entries(coeffs).reduce(
    (sum, [key, coeff]) => sum + coeff * attrs[key as AttributeKey],
    0,
  );
}

/** HP_max = 6·CON + 2·END + 2·STR */
export function computeHPMax(attrs: Attributes): number {
  return sumCoefficients(HP_COEFFICIENTS, attrs);
}

/** Mana_max = 6·INT + 3·WIS + CHA */
export function computeManaMax(attrs: Attributes): number {
  return sumCoefficients(MANA_COEFFICIENTS, attrs);
}

/** Stamina_max = 5·END + 2·CON + STR + AGI + DEX */
export function computeStaminaMax(attrs: Attributes): number {
  return sumCoefficients(STAMINA_COEFFICIENTS, attrs);
}

/** Reserve_max = (2·CON + 2·END + 2·WIS + CVN + MYS) × SoulLevelMod */
export function computeReserveMax(attrs: Attributes, soulLevelMod = 1.0): number {
  return sumCoefficients(RESERVE_COEFFICIENTS, attrs) * soulLevelMod;
}

/** Compute all four resource maxima at once. */
export function computeResourceMaxima(attrs: Attributes, soulLevelMod = 1.0): ResourceMaxima {
  return {
    HP: computeHPMax(attrs),
    Mana: computeManaMax(attrs),
    Stamina: computeStaminaMax(attrs),
    Reserve: computeReserveMax(attrs, soulLevelMod),
  };
}

// ────────────────────────────────────────────────
// §1.2  Formula labels — derived from the coefficient source of truth
// ────────────────────────────────────────────────

/** Display abbreviations for attribute keys whose label differs from the key.
 *  CVN/MYS are already display-ready three-letter abbreviations, so this is empty. */
const ATTR_LABEL: Record<string, string> = {};

const RESOURCE_COEFFICIENTS = {
  HP: HP_COEFFICIENTS,
  Mana: MANA_COEFFICIENTS,
  Stamina: STAMINA_COEFFICIENTS,
  Reserve: RESERVE_COEFFICIENTS,
} as const satisfies Record<keyof ResourceMaxima, Record<string, number>>;

/**
 * Render a resource's §1 coefficient formula as a display string
 * (e.g. "6·CON+2·END+2·STR"), derived from the same coefficients the maxima use.
 * A coefficient of 1 is omitted.
 */
export function formatResourceFormula(resource: keyof ResourceMaxima): string {
  const coeffs = RESOURCE_COEFFICIENTS[resource];
  return Object.entries(coeffs)
    .map(([attr, c]) => {
      const label = ATTR_LABEL[attr] ?? attr;
      return c === 1 ? label : `${c}·${label}`;
    })
    .join('+');
}

// ────────────────────────────────────────────────
// §2  Current Resource Ratios  q = R(t) / R_max
// ────────────────────────────────────────────────

/** q = R(t) / R_max — clamped to [0, 1]. */
export function computeQ(current: number, max: number): number {
  if (max <= 0) return 0;
  return Math.min(Math.max(current / max, 0), 1);
}

/** Compute q for all four resources. */
export function computeAllRatios(
  current: CurrentResources,
  maxima: ResourceMaxima,
): ResourceRatios {
  return {
    HP: computeQ(current.HP, maxima.HP),
    Mana: computeQ(current.Mana, maxima.Mana),
    Stamina: computeQ(current.Stamina, maxima.Stamina),
    Reserve: computeQ(current.Reserve, maxima.Reserve),
  };
}

// ────────────────────────────────────────────────
// §6  Reserve Accounting
// ────────────────────────────────────────────────

/** Mana floor below which Reserve buffers forced casting. */
export function computeManaFloor(manaMax: number): number {
  return manaMax * MANA_FLOOR_FRACTION;
}

/** Stamina floor below which Reserve buffers forced exertion. */
export function computeStaminaFloor(staminaMax: number): number {
  return staminaMax * STAMINA_FLOOR_FRACTION;
}

/**
 * ReserveDebit = ForcedManaDeficit/5 + ForcedStaminaDeficit/5
 * - 1 Reserve = 5 Mana deficit
 * - 1 Reserve = 5 Stamina deficit
 */
export function computeReserveDebit(
  forcedManaDeficit: number,
  forcedStaminaDeficit: number,
): number {
  return forcedManaDeficit / MANA_RESERVE_RATIO + forcedStaminaDeficit / STAMINA_RESERVE_RATIO;
}
