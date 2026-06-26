'use client';

import type { ReactNode } from 'react';

export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-surface text-foreground">
      <header className="border-b border-rim px-6 py-4">
        <div className="mx-auto max-w-6xl flex items-baseline gap-3">
          <span className="heading-realm text-xl">Dominion Realm</span>
          <span className="stat-value text-xs text-muted-foreground">Formula Calculator</span>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8 space-y-6">{children}</main>
    </div>
  );
}
