// Vitest setup for component tests (runs in the jsdom environment).
// Registers jest-dom matchers (toBeInTheDocument, toHaveAttribute, …) and
// unmounts/cleans up the DOM after every test so renders don't bleed across cases.
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Node 22+ ships a global Web Storage (`localStorage`) that throws "Cannot
// initialize local storage without a --localstorage-file path", and on Node 25
// (the local toolchain — see ADR-0010) it's enabled by default and shadows the
// in-memory storage jsdom provides, so the reveal context's localStorage access
// blows up. CI runs Node 22 where it's off, but we make tests deterministic on
// both by installing a plain in-memory Storage and exposing its class as the
// global `Storage` (so the RevealContext "storage blocked" test can still spy on
// `Storage.prototype.getItem`).
class MemoryStorage {
  private map = new Map<string, string>();
  get length(): number {
    return this.map.size;
  }
  clear(): void {
    this.map.clear();
  }
  getItem(key: string): string | null {
    return this.map.has(key) ? this.map.get(key)! : null;
  }
  key(index: number): string | null {
    return Array.from(this.map.keys())[index] ?? null;
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
  setItem(key: string, value: string): void {
    this.map.set(key, String(value));
  }
}

const memoryStorage = new MemoryStorage();
for (const target of [globalThis, window]) {
  Object.defineProperty(target, 'localStorage', { configurable: true, value: memoryStorage });
  Object.defineProperty(target, 'Storage', { configurable: true, value: MemoryStorage });
}

afterEach(() => {
  cleanup();
});
