'use client';

import { SectionCard } from '@/components/layout/SectionCard';
import { Slider, Input, Label } from '@/components/ui/index';
import { useCharacterSheetStore } from '@/store/characterSheetStore';
import { useCharacterSheet } from '@/hooks/useCharacterSheet';
import { SHEET_ATTRIBUTE_GROUPS } from '@/types/characterSheet';
import type { SheetAttributeKey } from '@/types/characterSheet';
import { cn } from '@/lib/utils';

const FORMULA_ATTRS = new Set([
  'CON',
  'END',
  'STR',
  'AGI',
  'DEX',
  'INT',
  'WIS',
  'CHA',
  'Faith',
  'Occult',
]);

function AttributeRow({ attrKey, isFormula }: { attrKey: SheetAttributeKey; isFormula: boolean }) {
  const value = useCharacterSheetStore((s) => s.attributes[attrKey]);
  const setAttribute = useCharacterSheetStore((s) => s.setAttribute);

  return (
    <div className="grid grid-cols-[3.5rem_1fr_2.5rem] items-center gap-3">
      <Label
        htmlFor={`sheet-attr-${attrKey}`}
        className={cn(
          'stat-value text-xs font-semibold tracking-wider uppercase',
          isFormula ? 'text-muted-foreground' : 'text-muted-foreground/40',
        )}
        title={isFormula ? 'Used in resource formulas' : 'No formula effect in current lock'}
      >
        {attrKey}
      </Label>

      <Slider
        id={`sheet-attr-${attrKey}`}
        min={1}
        max={30}
        step={1}
        value={[value]}
        onValueChange={([v]) => v !== undefined && setAttribute(attrKey, v)}
        aria-label={attrKey}
        className={cn(!isFormula && 'opacity-40')}
      />

      <Input
        type="number"
        min={1}
        max={30}
        value={value}
        onChange={(e) => {
          const n = parseInt(e.target.value, 10);
          if (!isNaN(n)) setAttribute(attrKey, n);
        }}
        className="h-7 w-full px-1.5 text-center stat-value text-xs"
        aria-label={`${attrKey} value`}
      />
    </div>
  );
}

export function AttributeAllocationPanel() {
  const { totalFreePoints, classBonusPoints, totalPointsAvailable, spentPoints, remainingPoints } =
    useCharacterSheet();

  const isOverBudget = remainingPoints < 0;

  return (
    <SectionCard
      section="§3"
      title="Attributes"
      subtitle="11 attributes · LUCK tracked but has no formula effect in current lock"
      headerRight={
        <div className="text-right">
          <p
            className={cn(
              'stat-value text-sm font-bold',
              isOverBudget ? 'text-red-400' : 'text-realm-gold',
            )}
          >
            {spentPoints} / {totalPointsAvailable}
          </p>
          <p className="text-[10px] text-muted-foreground/60">pts spent</p>
        </div>
      }
    >
      <div className="mb-4 flex flex-wrap gap-3 rounded-md border border-rim/40 bg-panel px-3 py-2 text-xs">
        <span className="text-muted-foreground">
          Free: <span className="stat-value text-foreground/80">{totalFreePoints}</span>
        </span>
        {classBonusPoints > 0 && (
          <span className="text-muted-foreground">
            Class bonus: <span className="stat-value text-realm-gold">+{classBonusPoints}</span>
          </span>
        )}
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

      <div className="flex flex-col gap-5">
        {SHEET_ATTRIBUTE_GROUPS.map((group) => (
          <div key={group.label}>
            <div className="mb-2.5 flex items-center gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                {group.label}
              </p>
              {group.note && (
                <p className="text-[10px] text-muted-foreground/40 italic">{group.note}</p>
              )}
            </div>
            <div className="flex flex-col gap-3">
              {group.keys.map((key) => (
                <AttributeRow key={key} attrKey={key} isFormula={FORMULA_ATTRS.has(key)} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
