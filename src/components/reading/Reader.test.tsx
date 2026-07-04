import { describe, it, expect, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Reader } from './Reader';
import { READING_PREFS_KEY, FONT_SCALE, parsePrefs } from '@/lib/readingProgress';

/**
 * The reader toolbar: shows the reading-time cue, and its Text/Spacing controls
 * drive the prose CSS variables on the document element and persist to storage.
 * (No `.reading-prose` in the test tree, so the scroll/resume effect no-ops —
 * exactly the guard the component relies on.)
 */
afterEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('style');
});

describe('Reader', () => {
  it('shows the reading-time cue and both control groups', () => {
    render(<Reader chapterId="01-chapter-one" minutes={6} />);
    expect(screen.getByText('~6 min')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Increase text size/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Decrease line spacing/i })).toBeInTheDocument();
  });

  it('increasing text size updates the CSS var and persists the pref', async () => {
    const user = userEvent.setup();
    render(<Reader chapterId="01-chapter-one" minutes={6} />);

    const before = getComputedStyle(document.documentElement).getPropertyValue(
      '--reading-font-scale',
    );
    expect(before.trim()).toBe(String(FONT_SCALE.default));

    await user.click(screen.getByRole('button', { name: /Increase text size/i }));

    const after = parseFloat(
      document.documentElement.style.getPropertyValue('--reading-font-scale'),
    );
    expect(after).toBeGreaterThan(FONT_SCALE.default);
    expect(parsePrefs(localStorage.getItem(READING_PREFS_KEY)).fontScale).toBe(after);
  });

  it('disables the control at its bound', async () => {
    const user = userEvent.setup();
    render(<Reader chapterId="01-chapter-one" minutes={6} />);
    const decrease = screen.getByRole('button', { name: /Decrease text size/i });
    // Step down from 1.0 to the 0.85 floor (0.05 steps): 3 clicks reaches it.
    await user.click(decrease);
    await user.click(decrease);
    await user.click(decrease);
    expect(decrease).toBeDisabled();
  });
});
