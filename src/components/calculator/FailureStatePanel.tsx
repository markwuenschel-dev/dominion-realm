'use client';

import { SectionCard } from '@/components/layout/SectionCard';
import { useResourceRatios } from '@/hooks/useCalculator';
import { RESOURCE_KEYS } from '@/types';
import { RESOURCE_COLORS } from '@/lib/palette';
import { round } from '@/lib/utils';

const ZONE_THRESHOLDS = [
  {
    label: 'Safe',
    min: 0.2,
    max: 1.0,
    color: 'text-emerald-400',
    bg: 'bg-emerald-950/20 border-emerald-900/30',
  },
  {
    label: 'Overextension',
    min: 0.0,
    max: 0.2,
    color: 'text-amber-400',
    bg: 'bg-amber-950/20 border-amber-900/30',
  },
  {
    label: 'Collapse',
    min: -0.01,
    max: 0.001,
    color: 'text-red-400',
    bg: 'bg-red-950/20 border-red-900/30',
  },
];

const FAILURE_DESCRIPTIONS: Record<
  (typeof RESOURCE_KEYS)[number],
  { safe: string; overextension: string; collapse: string; reserve_note: string }
> = {
  HP: {
    safe: 'Functional body integrity intact',
    overextension: '(HP has no Reserve buffer — damage goes straight to dying)',
    collapse: 'Death / dying / unconsciousness / catastrophic injury',
    reserve_note: 'No Reserve buffer for HP loss',
  },
  Mana: {
    safe: 'Casting strain, weaker sustained output',
    overextension: 'Overcast zone — Reserve buffers forced casting',
    collapse: 'Spell failure, mana crash, channel instability, interface haze',
    reserve_note: '1 Reserve = 5 Mana deficit',
  },
  Stamina: {
    safe: 'Tired but safe physical output',
    overextension: 'Overexertion zone — Reserve buffers forced exertion',
    collapse: 'Collapse, cannot sprint/fight; ExhaustionLoad rising',
    reserve_note: '1 Reserve = 5 Stamina deficit',
  },
  Reserve: {
    safe: 'Emergency buffer available',
    overextension: 'Deep strain — soul/interface systems under stress',
    collapse: 'Catastrophic hard stop: soul strain, interface crash, seizure-equivalent',
    reserve_note: 'Reserve backlash if debit rate exceeds safe rate',
  },
};

function ResourceZoneRow({ resource, q }: { resource: (typeof RESOURCE_KEYS)[number]; q: number }) {
  const colors = RESOURCE_COLORS[resource];
  const qPct = round(q * 100, 1);
  const desc = FAILURE_DESCRIPTIONS[resource];

  let activeZone: 'safe' | 'overextension' | 'collapse';
  if (q <= 0) activeZone = 'collapse';
  else if (q < 0.2) activeZone = 'overextension';
  else activeZone = 'safe';

  return (
    <div className={`rounded-md border p-3 ${colors.border} bg-panel-raised`}>
      <div className="flex items-center justify-between">
        <span className={`text-sm font-semibold ${colors.text}`}>{resource}</span>
        <span className="stat-value text-sm text-muted-foreground">q = {qPct}%</span>
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        {ZONE_THRESHOLDS.map((zone) => {
          const isActive =
            (zone.label === 'Safe' && activeZone === 'safe') ||
            (zone.label === 'Overextension' && activeZone === 'overextension') ||
            (zone.label === 'Collapse' && activeZone === 'collapse');

          return (
            <span
              key={zone.label}
              className={`zone-chip border text-[10px] transition-all ${
                isActive
                  ? `${zone.bg} ${zone.color} opacity-100`
                  : 'opacity-30 border-rim text-muted-foreground'
              }`}
            >
              {zone.label}
            </span>
          );
        })}
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        {activeZone === 'safe' && desc.safe}
        {activeZone === 'overextension' && desc.overextension}
        {activeZone === 'collapse' && <span className="text-red-400">{desc.collapse}</span>}
      </p>

      {desc.reserve_note && (
        <p className="mt-1 text-[10px] text-muted-foreground/50">{desc.reserve_note}</p>
      )}
    </div>
  );
}

export function FailureStatePanel() {
  const ratios = useResourceRatios();
  return (
    <SectionCard
      section="§7"
      title="Failure States"
      subtitle="Live zone status — driven by current resource ratios (drag bars above)"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {RESOURCE_KEYS.map((r) => (
          <ResourceZoneRow key={r} resource={r} q={ratios[r]} />
        ))}
      </div>

      <div className="mt-4 rounded border border-rim/40 bg-panel px-3 py-2 text-xs text-muted-foreground">
        <p className="font-semibold text-foreground/70 mb-1">Reserve Accounting §6</p>
        <p>
          Reserve buffers forced Mana/Stamina draw below their 20% floors. Conversion:{' '}
          <span className="stat-value text-foreground/80">1 Reserve = 5 Mana</span> or{' '}
          <span className="stat-value text-foreground/80">5 Stamina</span> deficit. Reserve regen is
          suppressed to zero during combat — deep recovery only.
        </p>
      </div>
    </SectionCard>
  );
}
