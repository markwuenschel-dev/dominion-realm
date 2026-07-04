'use client';

import { SectionCard } from '@/components/layout/SectionCard';
import { Input, Label } from '@/components/ui/index';
import { Button } from '@/components/ui/button';
import { useHealingResult } from '@/hooks/useCalculator';
import { useCalculatorStore } from '@/store/calculatorStore';
import { round } from '@/lib/utils';
import type { HealingPulseResult } from '@/types';
import { RotateCcw, Plus, Trash2 } from 'lucide-react';

type HealingChannelResult = HealingPulseResult['channels'][number];

type NumericChannelKey =
  | 'demand'
  | 'priority'
  | 'compatibility'
  | 'healingAccess'
  | 'barrier'
  | 'alpha'
  | 'K_W'
  | 'eta';

function ChannelEditor({ index, result }: { index: number; result?: HealingChannelResult }) {
  const channel = useCalculatorStore((s) => s.healingPulse.channels[index]);
  const updateChannel = useCalculatorStore((s) => s.updateHealingChannel);
  const removeChannel = useCalculatorStore((s) => s.removeHealingChannel);

  if (!channel) return null;

  function numField(key: NumericChannelKey, label: string, min = 0, step = 1) {
    if (!channel) return null;
    return (
      <div className="flex flex-col gap-0.5">
        <Label className="text-[10px] text-muted-foreground/70">{label}</Label>
        <Input
          type="number"
          min={min}
          step={step}
          value={channel[key]}
          onChange={(e) => {
            const n = parseFloat(e.target.value);
            if (!isNaN(n)) updateChannel(index, { [key]: n });
          }}
          className="h-7 px-1.5 stat-value text-xs"
        />
      </div>
    );
  }

  return (
    <div className="rounded-md border border-rim bg-panel p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <Input
          value={channel.label}
          onChange={(e) => updateChannel(index, { label: e.target.value })}
          className="h-7 flex-1 text-xs font-semibold"
          placeholder="Channel label"
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          onClick={() => removeChannel(index)}
          title="Remove channel"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
        {numField('demand', 'Demand W_j', 0, 1)}
        {numField('priority', 'Priority', 0, 0.1)}
        {numField('compatibility', 'Compat.', 0, 0.1)}
        {numField('healingAccess', 'Heal Access', 0, 1)}
        {numField('barrier', 'Barrier', 0, 1)}
        {numField('alpha', 'α', 0.1, 0.1)}
        {numField('K_W', 'K_W', 0.1, 1)}
        {numField('eta', 'η', 0, 0.05)}
      </div>

      {result && (
        <div className="mt-2 grid grid-cols-4 gap-2 rounded bg-panel-raised px-2 py-1.5">
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground/60">Alloc a_j</span>
            <span className="stat-value text-xs text-blue-400">
              {(result.allocation * 100).toFixed(1)}%
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground/60">Penetr.</span>
            <span className="stat-value text-xs text-amber-400">
              {(result.penetration * 100).toFixed(1)}%
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground/60">Absorpt.</span>
            <span className="stat-value text-xs text-violet-400">
              {(result.absorption * 100).toFixed(1)}%
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground/60">Repair</span>
            <span className="stat-value text-xs font-bold text-emerald-400">
              {round(result.repair, 2)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export function HealingPulsePanel() {
  const H0 = useCalculatorStore((s) => s.healingPulse.H0);
  const channels = useCalculatorStore((s) => s.healingPulse.channels);
  const setH0 = useCalculatorStore((s) => s.setHealingH0);
  const addChannel = useCalculatorStore((s) => s.addHealingChannel);
  const resetHealingPulse = useCalculatorStore((s) => s.resetHealingPulse);
  const healingResult = useHealingResult();

  function handleAddChannel() {
    addChannel({
      id: `ch_${Date.now()}`,
      label: 'New Channel',
      demand: 10,
      priority: 1.0,
      compatibility: 1.0,
      healingAccess: 20,
      barrier: 20,
      alpha: 1,
      K_W: 10,
      eta: 1.0,
    });
  }

  return (
    <SectionCard
      section="§12–22"
      title="Healing Pulse"
      subtitle="Dynamic multi-channel allocation — pre-loaded with §22 spear wound example"
      headerRight={
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={resetHealingPulse}
          title="Reset to spear wound example"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
      }
    >
      <div className="mb-4 flex items-center gap-3">
        <Label className="w-24 text-sm text-muted-foreground">H₀ Healing Power</Label>
        <Input
          type="number"
          min={0}
          step={1}
          value={H0}
          onChange={(e) => {
            const n = parseFloat(e.target.value);
            if (!isNaN(n)) setH0(n);
          }}
          className="w-24 stat-value text-sm"
        />
        <span className="text-xs text-muted-foreground">raw source power</span>
      </div>

      <div className="flex flex-col gap-2">
        {channels.map((_, i) => (
          <ChannelEditor key={i} index={i} result={healingResult.channels[i]} />
        ))}
      </div>

      <Button
        variant="outline"
        size="sm"
        className="mt-3 w-full gap-1.5 text-xs"
        onClick={handleAddChannel}
      >
        <Plus className="h-3.5 w-3.5" />
        Add Repair Channel
      </Button>

      <div className="mt-4 rounded border border-emerald-900/30 bg-emerald-950/10 px-4 py-3">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-muted-foreground">Total Repair Delivered</span>
          <span className="stat-value text-xl font-bold text-emerald-400">
            {round(healingResult.totalRepair, 2)}
          </span>
        </div>
        <div className="mt-1 flex items-baseline justify-between">
          <span className="text-xs text-muted-foreground">Total allocation weight</span>
          <span className="stat-value text-xs text-muted-foreground">
            Σ = {round(healingResult.totalWeight, 2)}
          </span>
        </div>
        <p className="mt-2 text-[10px] text-muted-foreground/60">
          Healing power lost through allocation, penetration, compatibility, and absorption. This is
          why healing ≠ &quot;+{H0} HP&quot;.
        </p>
      </div>
    </SectionCard>
  );
}
