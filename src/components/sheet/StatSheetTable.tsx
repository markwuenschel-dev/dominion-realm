'use client';

import React, { useRef, useState } from 'react';
import { useCharacterSheetStore } from '@/store/characterSheetStore';
import { useCharacterSheet } from '@/hooks/useCharacterSheet';
import {
  SPECIES_TEMPLATES,
  SOUL_LEVELS,
  type SpeciesKey,
  type SoulLevelKey,
} from '@/lib/characterTemplates';
import {
  getClassProfile,
  getClassAttrMultiplier,
  describeClassAttrRoles,
  classesByRarity,
  PICKER_RARITIES,
  type ClassKey,
  type AttrKey,
} from '@/lib/classTaxonomy';
import { getSoulMultiplier } from '@/lib/formulas/progression';
import { formatResourceFormula } from '@/lib/formulas/resources';
import { effectiveAttribute } from '@/lib/formulas/resourceChain';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  RESOURCE_COLORS,
  RARITY_COLORS,
  RARITY_TEXT_COLORS,
  SOUL_LEVEL_TEXT_COLORS,
} from '@/lib/palette';
import { cn } from '@/lib/utils';
import type { SheetAttributeKey } from '@/types/characterSheet';
import { CAST_PROFILES } from '@/lib/castProfiles';

// ─────────────────────────────────────────────────────────────────────────────
// Table primitives
// ─────────────────────────────────────────────────────────────────────────────

function TD({
  children,
  colSpan = 1,
  className,
}: {
  children?: React.ReactNode;
  colSpan?: number;
  className?: string;
}) {
  return (
    <td
      colSpan={colSpan}
      className={cn('border border-border-rim/25 px-3 py-2.5 align-top', className)}
    >
      {children}
    </td>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.14em] text-primary/60">
      {children}
    </p>
  );
}

function SectionHeaderRow({ title, scaffolded = false }: { title: string; scaffolded?: boolean }) {
  return (
    <tr>
      <td
        colSpan={3}
        className="border border-border-rim/25 bg-panel/20 px-4 py-1.5 text-center text-[10px] font-bold uppercase tracking-[0.18em] text-primary"
      >
        {title}
        {scaffolded && (
          <span className="ml-2 text-[9px] font-normal text-primary/35">[scaffold]</span>
        )}
      </td>
    </tr>
  );
}

