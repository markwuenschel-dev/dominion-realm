'use client';

import { SectionCard } from '@/components/layout/SectionCard';
import { Slider, Input, Label } from '@/components/ui/index';
import { useCharacterSheet } from '@/hooks/useCharacterSheet';
import { useCharacterSheetStore } from '@/store/characterSheetStore';
import { RESOURCE_COLORS } from '@/types';
import { getDepletionBand } from '@/lib/characterTemplates';
import type { ResourceBreakdown } from '@/types/characterSheet';

function ResourceBlock({ bd }: { bd: ResourceBreakdown }) {
  const r = bd.resource;
  const colors = RESOURCE_COLORS[r];

  const currentResources = useCharacterSheetStore((s) => s.currentResources);
  const setCurrentResource = useCharacterSheetStore((s) => s.setCurrentResource);
  const conditionMods = useCharacterSheetStore((s) => s.conditionMods);
  const setConditionMod = useCharacterSheetStore((s) => s.setConditionMod);

  const current = Math.min(currentResources[r], bd.final);
  const pct = bd.final > 0 ? Math.round((current / bd.final) * 100) : 0;
  const band = getDepletionBand(r, pct);

  const parts = [
    `${bd.attributeValue}`,
    bd.raceMod !== 1 ? `× ${bd.raceMod.toFixed(3)}` : null,
    bd.classMod !== 1 ? `× ${bd.classMod.toFixed(3)}` : null,
    bd.soulMultiplier !== 1 ? `× ${bd.soulMultiplier.toFixed(2)}` : null,
    bd.conditionMod !== 1 ? `× ${bd.conditionMod.toFixed(2)}` : null,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={`rounded-md border p-4 ${colors.border} bg-panel-raised`}>
      <div className="flex items-baseline justify-between">
        <span className={`text-sm font-semibold ${colors.text}`}>{r}</span>
        <span className="stat-value text-2xl font-bold text-foreground">{bd.final}</span>
      </div>

      <p className="stat-value mt-0.5 text-[10px] text-muted-foreground/60">
        {parts} = {bd.final}
      </p>

      <div className="mt-3">
        <div className="resource-bar mb-1.5">
          <div className={`resource-bar-fill ${colors.bg}`} style={{ width: `${pct}%` }} />
        </div>
        <div className="flex items-center gap-2">
          <Slider
            min={0}
            max={bd.final}
            step={1}
            value={[current]}
            onValueChange={([v]) => v !== undefined && setCurrentResource(r, v)}
            className="flex-1"
            aria-label={`Current ${r}`}
          />
          <span className="stat-value text-xs w-10 text-right text-muted-foreground">
            {current}/{bd.final}
          </span>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between">
        <span className={`text-xs font-semibold ${band.color}`}>{band.label}</span>
        <span className="text-[10px] text-muted-foreground/60">{band.description}</span>
      </div>

      <div className="mt-2 flex items-center gap-2 border-t border-rim/30 pt-2">
        <Label className="text-[10px] text-muted-foreground/50 flex-1">ConditionMod</Label>
        <Input
          type="number"
          min={0}
          max={2}
          step={0.05}
          value={conditionMods[r]}
          onChange={(e) => {
            const n = parseFloat(e.target.value);
            if (!isNaN(n)) setConditionMod(r, n);
          }}
          className="h-6 w-16 px-1.5 stat-value text-xs text-center"
          title="Injury / buff / environment multiplier"
        />
      </div>
    </div>
  );
}

export function ComputedResourcesPanel() {
  const { breakdowns } = useCharacterSheet();

  return (
    <SectionCard
      section="§4"
      title="Final Resources"
      subtitle="AttributeResource × RaceMod × ClassMod × SoulMult (Reserve) × ConditionMod"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {breakdowns.map((bd) => (
          <ResourceBlock key={bd.resource} bd={bd} />
        ))}
      </div>

      <div className="mt-4 rounded border border-rim/40 bg-panel px-3 py-2 text-xs text-muted-foreground">
        <span className="font-semibold text-foreground/60">Reserve</span> additionally scales by
        Soul Level multiplier. Drag each resource bar to simulate depletion states. ConditionMod =
        injury / buff / environment modifier (1.0 = none).
      </div>
    </SectionCard>
  );
}
