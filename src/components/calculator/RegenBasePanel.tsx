'use client';

import { SectionCard } from '@/components/layout/SectionCard';
import { useCalculator } from '@/hooks/useCalculator';
import { RESOURCE_KEYS, RESOURCE_COLORS } from '@/types';
import { round } from '@/lib/utils';

function RegenRow({ resource }: { resource: (typeof RESOURCE_KEYS)[number] }) {
  const { baseRegen, regenResults } = useCalculator();
  const colors = RESOURCE_COLORS[resource];

  const base = baseRegen[resource];
  const result = regenResults.find((r) => r.resource === resource);
  if (!result) return null;

  const { multiplier, actualRegen, zone } = result;
  const pct = round(multiplier * 100, 0);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className={`text-sm font-semibold ${colors.text}`}>{resource}</span>
        <div className="flex items-baseline gap-1.5">
          <span className="stat-value text-base font-bold text-foreground">
            {round(actualRegen, 2)}
          </span>
          <span className="text-xs text-muted-foreground">/tick</span>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Base <span className="stat-value text-foreground/70">{round(base, 2)}</span> ×{' '}
          <span
            className={`stat-value ${pct < 25 ? 'text-red-400' : pct < 60 ? 'text-amber-400' : 'text-emerald-400'}`}
          >
            {pct}%
          </span>
        </span>
        <span className="zone-chip" data-zone={zone}>
          {zone}
        </span>
      </div>

      <div className="resource-bar">
        <div
          className="resource-bar-fill"
          style={{
            width: `${pct}%`,
            background: pct < 25 ? '#ef4444' : pct < 60 ? '#f59e0b' : '#10b981',
          }}
        />
      </div>
    </div>
  );
}

export function RegenBasePanel() {
  const { regenResults } = useCalculator();
  const hasZero = regenResults.some((r) => r.zone === 'zero');

  return (
    <SectionCard
      section="§3–5"
      title="Regeneration"
      subtitle="BaseRegen × RecoveryStateMod × curve(q) — per tick"
    >
      <div className="flex flex-col gap-5">
        {RESOURCE_KEYS.map((r) => (
          <RegenRow key={r} resource={r} />
        ))}

        {hasZero && (
          <p className="rounded border border-red-900/40 bg-red-950/20 px-3 py-2 text-xs text-red-400">
            One or more resources at zero — failure state. Regen suppressed.
          </p>
        )}

        <p className="text-[10px] text-muted-foreground/60">
          Reserve regen is blocked during combat / acute stress (ReserveRegen = 0). Adjust
          RecoveryStateMod in the attribute panel to model rest states.
        </p>
      </div>
    </SectionCard>
  );
}
