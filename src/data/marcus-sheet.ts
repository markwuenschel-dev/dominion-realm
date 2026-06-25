/**
 * Marcus's character sheet, as his implant renders it (backlog Phase 3 #9).
 * The /interface page is driven entirely by this typed data, so the LitRPG
 * mechanics are fillable without touching markup. Everything here is
 * PLACEHOLDER — `provisional: true` shows a banner saying so. Mark replaces the
 * values (and the mechanics), then flips `provisional` to false and sets the
 * `interface` nav entry to `ready: true` in `src/lib/site.ts`.
 */

export interface SheetStat {
  /** Short label, e.g. "Perception". */
  label: string;
  value: number;
  max: number;
  /** Optional one-liner shown under the bar. */
  note?: string;
}

export interface SheetSkill {
  name: string;
  /** Free-form tier/rank, e.g. "Active · II" or "Passive". */
  tier: string;
  desc: string;
}

export interface SheetItem {
  name: string;
  /** Slot/category, e.g. "Implant", "Relic", "Consumable". */
  kind: string;
  note?: string;
}

export interface CharacterSheet {
  /** When true the page shows a "provisional data" banner. */
  provisional: boolean;
  name: string;
  handle?: string;
  /** Class / archetype line. */
  archetype: string;
  /** Epithet under the name. */
  title: string;
  level: number;
  /** Flavor status line "through the interface". */
  readout: string;
  stats: SheetStat[];
  skills: SheetSkill[];
  inventory: SheetItem[];
}

export const marcusSheet: CharacterSheet = {
  provisional: true,
  name: 'Marcus Vye',
  handle: 'the Ocular Interface',
  archetype: 'Systems Reader · Interface Walker',
  title: 'The one who keeps mistaking the map for the world',
  level: 1,
  readout: 'INTERFACE ONLINE — translation layer nominal. Substrate pressure: rising.',
  stats: [
    {
      label: 'Perception',
      value: 9,
      max: 10,
      note: 'Reads the structure under things — accurately, then wrongly.',
    },
    { label: 'Reason', value: 8, max: 10, note: 'Models the Realm faster than it can be lived.' },
    { label: 'Resolve', value: 5, max: 10, note: 'Holds, until the numbers stop reassuring him.' },
    { label: 'Vitality', value: 4, max: 10, note: 'A fragile mind behind a fragile body.' },
    { label: 'Attunement', value: 6, max: 10, note: 'The interface is learning. So is he.' },
  ],
  skills: [
    {
      name: 'Read the Substrate',
      tier: 'Passive',
      desc: 'Perceives the spectral layers beneath the interface as legible bands — health, threat, intent.',
    },
    {
      name: 'Translation Layer',
      tier: 'Active · I',
      desc: 'Renders a hostile reality as RPG logic. A mercy, not a truth — and it leaves things out.',
    },
    {
      name: "Ayla's Counterweight",
      tier: 'Passive',
      desc: 'The voice that refuses to hand him the answer, naming the place his reasoning broke.',
    },
  ],
  inventory: [
    {
      name: 'Neuroquantum Lattice',
      kind: 'Implant',
      note: 'Threaded into the optic nerve. Not removable.',
    },
    { name: 'Neurochromatic Eyes', kind: 'Interface', note: 'Stage I — Limbal Shift.' },
    { name: '[ placeholder item ]', kind: 'Relic', note: 'Mark: fill from the manuscript.' },
  ],
};
