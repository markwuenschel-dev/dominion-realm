// ─────────────────────────────────────────────────────────────────────────────
// lib/castProfiles.ts
// Scaffold character sheet profiles for the main cast.
// All values are PLACEHOLDER — not derived from any canon doc.
// Attributes are tuned to each character's narrative role at level 1 (Human,
// 4 pts budget). Flip `scaffold: false` once canonical values are locked.
// ─────────────────────────────────────────────────────────────────────────────

import type { CharacterSheetState } from '@/types/characterSheet';

export interface CastProfile {
  id: string;
  displayName: string;
  role: string;
  scaffold: true;
  state: Omit<CharacterSheetState, 'conditionMods' | 'currentResources'>;
}

const BASE_ATTRS = {
  CON: 5,
  END: 5,
  STR: 5,
  AGI: 5,
  DEX: 5,
  INT: 5,
  WIS: 5,
  CHA: 5,
  Faith: 5,
  Occult: 5,
  LUCK: 5,
} as const;

export const CAST_PROFILES: CastProfile[] = [
  {
    id: 'marcus',
    displayName: 'Marcus Vye',
    role: 'Protagonist · Interface Walker',
    scaffold: true,
    state: {
      name: 'Marcus Vye',
      level: 1,
      species: 'Human',
      className: 'Psion',
      classAcquisitionLevel: 1,
      soulLevel: 'Common',
      attributes: { ...BASE_ATTRS, INT: 7, WIS: 6, Faith: 6 }, // 4 pts: +2 INT +1 WIS +1 Faith
      currentXP: 0,
    },
  },
  {
    id: 'serra',
    displayName: 'Serra Hawthorne',
    role: 'The Disruptor',
    scaffold: true,
    state: {
      name: 'Serra Hawthorne',
      level: 1,
      species: 'Human',
      className: 'Rogue',
      classAcquisitionLevel: 1,
      soulLevel: 'Common',
      attributes: { ...BASE_ATTRS, AGI: 7, DEX: 6, CHA: 6 }, // 4 pts: +2 AGI +1 DEX +1 CHA
      currentXP: 0,
    },
  },
  {
    id: 'seb',
    displayName: 'Seb Rainier',
    role: 'The Leader',
    scaffold: true,
    state: {
      name: 'Seb Rainier',
      level: 1,
      species: 'Human',
      className: 'Warden',
      classAcquisitionLevel: 1,
      soulLevel: 'Common',
      attributes: { ...BASE_ATTRS, CHA: 7, STR: 6, CON: 6 }, // 4 pts: +2 CHA +1 STR +1 CON
      currentXP: 0,
    },
  },
  {
    id: 'brent',
    displayName: 'Brent Donovan',
    role: 'The Floor',
    scaffold: true,
    state: {
      name: 'Brent Donovan',
      level: 1,
      species: 'Human',
      className: 'Warrior',
      classAcquisitionLevel: 1,
      soulLevel: 'Common',
      attributes: { ...BASE_ATTRS, CON: 7, STR: 6, END: 6 }, // 4 pts: +2 CON +1 STR +1 END
      currentXP: 0,
    },
  },
  {
    id: 'mara',
    displayName: 'Mara Valeria',
    role: 'The Watcher',
    scaffold: true,
    state: {
      name: 'Mara Valeria',
      level: 1,
      species: 'Human',
      className: 'Scout',
      classAcquisitionLevel: 1,
      soulLevel: 'Common',
      attributes: { ...BASE_ATTRS, DEX: 7, AGI: 6, WIS: 6 }, // 4 pts: +2 DEX +1 AGI +1 WIS
      currentXP: 0,
    },
  },
  {
    id: 'mathias',
    displayName: 'Mathias Sterling',
    role: 'The Scout',
    scaffold: true,
    state: {
      name: 'Mathias Sterling',
      level: 1,
      species: 'Human',
      className: 'Scout',
      classAcquisitionLevel: 1,
      soulLevel: 'Common',
      attributes: { ...BASE_ATTRS, INT: 6, AGI: 6, DEX: 6, WIS: 6 }, // 4 pts: +1 each
      currentXP: 0,
    },
  },
];
