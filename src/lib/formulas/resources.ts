// ─────────────────────────────────────────────────────────────────────────────
// lib/formulas/resources.ts
// §1  Resource Maximums — Interface-facing approximations
// §2  Current Resource Dynamics (q ratio)
// §6  Reserve Accounting and Overdraw
// ─────────────────────────────────────────────────────────────────────────────

import type { Attributes, ResourceMaxima, ResourceRatios, CurrentResources } from '@/types';
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

/** HP_max = 6·CON + 2·END + 2·STR */
export function computeHPMax(attrs: Attributes): number {
  return (
    HP_COEFFICIENTS.CON * attrs.CON +
    HP_COEFFICIENTS.END * attrs.END +
    HP_COEFFICIENTS.STR * attrs.STR
  );
}

/** Mana_max = 6·INT + 3·WIS + CHA */
export function computeManaMax(attrs: Attributes): number {
  return (
    MANA_COEFFICIENTS.INT * attrs.INT +
    MANA_COEFFICIENTS.WIS * attrs.WIS +
    MANA_COEFFICIENTS.CHA * attrs.CHA
  );
}

/** Stamina_max = 5·END + 2·CON + STR + AGI + DEX */
export function computeStaminaMax(attrs: Attributes): number {
  return (
    STAMINA_COEFFICIENTS.END * attrs.END +
    STAMINA_COEFFICIENTS.CON * attrs.CON +
    STAMINA_COEFFICIENTS.STR * attrs.STR +
    STAMINA_COEFFICIENTS.AGI * attrs.AGI +
    STAMINA_COEFFICIENTS.DEX * attrs.DEX
  );
}

/** Reserve_max = (2·CON + 2·END + 2·WIS + Faith + Occult) × SoulLevelMod */
export function computeReserveMax(attrs: Attributes, soulLevelMod = 1.0): number {
  const base =
    RESERVE_COEFFICIENTS.CON * attrs.CON +
    RESERVE_COEFFICIENTS.END * attrs.END +
    RESERVE_COEFFICIENTS.WIS * attrs.WIS +
    RESERVE_COEFFICIENTS.Faith * attrs.Faith +
    RESERVE_COEFFICIENTS.Occult * attrs.Occult;
  return base * soulLevelMod;
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
