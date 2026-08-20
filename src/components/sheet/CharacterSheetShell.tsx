'use client';

import { StatSheetTable } from '@/components/sheet/StatSheetTable';
import { useSheetMigrationNoticeStore } from '@/store/sheetMigrationNoticeStore';

export function CharacterSheetShell() {
  const notice = useSheetMigrationNoticeStore((s) => s.notice);

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 md:px-6">
        {notice.status === 'migrated' && (
          <p
            role="status"
            className="mb-3 rounded border border-emerald-900/40 bg-emerald-950/20 px-3 py-2 text-xs text-emerald-400"
          >
            {notice.message}
          </p>
        )}
        {notice.status === 'rejected' && (
          <p
            role="alert"
            className="mb-3 rounded border border-red-900/40 bg-red-950/20 px-3 py-2 text-xs text-red-400"
          >
            {notice.message}
          </p>
        )}
        <StatSheetTable />
      </main>
      <footer className="border-t border-rim px-6 py-3 text-center text-xs text-muted-foreground/40">
        Dominion Realm · Stat Sheet · formula lock (src/lib/formulas)
      </footer>
    </div>
  );
}