function ScaffoldTD({ label, colSpan = 1 }: { label: string; colSpan?: number }) {
  return (
    <TD colSpan={colSpan}>
      <FieldLabel>{label}</FieldLabel>
      <span className="text-sm text-muted-foreground/20 italic">—</span>
    </TD>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Attribute cell with ± controls
// ─────────────────────────────────────────────────────────────────────────────

function AttrCell({ attrKey, dimmed = false }: { attrKey: SheetAttributeKey; dimmed?: boolean }) {
  const rawValue = useCharacterSheetStore((s) => s.attributes[attrKey]);
  const classKey = useCharacterSheetStore((s) => s.className);
  const setAttribute = useCharacterSheetStore((s) => s.setAttribute);

  const profile = getClassProfile(classKey);
  // LUCK is never scaled, so it never carries a multiplier badge (guards the
  // Gambler/Fatewright LUCK-Prime case). The displayed number comes from the same
  // seam the resource formulas consume, so cell and formula can't disagree.
  const mod = attrKey === 'LUCK' ? 1 : getClassAttrMultiplier(profile, attrKey as AttrKey);
  const effective = effectiveAttribute(rawValue, profile, attrKey as AttrKey);

  return (
    <TD>
      <div className="flex items-baseline justify-between">
        <FieldLabel>
          {attrKey}
          {dimmed && <span className="ml-1 text-primary/30">(no formula)</span>}
        </FieldLabel>
        {mod !== 1.0 && <span className="text-[9px] text-primary">×{mod.toFixed(2)}</span>}
      </div>
      <div className={cn('flex items-center gap-2', dimmed && 'opacity-35')}>
        <button
          onClick={() => setAttribute(attrKey, rawValue - 1)}
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-rim/30 text-xs text-muted-foreground/50 transition-colors hover:border-primary/50 hover:text-primary"
          aria-label={`Decrease ${attrKey}`}
        >
          −
        </button>
        <span className="stat-value w-8 text-center text-lg font-bold leading-none text-foreground">
          {effective}
        </span>
        <button
          onClick={() => setAttribute(attrKey, rawValue + 1)}
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-rim/30 text-xs text-muted-foreground/50 transition-colors hover:border-primary/50 hover:text-primary"
          aria-label={`Increase ${attrKey}`}
        >
          +
        </button>
      </div>
    </TD>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Resource stat cell (div-based, lives inside the 4-cell grid)
// ─────────────────────────────────────────────────────────────────────────────

function ResourceStatDiv({
  label,
  value,
  formula,
  colorClass,
  borderRight = true,
  mobileBorderBottom = false,
}: {
  label: string;
  value: number;
  formula?: string;
  colorClass: string;
  borderRight?: boolean;
  mobileBorderBottom?: boolean;
}) {
  return (
    <div
      className={cn(
        'bg-panel/50 px-3 py-4',
        borderRight && 'border-r border-border-rim/25',
        mobileBorderBottom && 'border-b border-border-rim/25 sm:border-b-0',
      )}
    >
      <FieldLabel>{label}</FieldLabel>
      <p className={cn('stat-value text-4xl font-bold leading-none', colorClass)}>{value}</p>
      {formula && (
        <p className="mt-1.5 text-[10px] leading-snug text-muted-foreground/60">{formula}</p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main table
// ─────────────────────────────────────────────────────────────────────────────

export function StatSheetTable() {
  const name = useCharacterSheetStore((s) => s.name);
  const level = useCharacterSheetStore((s) => s.level);
  const species = useCharacterSheetStore((s) => s.species);
  const className = useCharacterSheetStore((s) => s.className);
  const soulLevel = useCharacterSheetStore((s) => s.soulLevel);
  const currentXP = useCharacterSheetStore((s) => s.currentXP);

  const setName = useCharacterSheetStore((s) => s.setName);
  const setLevel = useCharacterSheetStore((s) => s.setLevel);
  const setSpecies = useCharacterSheetStore((s) => s.setSpecies);
  const setClassName = useCharacterSheetStore((s) => s.setClassName);
  const setSoulLevel = useCharacterSheetStore((s) => s.setSoulLevel);
  const setCurrentXP = useCharacterSheetStore((s) => s.setCurrentXP);
  const reset = useCharacterSheetStore((s) => s.resetToDefaults);
  const loadState = useCharacterSheetStore((s) => s.loadState);

  const [selectedProfileId, setSelectedProfileId] = useState('');
  const importRef = useRef<HTMLInputElement>(null);

  const {
    finalResources,
    breakdowns,
    totalFreePoints,
    totalPointsAvailable,
    spentPoints,
    remainingPoints,
    xpToNextLevel,
    xpProgressPercent,
  } = useCharacterSheet();

  const classProfile = getClassProfile(className);
  const soulMult = getSoulMultiplier(soulLevel);
  const isOverBudget = remainingPoints < 0;

  // Unique-tier classes have no defined progression scale (N_cycle undefined).
  const xpUndefined = xpToNextLevel === null;
  const xpNextLabel = xpUndefined ? '—' : Math.round(xpToNextLevel);
  const xpProgressWidth = xpProgressPercent ?? 0;

  const bd = {
    HP: breakdowns.find((b) => b.resource === 'HP')!,
    Mana: breakdowns.find((b) => b.resource === 'Mana')!,
    Stamina: breakdowns.find((b) => b.resource === 'Stamina')!,
    Reserve: breakdowns.find((b) => b.resource === 'Reserve')!,
  };

  // Class influence now shows on each AttrCell as a per-attribute ×multiplier
  // badge, so the resource formula string only carries the race modifier.
  function mods(b: (typeof bd)['HP']) {
    return b.raceMod !== 1 ? `×${b.raceMod} race` : '';
  }

  function handleLoadProfile() {
    const profile = CAST_PROFILES.find((p) => p.id === selectedProfileId);
    if (profile) {
      loadState(profile.state);
      setSelectedProfileId('');
    }
  }

  function handleExport() {
    const state = useCharacterSheetStore.getState();
    const data = {
      name: state.name,
      level: state.level,
      species: state.species,
      className: state.className,
      soulLevel: state.soulLevel,
      attributes: state.attributes,
      conditionMods: state.conditionMods,
      currentXP: state.currentXP,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${state.name || 'character'}-sheet.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (typeof data === 'object' && data !== null) loadState(data);
      } catch {
        // ignore malformed JSON
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  const footerBtnBase = 'rounded border px-3 py-1.5 text-[11px] font-medium transition-all';

  return (
    <div className="overflow-hidden rounded-lg border border-border-rim/40">
      <table className="w-full border-collapse text-sm">
        <tbody>
          {/* ── IDENTITY ── */}
          <tr className="bg-panel/40">
            <TD className="border-t-0 border-l-0">
              <FieldLabel>Name</FieldLabel>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Character name"
                className="heading-realm w-full bg-transparent text-lg font-semibold text-primary placeholder:text-primary/25 focus:outline-none"
              />
            </TD>
            <TD className="border-t-0">
              <FieldLabel>Age</FieldLabel>
              <input
                placeholder="—"
                className="stat-value w-full bg-transparent text-base text-foreground/80 placeholder:text-muted-foreground/25 focus:outline-none"
              />
            </TD>
            <TD className="border-t-0 border-r-0">
              <FieldLabel>Level</FieldLabel>
              <div className="flex items-baseline gap-2">
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={level}
                  onChange={(e) => {
                    const n = parseInt(e.target.value, 10);
                    if (!isNaN(n)) setLevel(n);
                  }}
                  className="stat-value w-10 bg-transparent text-lg font-bold text-foreground focus:outline-none"
                />
                <span className="stat-value text-sm text-muted-foreground">
                  {xpUndefined ? '—' : `${xpProgressPercent}%`}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-1.5">
                <div
                  className={cn(
                    'h-1 flex-1 overflow-hidden rounded-full bg-muted',
                    xpUndefined && 'opacity-40',
                  )}
                  title={xpUndefined ? 'Unique — progression scale undefined' : undefined}
                >
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${xpProgressWidth}%` }}
                  />
                </div>
                <input
                  type="number"
                  min={0}
                  value={currentXP}
                  onChange={(e) => {
                    const n = parseInt(e.target.value, 10);
                    if (!isNaN(n)) setCurrentXP(n);
                  }}
                  className="stat-value w-16 bg-transparent text-right text-xs text-muted-foreground/60 focus:outline-none"
                  title={
                    xpUndefined
                      ? 'Unique — progression scale undefined'
                      : `XP to next: ${xpNextLabel}`
                  }
                />
                <span className="text-[10px] text-muted-foreground/50">/ {xpNextLabel}</span>
              </div>
            </TD>
          </tr>

          {/* ── RACE / CLASS / SOUL ── */}
          <tr>
            <TD>
              <FieldLabel>Race</FieldLabel>
              <Select value={species} onValueChange={(v) => setSpecies(v as SpeciesKey)}>
                <SelectTrigger className="h-7 w-full border-0 bg-transparent p-0 text-sm text-foreground/90 shadow-none focus:ring-0 [&>svg]:ml-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(SPECIES_TEMPLATES).map((s) => (
                    <SelectItem key={s.key} value={s.key} className="text-xs">
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-0.5 text-[9px] text-muted-foreground/40">
                {SPECIES_TEMPLATES[species].pointsPerLevel} pts/level
              </p>
            </TD>
            <TD>
              <FieldLabel>Class</FieldLabel>
              <Select value={className} onValueChange={(v) => setClassName(v as ClassKey)}>
                <SelectTrigger
                  className={cn(
                    'h-7 w-full border-0 bg-transparent p-0 text-sm shadow-none focus:ring-0 [&>svg]:ml-1',
                    RARITY_TEXT_COLORS[classProfile.rarity],
                  )}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="None" className="text-xs">
                    <span className={RARITY_TEXT_COLORS.Unclassed}>Unclassed</span>
                  </SelectItem>
                  {PICKER_RARITIES.map((tier) => (
                    <SelectGroup key={tier}>
                      <SelectLabel className="text-[10px] uppercase tracking-wider text-amber-400/60">
                        {tier}
                      </SelectLabel>
                      {classesByRarity[tier].map((c) => (
                        <SelectItem key={c.key} value={c.key} className="text-xs">
                          <span className={RARITY_TEXT_COLORS[c.rarity]}>{c.label}</span>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
              {className !== 'None' && (
                <p className={cn('mt-0.5 text-[9px]', RARITY_COLORS[classProfile.rarity])}>
                  {classProfile.rarity} · {classProfile.resourceShape}
                </p>
              )}
            </TD>
            <TD>
              <FieldLabel>Soul Level</FieldLabel>
              <Select value={soulLevel} onValueChange={(v) => setSoulLevel(v as SoulLevelKey)}>
                <SelectTrigger
                  className={cn(
                    'h-7 w-full border-0 bg-transparent p-0 text-sm shadow-none focus:ring-0 [&>svg]:ml-1',
                    SOUL_LEVEL_TEXT_COLORS[soulLevel],
                  )}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOUL_LEVELS.map((sl) => (
                    <SelectItem key={sl.key} value={sl.key} className="text-xs">
                      <span className={SOUL_LEVEL_TEXT_COLORS[sl.key]}>{sl.label}</span>
                      <span className="ml-1 text-[9px] text-muted-foreground/50">
                        ({sl.multiplier}×)
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className={cn('mt-0.5 text-[9px]', SOUL_LEVEL_TEXT_COLORS[soulLevel])}>
                Reserve ×{soulMult}
              </p>
            </TD>
          </tr>

          {/* ── POINT BUDGET ── */}
          <tr>
            <TD colSpan={3} className="bg-panel py-1.5">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-[10px]">
                <span className="text-muted-foreground/50">
                  Points · free:{' '}
                  <span className="stat-value text-foreground/70">{totalFreePoints}</span> ={' '}
                  <span className="stat-value text-foreground/70">{totalPointsAvailable}</span>
                </span>
                <span className="text-muted-foreground/50">
                  spent: <span className="stat-value text-foreground/70">{spentPoints}</span>
                </span>
                <span
                  className={cn(
                    'stat-value font-semibold',
                    isOverBudget ? 'text-red-400' : 'text-emerald-400',
                  )}
                >
                  {isOverBudget
                    ? `${Math.abs(remainingPoints)} over budget`
                    : `${remainingPoints} remaining`}
                </span>
              </div>
            </TD>
          </tr>

          {/* ── STATS ── */}
          <SectionHeaderRow title="Stats" />
          <tr>
            {/* All 4 resources in one responsive row: 2-col on mobile, 4-col on sm+ */}
            <td colSpan={3} className="border border-border-rim/25 p-0">
              <div className="grid grid-cols-2 sm:grid-cols-4">
                <ResourceStatDiv
                  label="Health"
                  value={finalResources.HP}
                  formula={`${formatResourceFormula('HP')} = ${bd.HP.attributeValue}${mods(bd.HP) ? ` ${mods(bd.HP)}` : ''}`}
                  colorClass={RESOURCE_COLORS.HP.text}
                  borderRight
                  mobileBorderBottom
                />
                <ResourceStatDiv
                  label="Mana"
                  value={finalResources.Mana}
                  formula={`${formatResourceFormula('Mana')} = ${bd.Mana.attributeValue}${mods(bd.Mana) ? ` ${mods(bd.Mana)}` : ''}`}
                  colorClass={RESOURCE_COLORS.Mana.text}
                  borderRight
                  mobileBorderBottom
                />
                <ResourceStatDiv
                  label="Stamina"
                  value={finalResources.Stamina}
                  formula={`${formatResourceFormula('Stamina')} = ${bd.Stamina.attributeValue}${mods(bd.Stamina) ? ` ${mods(bd.Stamina)}` : ''}`}
                  colorClass={RESOURCE_COLORS.Stamina.text}
                  borderRight
                />
                <ResourceStatDiv
                  label="Reserve"
                  value={finalResources.Reserve}
                  formula={`${formatResourceFormula('Reserve')} = ${bd.Reserve.attributeValue} ×${soulMult} soul${mods(bd.Reserve) ? ` ${mods(bd.Reserve)}` : ''}`}
                  colorClass={RESOURCE_COLORS.Reserve.text}
                  borderRight={false}
                />
              </div>
            </td>
          </tr>

          {/* ── ATTRIBUTES ── */}
          <SectionHeaderRow title="Attributes" />
          <tr>
            <AttrCell attrKey="STR" />
            <AttrCell attrKey="AGI" />
            <AttrCell attrKey="DEX" />
          </tr>
          <tr>
            <AttrCell attrKey="CON" />
            <AttrCell attrKey="END" />
            <AttrCell attrKey="INT" />
          </tr>
          <tr>
            <AttrCell attrKey="WIS" />
            <AttrCell attrKey="CHA" />
            <AttrCell attrKey="LUCK" dimmed />
          </tr>
          <tr>
            <AttrCell attrKey="CVN" />
            <AttrCell attrKey="MYS" />
            <TD className="bg-panel/30">
              {className !== 'None' && (
                <>
                  <FieldLabel>Class attr mods ({classProfile.rarity})</FieldLabel>
                  {describeClassAttrRoles(classProfile).map((group, i) => (
                    <p
                      key={group.role}
                      className={cn('text-[9px] text-muted-foreground/40', i > 0 && 'mt-0.5')}
                    >
                      {group.role}{' '}
                      <span className="text-primary/70">
                        {group.attrs.join(', ')} ×{group.multiplier.toFixed(2)}
                      </span>
                    </p>
                  ))}
                </>
              )}
            </TD>
          </tr>

          {/* ── SPELL POWER BONUSES [SCAFFOLD] ── */}
          <SectionHeaderRow title="Spell Power Bonuses" scaffolded />
          <tr>
            <ScaffoldTD label="Air" />
            <ScaffoldTD label="Light" />
            <ScaffoldTD label="Fire" />
          </tr>
          <tr>
            <ScaffoldTD label="Life" />
            <ScaffoldTD label="Blood" />
            <ScaffoldTD label="Earth" />
          </tr>

          {/* ── RESISTANCES — Types of Magic [SCAFFOLD] ── */}
          <SectionHeaderRow title="Resistances (Types of Magic)" scaffolded />
          <tr>
            <ScaffoldTD label="Air" />
            <ScaffoldTD label="Earth" />
            <ScaffoldTD label="Fire" />
          </tr>
          <tr>
            <ScaffoldTD label="Life" />
            <ScaffoldTD label="Mental" />
            <ScaffoldTD label="Spiritual" />
          </tr>
          <tr>
            <ScaffoldTD label="Light" />
            <ScaffoldTD label="Blood" />
            <TD />
          </tr>

          {/* ── RESISTANCES — Schools of Magic [SCAFFOLD] ── */}
          <SectionHeaderRow title="Resistances (Schools of Magic)" scaffolded />
          <tr>
            <ScaffoldTD label="Enchantment" colSpan={3} />
          </tr>

          {/* ── SKILLS / MARKS / ABILITIES [SCAFFOLD] ── */}
          <tr>
            <td colSpan={3} className="border border-border-rim/25 p-0">
              <div className="grid grid-cols-3 divide-x divide-border-rim/25">
                {(['Skills', 'Marks', 'Abilities'] as const).map((label) => (
                  <div
                    key={label}
                    className="px-4 py-1.5 text-center text-[10px] font-bold uppercase tracking-[0.18em] text-primary"
                  >
                    {label}
                    <span className="ml-1.5 text-[9px] font-normal text-primary/35">
                      [scaffold]
                    </span>
                  </div>
                ))}
              </div>
            </td>
          </tr>
          <tr>
            <TD className="text-xs italic text-muted-foreground/25">None</TD>
            <TD className="text-xs italic text-muted-foreground/25">None</TD>
            <TD className="text-xs italic text-muted-foreground/25">None</TD>
          </tr>

          {/* ── FOOTER ── */}
          <tr>
            <td colSpan={3} className="border-t border-border-rim/20 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                {/* Cast profile loader */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground/50">Cast profile:</span>
                  <Select value={selectedProfileId} onValueChange={setSelectedProfileId}>
                    <SelectTrigger className="h-7 w-40 border-border-rim/30 bg-panel/20 text-xs text-primary/70 focus:ring-0">
                      <SelectValue placeholder="Select character…" />
                    </SelectTrigger>
                    <SelectContent>
                      {CAST_PROFILES.map((p) => (
                        <SelectItem key={p.id} value={p.id} className="text-xs">
                          <span>{p.displayName}</span>
                          <span className="ml-1.5 text-[9px] text-muted-foreground/50">
                            {p.role}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <button
                    onClick={handleLoadProfile}
                    disabled={!selectedProfileId}
                    className={cn(
                      footerBtnBase,
                      'border-border-rim/40 bg-panel/30 text-primary/70',
                      'hover:border-primary/60 hover:bg-panel/50 hover:text-primary',
                      'disabled:cursor-not-allowed disabled:opacity-30',
                    )}
                  >
                    Load ↗
                  </button>
                  <span className="text-[9px] text-primary/25">[scaffold]</span>
                </div>

                {/* Right: import / export / reset */}
                <div className="flex items-center gap-2">
                  <input
                    ref={importRef}
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={handleImport}
                  />
                  <button
                    onClick={() => importRef.current?.click()}
                    className={cn(
                      footerBtnBase,
                      'border-rim/30 text-muted-foreground/50',
                      'hover:border-rim/60 hover:text-muted-foreground',
                    )}
                  >
                    ↑ Import
                  </button>
                  <button
                    onClick={handleExport}
                    className={cn(
                      footerBtnBase,
                      'border-rim/30 text-muted-foreground/50',
                      'hover:border-rim/60 hover:text-muted-foreground',
                    )}
                  >
                    ↓ Export
                  </button>
                  <button
                    onClick={reset}
                    className={cn(
                      footerBtnBase,
                      'border-border-rim/40 bg-panel/30 text-primary/70',
                      'hover:border-primary/60 hover:bg-panel/50 hover:text-primary',
                    )}
                  >
                    ↺ Reset to Level 1
                  </button>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
