/**
 * Canonical names for the six stages of the Neurochromatic Eyes — the shared
 * label source for anywhere that references a stage by number (the codex dossier
 * on character/concept entries, and future surfaces). The interactive `/eyes`
 * console (`EyesClient`) keeps its own richer per-stage dataset (hues, costs,
 * marked-up names); this module is the plain-text vocabulary those numbers map
 * to, so a `1`–`6` stage renders a label without duplicating that array.
 */

export const EYE_STAGE_NAMES: Record<number, string> = {
  1: 'Limbal Shift',
  2: 'Iris Refraction',
  3: 'Neuro-Optical Overdrive',
  4: 'Spectral Partition',
  5: 'Gaze Interference',
  6: 'Prism Coherence',
};

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI'] as const;

/** Roman numeral for a stage 1–6; returns the arabic string if out of range. */
export function stageNumeral(stage: number): string {
  return stage >= 1 && stage <= 6 ? ROMAN[stage] : String(stage);
}

/** "Stage III · Neuro-Optical Overdrive" — or just "Stage III" if unnamed. */
export function eyeStageLabel(stage: number): string {
  const name = EYE_STAGE_NAMES[stage];
  return name ? `Stage ${stageNumeral(stage)} · ${name}` : `Stage ${stageNumeral(stage)}`;
}
