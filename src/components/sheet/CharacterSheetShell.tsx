'use client';

import { CharacterInfoPanel } from '@/components/sheet/CharacterInfoPanel';
import { AttributeAllocationPanel } from '@/components/sheet/AttributeAllocationPanel';
import { ComputedResourcesPanel } from '@/components/sheet/ComputedResourcesPanel';
import { RegenRatesPanel } from '@/components/sheet/RegenRatesPanel';
import { useCharacterSheetStore } from '@/store/characterSheetStore';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';

export function CharacterSheetShell() {
  const resetToDefaults = useCharacterSheetStore((s) => s.resetToDefaults);

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 md:px-6">
        <div className="mb-5 flex items-end justify-between border-b border-rim pb-4">
          <div>
            <h2 className="heading-realm text-base">Character Stat Sheet</h2>
            <p className="mt-0.5 text-xs text-muted-foreground/60">
              Full resource formula · Species &amp; class modifiers · Regen rates · Depletion states
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs text-muted-foreground"
            onClick={resetToDefaults}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset to Marcus defaults
          </Button>
        </div>

        <div className="mb-5">
          <CharacterInfoPanel />
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[320px_1fr]">
          <aside>
            <AttributeAllocationPanel />
          </aside>

          <div className="flex flex-col gap-5">
            <ComputedResourcesPanel />
            <RegenRatesPanel />
          </div>
        </div>
      </main>

      <footer className="border-t border-rim px-6 py-3 text-center text-xs text-muted-foreground">
        Dominion Realm · Stat Sheet · Formula lock: resources · Species + class mods ·
        resource_system.md §§4–19
      </footer>
    </div>
  );
}
