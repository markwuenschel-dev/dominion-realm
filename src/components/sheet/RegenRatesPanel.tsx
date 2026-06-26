'use client';

import { SectionCard } from '@/components/layout/SectionCard';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/index';
import { useCharacterSheet } from '@/hooks/useCharacterSheet';
import { RESOURCE_COLORS } from '@/types';

function RegenRow({
  label,
  value,
  unit,
  dim = false,
}: {
  label: string;
  value: number;
  unit: string;
  dim?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between py-1.5 border-b border-rim/30 last:border-0 ${dim ? 'opacity-40' : ''}`}
    >
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-baseline gap-1">
        <span className="stat-value text-sm font-semibold text-foreground">{value}</span>
        <span className="text-[10px] text-muted-foreground/60">{unit}</span>
      </div>
    </div>
  );
}

export function RegenRatesPanel() {
  const { regenRates } = useCharacterSheet();

  return (
    <SectionCard
      section="§7"
      title="Regeneration Rates"
      subtitle="Activity-based model — resource_system.md reference"
    >
      <Tabs defaultValue="HP">
        <TabsList className="w-full justify-start">
          {(['HP', 'Mana', 'Stamina', 'Reserve'] as const).map((r) => (
            <TabsTrigger key={r} value={r} className={`text-xs ${RESOURCE_COLORS[r].text}`}>
              {r}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="HP" className="mt-3">
          <RegenRow label="Safe rest" value={regenRates.HP.safeRest} unit="/ hr" />
          <RegenRow label="Light rest" value={regenRates.HP.lightRest} unit="/ hr" />
          <RegenRow label="Active travel" value={regenRates.HP.activeTravel} unit="/ hr" />
          <RegenRow label="Combat" value={0} unit="/ hr" dim />
          <p className="mt-3 text-[10px] text-muted-foreground/50">
            SafeRest = MaxHP×0.03 + CON/2 · LightRest = MaxHP×0.015 + CON/4 · Travel = MaxHP×0.005
          </p>
        </TabsContent>

        <TabsContent value="Mana" className="mt-3">
          <RegenRow label="Meditation" value={regenRates.Mana.meditation} unit="/ min" />
          <RegenRow label="Calm noncombat" value={regenRates.Mana.calmNoncombat} unit="/ min" />
          <RegenRow label="Active travel" value={regenRates.Mana.activeTravel} unit="/ min" />
          <RegenRow label="Combat stress" value={regenRates.Mana.combat} unit="/ min" dim />
          <p className="mt-3 text-[10px] text-muted-foreground/50">
            Meditation = MaxMana×0.05 + WIS/5 · Calm = MaxMana×0.02 + WIS/10 · Sustained channeling
            may suppress.
          </p>
        </TabsContent>

        <TabsContent value="Stamina" className="mt-3">
          <RegenRow label="Full rest" value={regenRates.Stamina.fullRest} unit="/ min" />
          <RegenRow
            label="Catching breath"
            value={regenRates.Stamina.catchingBreath}
            unit="/ min"
          />
          <RegenRow label="Light movement" value={regenRates.Stamina.lightMovement} unit="/ min" />
          <RegenRow label="Combat (passive)" value={regenRates.Stamina.combat} unit="/ min" dim />
          <p className="mt-3 text-[10px] text-muted-foreground/50">
            FullRest = MaxStamina×0.12 + END/2 · CatchBreath = MaxStamina×0.08 + END/3 · Heavy
            exertion drains.
          </p>
        </TabsContent>

        <TabsContent value="Reserve" className="mt-3">
          <RegenRow label="Deep sleep" value={regenRates.Reserve.deepSleep} unit="/ hr" />
          <RegenRow label="Meditation" value={regenRates.Reserve.meditation} unit="/ hr" />
          <RegenRow label="Ordinary rest" value={regenRates.Reserve.ordinaryRest} unit="/ hr" />
          <RegenRow label="Active travel" value={regenRates.Reserve.activeTravel} unit="/ hr" dim />
          <RegenRow label="Combat" value={0} unit="/ hr" dim />
          <p className="mt-3 text-[10px] text-muted-foreground/50">
            DeepSleep = MaxReserve×0.08 + WIS/4 · Reserve regen is zero during combat / active
            interface strain. Emotional recovery modifier applies (grief 0.50×, panic 0.25×,
            corruption 0.00×).
          </p>
        </TabsContent>
      </Tabs>
    </SectionCard>
  );
}
