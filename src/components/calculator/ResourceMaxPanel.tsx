'use client';

import { SectionCard } from '@/components/layout/SectionCard';
import { Slider } from '@/components/ui/index';
import { useCalculator } from '@/hooks/useCalculator';
import { useCalculatorStore } from '@/store/calculatorStore';
import { RESOURCE_KEYS, RESOURCE_COLORS } from '@/types';
import { fmtResource, round } from '@/lib/utils';

function ResourceRow({ resource }: { resource: (typeof RESOURCE_KEYS)[number] }) {
  const { maxima, ratios } = useCalculator();
  const currentResources = useCalculatorStore((s) => s.currentResources);
  const setCurrentResource = useCalculatorStore((s) => s.setCurrentResource);
  const colors = RESOURCE_COLORS[resource];

  const max = maxima[resource];
  const current = currentResources[resource];
  const q = ratios[resource];
  const qPct = round(q * 100, 0);

  const isFloor = resource === 'Mana' || resource === 'Stamina';
  const isOverextension = isFloor && q < 0.2;

  return (
    <div className={`rounded-md border p-3 ${colors.border} bg-panel-raised`}>
      <div className="flex items-center justify-between">
        <span className={`text-sm font-semibold ${colors.text}`}>{resource}</span>
        <span className="stat-value text-base font-bold text-foreground">
          {fmtResource(current)}{' '}
          <span className="text-xs font-normal text-muted-foreground">/ {fmtResource(max)}</span>
        </span>
      </div>

      <div className="resource-bar my-2">
        <div className={`resource-bar-fill ${colors.bg}`} style={{ width: `${qPct}%` }} />
      </div>

      <div className="flex items-center gap-3">
        <Slider
          min={0}
          max={Math.max(1, max)}
          step={1}
          value={[current]}
          onValueChange={([v]) => v !== undefined && setCurrentResource(resource, v)}
          className="flex-1"
          aria-label={`Current ${resource}`}
        />
        <span
          className={`stat-value text-xs w-9 text-right ${
            isOverextension ? 'text-red-400' : 'text-muted-foreground'
          }`}
        >
          {qPct}%
        </span>
      </div>

      {isOverextension && (
        <p className="mt-1 text-[10px] text-amber-500">Reserve buffer active — below 20% floor</p>
      )}
    </div>
  );
}

export function ResourceMaxPanel() {
  return (
    <SectionCard
      section="§1"
      title="Resource Maxima"
      subtitle="Interface-facing approximations · drag bars to set current"
    >
      <div className="flex flex-col gap-3">
        {RESOURCE_KEYS.map((r) => (
          <ResourceRow key={r} resource={r} />
        ))}
      </div>
    </SectionCard>
  );
}
