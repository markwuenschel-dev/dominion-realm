/**
 * The type-agnostic Subject model (ADR-0011, CONTEXT.md § Media). Storage is
 * uniform for every kind; this map only decides which optional *type slots* the
 * Studio surfaces for a given kind, so a Character never sees a Map field and a
 * Place does. Adding a new kind needs no schema change — it simply gets the
 * DEFAULT_SLOTS until you list it here.
 */

/** Every kind a Subject can be. Extend freely — the picture layer stays generic. */
export const SUBJECT_KINDS = [
  { value: 'character', title: 'Character' },
  { value: 'place', title: 'Place' },
  { value: 'faction', title: 'Faction' },
  { value: 'concept', title: 'Concept' },
  { value: 'item', title: 'Item / Artifact' },
  { value: 'creature', title: 'Creature / Race' },
  { value: 'event', title: 'Event' },
  { value: 'power', title: 'Power / Magic' },
  { value: 'combat-system', title: 'Combat System' },
] as const;

export type SubjectKind = (typeof SUBJECT_KINDS)[number]['value'];

/** The named type slots, beyond the universal Primary + Gallery. */
export type TypeSlot = 'banner' | 'map' | 'sigil';

/** Which type slots each kind shows. Every kind gets a Banner by default. */
const KIND_SLOTS: Record<string, TypeSlot[]> = {
  character: ['banner'],
  place: ['banner', 'map'],
  faction: ['banner', 'sigil'],
  concept: ['banner'],
  item: ['banner'],
  creature: ['banner'],
  event: ['banner'],
  power: ['banner'],
  'combat-system': ['banner'],
};

/** New / unlisted kinds still get a Banner, so they're never featureless. */
const DEFAULT_SLOTS: TypeSlot[] = ['banner'];

export function slotsForKind(kind: string | undefined): TypeSlot[] {
  return (kind && KIND_SLOTS[kind]) || DEFAULT_SLOTS;
}

export function isSlotVisible(kind: string | undefined, slot: TypeSlot): boolean {
  return slotsForKind(kind).includes(slot);
}
