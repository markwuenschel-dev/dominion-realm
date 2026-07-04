// ─────────────────────────────────────────────────────────────────────────────
// lib/classTaxonomy.test.ts
// The class attribute-multiplier firewall: the single seam through which class
// influence enters the resource pipeline. Locks the Prime/Core/Secondary/Neutral
// ladder and the unknown-key → Neutral contract, and the role model that both the
// formula (multiplier) and the sheet badge (role + multiplier) read from.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import {
  getClassProfile,
  getClassAttrMultiplier,
  getAttrRole,
  describeClassAttrRoles,
  ATTR_ROLE_MULTIPLIERS,
} from './classTaxonomy';

describe('getClassAttrMultiplier — the firewall ladder (characterization)', () => {
  const warrior = getClassProfile('Warrior'); // Prime STR/END, Core CON/AGI/DEX, Secondary WIS/CVN
  const unclassed = getClassProfile('None');

  it('maps a Prime attribute to ×1.15', () => {
    expect(getClassAttrMultiplier(warrior, 'STR')).toBe(ATTR_ROLE_MULTIPLIERS.Prime);
    expect(getClassAttrMultiplier(warrior, 'STR')).toBe(1.15);
  });

  it('maps Core → ×1.08, Secondary → ×1.03, and everything else → ×1.0', () => {
    expect(getClassAttrMultiplier(warrior, 'CON')).toBe(1.08); // Core
    expect(getClassAttrMultiplier(warrior, 'WIS')).toBe(1.03); // Secondary
    expect(getClassAttrMultiplier(warrior, 'INT')).toBe(1.0); // Neutral (unlisted)
  });

  it('resolves every attribute of an Unclassed profile to ×1.0', () => {
    expect(getClassAttrMultiplier(unclassed, 'STR')).toBe(1.0);
    expect(getClassAttrMultiplier(unclassed, 'MYS')).toBe(1.0);
  });

  it('agrees with the role model for every role (multiplier = ATTR_ROLE_MULTIPLIERS[role])', () => {
    for (const attr of ['STR', 'CON', 'WIS', 'INT'] as const) {
      expect(getClassAttrMultiplier(warrior, attr)).toBe(
        ATTR_ROLE_MULTIPLIERS[getAttrRole(warrior, attr)],
      );
    }
  });
});

describe('getAttrRole — the role each attribute plays for a class', () => {
  const warrior = getClassProfile('Warrior');

  it('reports Prime / Core / Secondary / Neutral from the profile', () => {
    expect(getAttrRole(warrior, 'STR')).toBe('Prime');
    expect(getAttrRole(warrior, 'CON')).toBe('Core');
    expect(getAttrRole(warrior, 'WIS')).toBe('Secondary');
    expect(getAttrRole(warrior, 'INT')).toBe('Neutral');
  });

  it('reports Neutral for every attribute of an Unclassed profile', () => {
    expect(getAttrRole(getClassProfile('None'), 'STR')).toBe('Neutral');
  });
});

describe('describeClassAttrRoles — the labelled ladder the sheet badge renders', () => {
  it('returns Prime, Core and Secondary groups with their multipliers', () => {
    const warrior = getClassProfile('Warrior');
    expect(describeClassAttrRoles(warrior)).toEqual([
      { role: 'Prime', attrs: ['STR', 'END'], multiplier: 1.15 },
      { role: 'Core', attrs: ['CON', 'AGI', 'DEX'], multiplier: 1.08 },
      { role: 'Secondary', attrs: ['WIS', 'CVN'], multiplier: 1.03 },
    ]);
  });

  it('omits empty role groups (Unclassed has none)', () => {
    expect(describeClassAttrRoles(getClassProfile('None'))).toEqual([]);
  });
});
