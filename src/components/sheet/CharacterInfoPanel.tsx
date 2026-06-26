'use client';

import { Input } from '@/components/ui/index';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCharacterSheetStore } from '@/store/characterSheetStore';
import {
  SPECIES_TEMPLATES,
  CLASS_TEMPLATES,
  SOUL_LEVELS,
  RARITY_COLORS,
  type SpeciesKey,
  type ClassKey,
  type SoulLevelKey,
} from '@/lib/characterTemplates';
import { useCharacterSheet } from '@/hooks/useCharacterSheet';
import { cn } from '@/lib/utils';

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
      {children}
    </p>
  );
}

export function CharacterInfoPanel() {
  const name = useCharacterSheetStore((s) => s.name);
  const level = useCharacterSheetStore((s) => s.level);
  const species = useCharacterSheetStore((s) => s.species);
  const className = useCharacterSheetStore((s) => s.className);
  const classAcquisitionLevel = useCharacterSheetStore((s) => s.classAcquisitionLevel);
  const soulLevel = useCharacterSheetStore((s) => s.soulLevel);
  const currentXP = useCharacterSheetStore((s) => s.currentXP);

  const setName = useCharacterSheetStore((s) => s.setName);
  const setLevel = useCharacterSheetStore((s) => s.setLevel);
  const setSpecies = useCharacterSheetStore((s) => s.setSpecies);
  const setClassName = useCharacterSheetStore((s) => s.setClassName);
  const setClassAcquisitionLevel = useCharacterSheetStore((s) => s.setClassAcquisitionLevel);
  const setSoulLevel = useCharacterSheetStore((s) => s.setSoulLevel);
  const setCurrentXP = useCharacterSheetStore((s) => s.setCurrentXP);

  const { xpToNextLevel, xpProgressPercent, classBonusPoints } = useCharacterSheet();
  const classTemplate = CLASS_TEMPLATES[className];
  const rarityClass = RARITY_COLORS[classTemplate.rarity];

  return (
    <div className="rounded-lg border border-rim bg-panel p-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {/* Name */}
        <div className="col-span-2 sm:col-span-1">
          <FieldLabel>Name</FieldLabel>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-8 text-sm font-semibold"
            placeholder="Character name"
          />
        </div>

        {/* Level */}
        <div>
          <FieldLabel>Level</FieldLabel>
          <Input
            type="number"
            min={1}
            max={50}
            value={level}
            onChange={(e) => {
              const n = parseInt(e.target.value, 10);
              if (!isNaN(n)) setLevel(n);
            }}
            className="h-8 stat-value text-sm text-center"
          />
        </div>

        {/* Species */}
        <div>
          <FieldLabel>Species</FieldLabel>
          <Select value={species} onValueChange={(v) => setSpecies(v as SpeciesKey)}>
            <SelectTrigger className="h-8 text-xs">
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
        </div>

        {/* Class */}
        <div>
          <FieldLabel>Class</FieldLabel>
          <Select value={className} onValueChange={(v) => setClassName(v as ClassKey)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.values(CLASS_TEMPLATES).map((c) => (
                <SelectItem key={c.key} value={c.key} className="text-xs">
                  <span className={cn('font-semibold', RARITY_COLORS[c.rarity].split(' ')[0])}>
                    {c.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {className !== 'None' && (
            <p className={cn('mt-0.5 text-[10px] font-semibold', rarityClass.split(' ')[0])}>
              {classTemplate.rarity} ·{' '}
              {classBonusPoints > 0 ? `+${classBonusPoints} bonus pts` : 'no bonus pts yet'}
            </p>
          )}
        </div>

        {/* Class acq. level */}
        {className !== 'None' && (
          <div>
            <FieldLabel>Class acq. level</FieldLabel>
            <Input
              type="number"
              min={1}
              max={level}
              value={classAcquisitionLevel}
              onChange={(e) => {
                const n = parseInt(e.target.value, 10);
                if (!isNaN(n)) setClassAcquisitionLevel(n);
              }}
              className="h-8 stat-value text-sm text-center"
            />
          </div>
        )}

        {/* Soul level */}
        <div>
          <FieldLabel>Soul Level</FieldLabel>
          <Select value={soulLevel} onValueChange={(v) => setSoulLevel(v as SoulLevelKey)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SOUL_LEVELS.map((s) => (
                <SelectItem key={s.key} value={s.key} className="text-xs">
                  {s.label}{' '}
                  <span className="text-muted-foreground">×{s.multiplier.toFixed(2)}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* XP bar */}
      <div className="mt-3 border-t border-rim/30 pt-3">
        <div className="mb-1 flex items-center justify-between">
          <FieldLabel>XP Progress</FieldLabel>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={0}
              value={currentXP}
              onChange={(e) => {
                const n = parseInt(e.target.value, 10);
                if (!isNaN(n)) setCurrentXP(n);
              }}
              className="h-6 w-20 stat-value text-xs text-center"
            />
            <span className="text-[10px] text-muted-foreground">/ {xpToNextLevel} XP</span>
          </div>
        </div>
        <div className="resource-bar">
          <div
            className="resource-bar-fill bg-realm-gold"
            style={{ width: `${xpProgressPercent}%` }}
          />
        </div>
        <p className="mt-0.5 text-[10px] text-muted-foreground/50">
          {xpProgressPercent}% · {Math.max(0, xpToNextLevel - currentXP)} XP to level {level + 1}
        </p>
      </div>
    </div>
  );
}
