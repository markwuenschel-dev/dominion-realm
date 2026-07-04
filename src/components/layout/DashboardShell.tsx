'use client';

import { AttributePanel } from '@/components/calculator/AttributePanel';
import { ResourceMaxPanel } from '@/components/calculator/ResourceMaxPanel';
import { RegenBasePanel } from '@/components/calculator/RegenBasePanel';
import { RegenCurveViz } from '@/components/calculator/RegenCurveViz';
import { FailureStatePanel } from '@/components/calculator/FailureStatePanel';
import { HealingPulsePanel } from '@/components/calculator/HealingPulsePanel';
import { ConditionSeverityPanel } from '@/components/calculator/ConditionSeverityPanel';
import { SceneXpPanel } from '@/components/calculator/SceneXpPanel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/index';

export function DashboardShell() {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 md:px-6">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[320px_1fr]">
          <aside className="flex flex-col gap-5">
            <AttributePanel />
          </aside>

          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <ResourceMaxPanel />
              <RegenBasePanel />
            </div>

            <RegenCurveViz />

            <Tabs defaultValue="failure">
              <TabsList className="w-full justify-start">
                <TabsTrigger value="failure">Failure States</TabsTrigger>
                <TabsTrigger value="conditions">Conditions</TabsTrigger>
                <TabsTrigger value="healing">Healing Pulse</TabsTrigger>
                <TabsTrigger value="scene">Scene XP</TabsTrigger>
              </TabsList>

              <TabsContent value="failure">
                <FailureStatePanel />
              </TabsContent>

              <TabsContent value="conditions">
                <ConditionSeverityPanel />
              </TabsContent>

              <TabsContent value="healing">
                <HealingPulsePanel />
              </TabsContent>

              <TabsContent value="scene">
                <SceneXpPanel />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>

      <footer className="border-t border-rim px-6 py-3 text-center text-xs text-muted-foreground">
        Dominion Realm · Calculus-native, LitRPG-readable · Formula lock: Resources / Regen /
        Conditions / Healing
      </footer>
    </div>
  );
}
