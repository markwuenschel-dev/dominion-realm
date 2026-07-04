'use client';

import { useState } from 'react';
import { SectionCard } from '@/components/layout/SectionCard';
import { Input, Label, Badge, Separator } from '@/components/ui/index';
import { Button } from '@/components/ui/button';
import { useConditionResults, useDerivedResistances } from '@/hooks/useCalculator';
import { useCalculatorStore } from '@/store/calculatorStore';
import { computePenetration } from '@/lib/formulas';
import { round, severityColor } from '@/lib/utils';
import type { SeverityBand, ConditionResult } from '@/types';
import { Plus, Trash2 } from 'lucide-react';

const SEVERITY_LABELS: Record<SeverityBand, string> = {
  none: 'None',
  minor: 'Minor',
  moderate: 'Moderate',
  severe: 'Severe',
  catastrophic: 'Catastrophic',
};

const SEVERITY_VARIANTS: Record<SeverityBand, 'outline' | 'secondary' | 'default' | 'destructive'> =
  {
    none: 'outline',
    minor: 'secondary',
    moderate: 'secondary',
    severe: 'destructive',
    catastrophic: 'destructive',
  };

function ConditionRow({ index, result }: { index: number; result?: ConditionResult }) {
  const input = useCalculatorStore((s) => s.conditionInputs[index]);
  const setConditionInput = useCalculatorStore((s) => s.setConditionInput);
  const removeCondition = useCalculatorStore((s) => s.removeConditionInput);

  if (!input) return null;
  if (!result) return null;

  const { severity, band, description } = result;

  function set(key: 'load' | 'resistance' | 'thresholdWidth', value: number) {
    if (!input) return;
    setConditionInput(index, { ...input, [key]: value });
  }

  return (
    <div className="rounded-md border border-rim bg-panel p-3">
      <div className="flex items-center gap-2 mb-3">
        <Badge variant={SEVERITY_VARIANTS[band]} className="text-xs" data-severity={band}>
          {SEVERITY_LABELS[band]}
        </Badge>
        <span className={`stat-value text-sm font-bold ${severityColor(severity)}`}>
          {severity >= 0 ? `+${round(severity, 2)}` : round(severity, 2)}
        </span>
        <span className="flex-1 text-xs text-muted-foreground">{description}</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          onClick={() => removeCondition(index)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label className="text-[10px] text-muted-foreground/70">Condition Load C_i</Label>
          <Input
            type="number"
            min={0}
            step={1}
            value={input.load}
            onChange={(e) => {
              const n = parseFloat(e.target.value);
              if (!isNaN(n)) set('load', n);
            }}
            className="h-7 stat-value text-xs mt-0.5"
          />
        </div>
        <div>
          <Label className="text-[10px] text-muted-foreground/70">Resistance</Label>
          <Input
            type="number"
            min={0}
            step={1}
            value={input.resistance}
            onChange={(e) => {
              const n = parseFloat(e.target.value);
              if (!isNaN(n)) set('resistance', n);
            }}
            className="h-7 stat-value text-xs mt-0.5"
          />
        </div>
        <div>
          <Label className="text-[10px] text-muted-foreground/70">Threshold Width</Label>
          <Input
            type="number"
            min={0.1}
            step={0.5}
            value={input.thresholdWidth}
            onChange={(e) => {
              const n = parseFloat(e.target.value);
              if (!isNaN(n)) set('thresholdWidth', n);
            }}
            className="h-7 stat-value text-xs mt-0.5"
          />
        </div>
      </div>

      <p className="mt-1.5 text-[10px] text-muted-foreground/50">
        Severity = (Load − Resistance) / ThresholdWidth §11.2
      </p>
    </div>
  );
}

function PenetrationCalc() {
  const [sourceAccess, setSourceAccess] = useState(25);
  const [barrier, setBarrier] = useState(15);
  const [alpha, setAlpha] = useState(1);

  const result = computePenetration({ sourceAccess, barrier, alpha });

  return (
    <div className="rounded-md border border-rim bg-panel p-3">
      <p className="mb-3 text-xs font-semibold text-muted-foreground">
        Typed Penetration §10 — P = Access^α / (Access^α + Barrier^α)
      </p>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label className="text-[10px] text-muted-foreground/70">Source Access</Label>
          <Input
            type="number"
            min={0}
            step={1}
            value={sourceAccess}
            onChange={(e) => {
              const n = parseFloat(e.target.value);
              if (!isNaN(n)) setSourceAccess(n);
            }}
            className="h-7 stat-value text-xs mt-0.5"
          />
        </div>
        <div>
          <Label className="text-[10px] text-muted-foreground/70">Barrier</Label>
          <Input
            type="number"
            min={0}
            step={1}
            value={barrier}
            onChange={(e) => {
              const n = parseFloat(e.target.value);
              if (!isNaN(n)) setBarrier(n);
            }}
            className="h-7 stat-value text-xs mt-0.5"
          />
        </div>
        <div>
          <Label className="text-[10px] text-muted-foreground/70">α exponent</Label>
          <Input
            type="number"
            min={0.1}
            step={0.1}
            value={alpha}
            onChange={(e) => {
              const n = parseFloat(e.target.value);
              if (!isNaN(n)) setAlpha(n);
            }}
            className="h-7 stat-value text-xs mt-0.5"
          />
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Penetration</span>
        <span
          className={`stat-value text-lg font-bold ${
            result.penetration > 0.7
              ? 'text-red-400'
              : result.penetration > 0.4
                ? 'text-amber-400'
                : 'text-emerald-400'
          }`}
        >
          {result.label}
        </span>
      </div>
    </div>
  );
}

function DerivedResistances() {
  const derivedResistances = useDerivedResistances();

  return (
    <div className="rounded-md border border-rim bg-panel p-3">
      <p className="mb-2 text-xs font-semibold text-muted-foreground">
        Derived Resistance Approximations §11.1
      </p>
      <div className="grid grid-cols-3 gap-3">
        {(Object.entries(derivedResistances) as [string, number][]).map(([name, value]) => (
          <div key={name}>
            <p className="text-[10px] text-muted-foreground/70">{name}</p>
            <p className="stat-value text-sm font-bold text-foreground">{round(value, 1)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ConditionSeverityPanel() {
  const addCondition = useCalculatorStore((s) => s.addConditionInput);
  const conditionResults = useConditionResults();

  return (
    <SectionCard
      section="§9–11"
      title="Conditions &amp; Severity"
      subtitle="Condition load → severity band · typed penetration calculator"
    >
      <div className="flex flex-col gap-4">
        <DerivedResistances />
        <Separator />

        <div className="flex flex-col gap-2">
          {conditionResults.map((result, i) => (
            <ConditionRow key={i} index={i} result={result} />
          ))}
        </div>

        <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={addCondition}>
          <Plus className="h-3.5 w-3.5" />
          Add Condition
        </Button>

        <Separator />
        <PenetrationCalc />
      </div>
    </SectionCard>
  );
}
