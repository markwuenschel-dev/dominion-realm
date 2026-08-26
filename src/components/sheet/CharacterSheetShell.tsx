'use client';

import { useEffect, useState } from 'react';
import { StatSheetTable } from '@/components/sheet/StatSheetTable';
import { useCharacterSheetStore } from '@/store/characterSheetStore';
import { useSheetMigrationNoticeStore } from '@/store/sheetMigrationNoticeStore';
import { discardQuarantinedSheet, readQuarantinedSheet } from '@/lib/sheetRecovery';

/**
 * The sheet's single render entry point, and the only place that hydrates it.
 *
 * The store sets `skipHydration`, so nothing reads storage until this component
 * asks. That is what makes the server render and the first client render agree:
 * previously the server emitted defaults while the client had already rehydrated
 * from storage, which is a hydration mismatch on every return visit.
 *
 * Readiness is driven by the rehydrate PROMISE, never by `hasHydrated()` or
 * `onFinishHydration`. Measured against this zustand version: when `migrate`
 * throws, `rehydrate()` still **resolves**, and `hasHydrated()` stays **false
 * permanently**. So a skeleton gated on either of those flags never clears on
 * precisely the path this design exists to serve, turning today's "default sheet
 * plus an explanation" into a blank page forever. The promise settles either
 * way, which is why it — and not the flag — is what releases the gate.
 *
 * The `catch` below is therefore belt-and-braces rather than the mechanism: on
 * the known rejection path it does not run. It stays because an unexpected throw
 * from a future storage adapter would otherwise strand the UI, and `finally`
 * keeps the release unconditional regardless of which of those is true.
 */
export function CharacterSheetShell() {
  const notice = useSheetMigrationNoticeStore((s) => s.notice);
  const [ready, setReady] = useState(false);
  const [recoverable, setRecoverable] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await useCharacterSheetStore.persist.rehydrate();
      } catch {
        // Rejection is already recorded by the store's rejection contract; this
        // catch exists so an unexpected throw cannot escape and strand the UI.
      } finally {
        if (!cancelled) {
          setRecoverable(readQuarantinedSheet() !== null);
          setReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function downloadRecoveryCopy() {
    const raw = readQuarantinedSheet();
    if (raw === null) return;
    const blob = new Blob([raw], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'character-sheet-recovered.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function discardRecoveryCopy() {
    discardQuarantinedSheet();
    setRecoverable(false);
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 md:px-6">
        {/* Notices sit OUTSIDE the readiness gate: the rejection message is the
            one thing a reader must still see when the sheet itself did not load. */}
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
        {notice.status === 'persistence-unavailable' && (
          <p
            role="alert"
            className="mb-3 rounded border border-amber-900/40 bg-amber-950/20 px-3 py-2 text-xs text-amber-400"
          >
            {notice.message}
          </p>
        )}

        {recoverable && (
          <div className="mb-3 flex flex-wrap items-center gap-3 rounded border border-rim px-3 py-2 text-xs">
            <span className="text-muted-foreground">
              A copy of the sheet that failed to load is kept.
            </span>
            <button type="button" onClick={downloadRecoveryCopy} className="underline">
              Download rejected sheet
            </button>
            <button type="button" onClick={discardRecoveryCopy} className="underline">
              Discard recovery copy
            </button>
          </div>
        )}

        {ready ? <StatSheetTable /> : <SheetSkeleton />}
      </main>
      <footer className="border-t border-rim px-6 py-3 text-center text-xs text-muted-foreground/40">
        Dominion Realm · Stat Sheet · formula lock (src/lib/formulas)
      </footer>
    </div>
  );
}

/**
 * Rendered identically on the server and on the first client pass, and sized so
 * the real table replacing it does not shift the page. A mount-gate that emitted
 * nothing would be simpler but causes visible layout movement on a table-heavy
 * screen.
 */
function SheetSkeleton() {
  return (
    <div aria-hidden="true" className="animate-pulse space-y-2">
      <div className="h-8 rounded bg-rim/40" />
      {Array.from({ length: 12 }, (_, i) => (
        <div key={i} className="h-6 rounded bg-rim/20" />
      ))}
    </div>
  );
}
