'use client';

import { StatSheetTable } from '@/components/sheet/StatSheetTable';

export function CharacterSheetShell() {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 md:px-6">
        <StatSheetTable />
      </main>
      <footer className="border-t border-rim px-6 py-3 text-center text-xs text-muted-foreground/40">
        Dominion Realm · Stat Sheet · formula lock (src/lib/formulas)
      </footer>
    </div>
  );
}
