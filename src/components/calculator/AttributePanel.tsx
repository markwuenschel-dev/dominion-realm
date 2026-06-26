'use client';

import { SectionCard } from '@/components/layout/SectionCard';
import { Slider, Label, Input, Separator } from '@/components/ui/index';
import { Button } from '@/components/ui/button';
import { useCalculatorStore } from '@/store/calculatorStore';
import { ATTRIBUTE_GROUPS, ATTRIBUTE_KEYS } from '@/types';
import { ATTRIBUTE_MIN, ATTRIBUTE_MAX } from '@/lib/constants';
import { RotateCcw } from 'lucide-react';

function AttributeRow({ attrKey }: { attrKey: (typeof ATTRIBUTE_KEYS)[number] }) {
  const value = useCalculatorStore((s) => s.attributes[attrKey]);
  const setAttribute = useCalculatorStore((s) => s.setAttribute);

  return (
    <div className="grid grid-cols-[3.5rem_1fr_2.5rem] items-center gap-3">
      <Label
        htmlFor={`attr-${attrKey}`}
        className="stat-value text-xs font-semibold text-muted-foreground tracking-wider uppercase"
      >
        {attrKey}
      </Label>

      <Slider
        id={`attr-${attrKey}`}
        min={ATTRIBUTE_MIN}
        max={ATTRIBUTE_MAX}
        step={1}
        value={[value]}
        onValueChange={([v]) => v !== undefined && setAttribute(attrKey, v)}
        aria-label={attrKey}
      />

      <Input
        type="number"
        min={ATTRIBUTE_MIN}
        max={ATTRIBUTE_MAX}
        value={value}
        onChange={(e) => {
          const n = parseInt(e.target.value, 10);
          if (!isNaN(n)) setAttribute(attrKey, Math.min(ATTRIBUTE_MAX, Math.max(ATTRIBUTE_MIN, n)));
        }}
        className="h-7 w-full px-1.5 text-center stat-value text-xs"
        aria-label={`${attrKey} value`}
      />
    </div>
  );
}

function ModifierRow({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  hint?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <Label className="text-xs text-muted-foreground">{label}</Label>
        {hint && <p className="text-[10px] text-muted-foreground/60">{hint}</p>}
      </div>
      <Input
        type="number"
        min={0}
        max={10}
        step={0.1}
        value={value}
        onChange={(e) => {
          const n = parseFloat(e.target.value);
          if (!isNaN(n)) onChange(n);
        }}
        className="h-7 w-20 px-1.5 text-center stat-value text-xs"
      />
    </div>
  );
}

export function AttributePanel() {
  const resetAttributes = useCalculatorStore((s) => s.resetAttributes);
  const soulLevelMod = useCalculatorStore((s) => s.soulLevelMod);
  const recoveryStateMod = useCalculatorStore((s) => s.recoveryStateMod);
  const setSoulLevelMod = useCalculatorStore((s) => s.setSoulLevelMod);
  const setRecoveryStateMod = useCalculatorStore((s) => s.setRecoveryStateMod);

  return (
    <SectionCard
      section="§1"
      title="Attributes"
      subtitle="All ten — drives every formula downstream"
      headerRight={
        <Button
          variant="ghost"
          size="icon"
          onClick={resetAttributes}
          title="Reset to defaults"
          className="h-7 w-7"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
      }
    >
      <div className="flex flex-col gap-5">
        {ATTRIBUTE_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
              {group.label}
            </p>
            <div className="flex flex-col gap-3">
              {group.keys.map((key) => (
                <AttributeRow key={key} attrKey={key} />
              ))}
            </div>
          </div>
        ))}

        <Separator />

        <div>
          <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
            Modifiers
          </p>
          <div className="flex flex-col gap-3">
            <ModifierRow
              label="SoulLevelMod"
              value={soulLevelMod}
              onChange={setSoulLevelMod}
              hint="Default 1.0 — scales Reserve max"
            />
            <ModifierRow
              label="RecoveryStateMod"
              value={recoveryStateMod}
              onChange={setRecoveryStateMod}
              hint="Sleep ≈ 2.0 · rest ≈ 1.5 · combat ≈ 0.5"
            />
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
