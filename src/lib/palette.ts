// ─────────────────────────────────────────────────────────────────────────────
// lib/palette.ts — presentation colour maps for the sheet + calculator.
//
// One home for the Tailwind class strings (and the resource SVG hexes) that used
// to ride along inside the formula-domain types (types/index.ts) and the canon-
// data modules (classTaxonomy, characterTemplates). Those modules now carry only
// domain data; this gives a single answer to "where are the colours?" so a
// re-theme touches one file. Keys are the domain vocabularies, so every resource,
// rarity, and soul level is exhaustively covered (enforced by Record<Key, …>).
// ─────────────────────────────────────────────────────────────────────────────

import type { ResourceKey } from '@/types';
import type { ClassRarity } from '@/lib/classTaxonomy';
import type { SoulLevelKey } from '@/lib/characterTemplates';

export interface ResourceColor {
  bg: string; // Tailwind bg class
  text: string; // Tailwind text class
  border: string; // Tailwind border class
  hex: string; // Raw hex for SVG
}

export const RESOURCE_COLORS: Record<ResourceKey, ResourceColor> = {
  HP: { bg: 'bg-red-500', text: 'text-red-400', border: 'border-red-500/40', hex: '#ef4444' },
  Mana: { bg: 'bg-blue-500', text: 'text-blue-400', border: 'border-blue-500/40', hex: '#3b82f6' },
  Stamina: {
    bg: 'bg-emerald-500',
    text: 'text-emerald-400',
    border: 'border-emerald-500/40',
    hex: '#10b981',
  },
  Reserve: {
    bg: 'bg-violet-500',
    text: 'text-violet-400',
    border: 'border-violet-500/40',
    hex: '#8b5cf6',
  },
};

// Rarity badge colors. Epic reuses the old Exceptional violet slot; Fabled sits
// between Epic and Legendary with a distinct amber-leaning tone.
export const RARITY_COLORS: Record<ClassRarity, string> = {
  Unclassed: 'text-zinc-500 border-zinc-700',
  Common: 'text-zinc-300 border-zinc-600',
  Uncommon: 'text-green-400 border-green-700',
  Rare: 'text-blue-400 border-blue-700',
  Epic: 'text-violet-400 border-violet-700',
  Fabled: 'text-amber-300 border-amber-800',
  Legendary: 'text-amber-400 border-amber-700',
  Mythic: 'text-orange-400 border-orange-700',
  Unique: 'text-red-400 border-red-700',
};

export const RARITY_TEXT_COLORS: Record<ClassRarity, string> = {
  Unclassed: 'text-zinc-500',
  Common: 'text-zinc-300',
  Uncommon: 'text-green-400',
  Rare: 'text-blue-400',
  Epic: 'text-violet-400',
  Fabled: 'text-amber-300',
  Legendary: 'text-amber-400',
  Mythic: 'text-orange-400',
  Unique: 'text-red-400',
};

// Spectra-mapped text color per soul level. Sub-Common (Fractured→Lesser) are
// muted grey; above Common they follow the site's spectral gradient
// (cyan→blue→purple→pink→gold).
export const SOUL_LEVEL_TEXT_COLORS: Record<SoulLevelKey, string> = {
  Fractured: 'text-zinc-600',
  Faint: 'text-zinc-500',
  Weak: 'text-zinc-400',
  Lesser: 'text-slate-400',
  Common: 'text-zinc-300',
  Strong: 'text-cyan-400',
  Luminous: 'text-sky-400',
  Radiant: 'text-blue-400',
  Brilliant: 'text-indigo-400',
  Resplendent: 'text-violet-400',
  Exalted: 'text-fuchsia-400',
  Transcendent: 'text-pink-400',
  Divine: 'text-rose-400',
  Absolute: 'text-amber-400',
};
