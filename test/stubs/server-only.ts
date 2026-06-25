// Test stub for the `server-only` package. The real module throws if imported
// into a Client Component bundle; under Vitest (plain Node) that guard is
// irrelevant, so we alias `server-only` to this empty module in vitest.config.ts
// to let the content/search libs import cleanly.
export {};
