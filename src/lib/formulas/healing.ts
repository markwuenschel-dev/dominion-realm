// ─────────────────────────────────────────────────────────────────────────────
// lib/formulas/healing.ts
// §12  Healing and Repair System
// §13  Healing Source Field
// §14  Healing Access / Penetration
// §15  Domain Compatibility Matrix
// §16  Repair Demand and Absorption
// §17  Dynamic Healing Allocation
// §18  Repair Rate
// §19  Wound Field Evolution
// §21  Condition Cleansing
// ─────────────────────────────────────────────────────────────────────────────

import type { HealingChannel, HealingPulseInput, HealingPulseResult, ChannelResult } from '@/types';

// ────────────────────────────────────────────────
// §14  Healing Penetration
// ────────────────────────────────────────────────

/**
 * P_heal,j = A_heal,j^α / (A_heal,j^α + B_heal,j^α)
 */
export function computeHealingPenetration(
  healingAccess: number,
  barrier: number,
  alpha: number,
): number {
  if (healingAccess <= 0) return 0;
  const a = Math.pow(healingAccess, alpha);
  const b = Math.pow(barrier, alpha);
  return a / (a + b);
}

// ────────────────────────────────────────────────
// §15  Domain Compatibility
// ────────────────────────────────────────────────

/** Compatibility_j = clamp(e^(k_κ · κ_j), 0, 2.0) */
export function computeCompatibilityFromKappa(kappa: number, k_kappa = 1.0): number {
  const raw = Math.exp(k_kappa * kappa);
  return Math.min(Math.max(raw, 0), 2.0);
}

// ────────────────────────────────────────────────
// §16  Repair Demand and Absorption
// ────────────────────────────────────────────────

/** Absorption_j = W_j / (W_j + K_{W,j}) */
export function computeAbsorption(demand: number, K_W: number): number {
  if (demand <= 0) return 0;
  return demand / (demand + K_W);
}

// ────────────────────────────────────────────────
// §17  Dynamic Healing Allocation
// ────────────────────────────────────────────────

/** Channel weight = Priority_j × W_j × Compatibility_j */
export function computeAllocationWeights(channels: HealingChannel[]): number[] {
  return channels.map((ch) => ch.priority * ch.demand * ch.compatibility);
}

export function computeAllocations(weights: number[]): number[] {
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return weights.map(() => 0);
  return weights.map((w) => w / total);
}

// ────────────────────────────────────────────────
// §18  Repair Rate
// ────────────────────────────────────────────────

/** RepairRate_j = a_j · H_D · P_heal,j · Compatibility_j · Absorption_j · η_j */
export function computeChannelRepair(
  H0: number,
  allocation: number,
  penetration: number,
  compatibility: number,
  absorption: number,
  eta: number,
): number {
  return H0 * allocation * penetration * compatibility * absorption * eta;
}

// ────────────────────────────────────────────────
// §17–18  Full Healing Pulse (entry point for the UI)
// ────────────────────────────────────────────────

export function computeHealingPulse(input: HealingPulseInput): HealingPulseResult {
  const { H0, channels } = input;

  if (channels.length === 0) {
    return { totalWeight: 0, totalRepair: 0, channels: [] };
  }

  const penetrations = channels.map((ch) =>
    computeHealingPenetration(ch.healingAccess, ch.barrier, ch.alpha),
  );
  const absorptions = channels.map((ch) => computeAbsorption(ch.demand, ch.K_W));
  const weights = computeAllocationWeights(channels);
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const allocations = computeAllocations(weights);

  const channelResults: ChannelResult[] = channels.map((ch, i) => {
    const penetration = penetrations[i]!;
    const absorption = absorptions[i]!;
    const allocation = allocations[i]!;
    const weight = weights[i]!;

    return {
      id: ch.id,
      label: ch.label,
      weight,
      allocation,
      penetration,
      absorption,
      repair: computeChannelRepair(
        H0,
        allocation,
        penetration,
        ch.compatibility,
        absorption,
        ch.eta,
      ),
    };
  });

  const totalRepair = channelResults.reduce((sum, ch) => sum + ch.repair, 0);

  return { totalWeight, totalRepair, channels: channelResults };
}

// ────────────────────────────────────────────────
// §19  Wound Field Evolution
// ────────────────────────────────────────────────

/** Discrete step: ΔW_j = (damageInput − repairRate + aggravation) × dt */
export function stepWoundField(
  currentDemand: number,
  repairRate: number,
  damageInput = 0,
  aggravation = 0,
  dt = 1.0,
): number {
  const delta = (damageInput - repairRate + aggravation) * dt;
  return Math.max(0, currentDemand + delta);
}

/** InjuryLoad_j = sum of demand across spatial zones. */
export function computeInjuryLoad(demands: number[]): number {
  return demands.reduce((a, b) => a + b, 0);
}

// ────────────────────────────────────────────────
// §21  Condition Cleansing
// ────────────────────────────────────────────────

export function computeCleanseRate(
  healingField: number,
  cleavagePenetration: number,
  compatibility: number,
  bindingAccess: number,
  efficiency: number,
): number {
  return healingField * cleavagePenetration * compatibility * bindingAccess * efficiency;
}
