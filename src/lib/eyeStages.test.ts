import { describe, it, expect } from 'vitest';
import { EYE_STAGE_NAMES, stageNumeral, eyeStageLabel } from './eyeStages';

/**
 * The canonical stage-name vocabulary the codex dossier maps `1`–`6` through.
 * Pins the numerals and the composed label so a stage renders consistently
 * wherever it's referenced.
 */
describe('stageNumeral', () => {
  it('maps 1–6 to roman numerals', () => {
    expect([1, 2, 3, 4, 5, 6].map(stageNumeral)).toEqual(['I', 'II', 'III', 'IV', 'V', 'VI']);
  });

  it('falls back to the arabic string out of range', () => {
    expect(stageNumeral(7)).toBe('7');
    expect(stageNumeral(0)).toBe('0');
  });
});

describe('eyeStageLabel', () => {
  it('composes "Stage <numeral> · <name>" for a named stage', () => {
    expect(eyeStageLabel(1)).toBe('Stage I · Limbal Shift');
    expect(eyeStageLabel(6)).toBe('Stage VI · Prism Coherence');
  });

  it('omits the name when the stage has none', () => {
    expect(eyeStageLabel(9)).toBe('Stage 9');
  });

  it('names every stage 1–6', () => {
    for (let s = 1; s <= 6; s++) expect(EYE_STAGE_NAMES[s]).toBeTruthy();
  });
});
