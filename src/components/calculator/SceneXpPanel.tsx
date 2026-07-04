'use client';

import { useState } from 'react';
import { SectionCard } from '@/components/layout/SectionCard';
import { Input, Label } from '@/components/ui/index';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { sceneXP, SCENE_CALIBRATION_BANDS } from '@/lib/xpFormulas';
import { round } from '@/lib/utils';

/**
 * Scene XP (§§6/20) — the saturation mini-tool from xpFormulas, wired into the
 * calculator. Pick a calibration band (its adaptive-evidence weight) and a
 * threshold, and see the awarded XP = threshold · (1 − e^−evidence): a scene
 * can never pay out more than its threshold, and diminishing evidence saturates.
 *
 * Self-contained local state — this tool shares nothing with the other panels,
 * so it stays out of the calculator store.
 */

const BANDS = Object.entries(SCENE_CALIBRATION_BANDS) as [string, number][];

export function SceneXpPanel() {
  const [thresholdXp, setThresholdXp] = useState(500);
  const [band, setBand] = useState<string>(BANDS[0][0]);

  const evidence = SCENE_CALIBRATION_BANDS[band as keyof typeof SCENE_CALIBRATION_BANDS];
  const awarded = sceneXP(thresholdXp, evidence);
  const saturation = 1 - Math.exp(-evidence);

  return (
    <SectionCard
      section="§§6 / 20"
      title="Scene XP"
      subtitle="Saturation payout — a scene never pays more than its threshold"
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="scene-threshold" className="text-sm text-muted-foreground">
            Threshold XP
          </Label>
          <Input
            id="scene-threshold"
            type="number"
            min={0}
            step={10}
            value={thresholdXp}
            onChange={(e) => {
              const n = parseFloat(e.target.value);
              if (!isNaN(n)) setThresholdXp(n);
            }}
            className="w-40 stat-value text-sm"
          />
          <span className="text-[10px] text-muted-foreground/60">
            The scene&apos;s maximum award — approached, never exceeded.
          </span>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-sm text-muted-foreground">Calibration band</Label>
          <Select value={band} onValueChange={setBand}>
            <SelectTrigger className="w-full max-w-md">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BANDS.map(([label, weight]) => (
                <SelectItem key={label} value={label}>
                  {label} · {weight}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-[10px] text-muted-foreground/60">
            Adaptive-evidence weight for this kind of scene (e = {evidence}).
          </span>
        </div>
      </div>

      <div className="mt-4 rounded border border-amber-900/30 bg-amber-950/10 px-4 py-3">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-muted-foreground">XP Awarded</span>
          <span className="stat-value text-xl font-bold text-amber-400">{round(awarded, 1)}</span>
        </div>
        <div className="mt-1 flex items-baseline justify-between">
          <span className="text-xs text-muted-foreground">Saturation 1 − e⁻ᵉ</span>
          <span className="stat-value text-xs text-muted-foreground">
            {(saturation * 100).toFixed(1)}%
          </span>
        </div>
        <p className="mt-2 text-[10px] text-muted-foreground/60">
          At this band the scene realises {(saturation * 100).toFixed(1)}% of its {thresholdXp} XP
          threshold. Rarer, more dangerous scenes carry heavier evidence and saturate closer to the
          cap.
        </p>
      </div>
    </SectionCard>
  );
}
