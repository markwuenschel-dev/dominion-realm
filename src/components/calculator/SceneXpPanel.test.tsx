import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SceneXpPanel } from './SceneXpPanel';

/**
 * Wiring test for the Scene XP panel — the `sceneXP` maths is covered in
 * xpFormulas.test.ts, so here we just confirm the threshold input feeds the
 * awarded-XP readout. Default band is the first (evidence 0.04):
 * 500 · (1 − e^−0.04) ≈ 19.6; 1000 · … ≈ 39.2.
 */
describe('SceneXpPanel', () => {
  it('computes the awarded XP from the threshold at the default band', () => {
    render(<SceneXpPanel />);
    const input = screen.getByLabelText(/Threshold XP/i) as HTMLInputElement;
    expect(input.value).toBe('500');
    expect(screen.getByText('19.6')).toBeInTheDocument();
  });

  it('updates the award when the threshold changes', () => {
    render(<SceneXpPanel />);
    const input = screen.getByLabelText(/Threshold XP/i);
    fireEvent.change(input, { target: { value: '1000' } });
    expect(screen.getByText('39.2')).toBeInTheDocument();
  });
});
