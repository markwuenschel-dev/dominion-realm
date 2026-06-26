/// <reference types="next" />
/// <reference types="next/image-types/global" />

// Committed so `tsc --noEmit` (the CI `check` step, which runs before `next
// build`) resolves static image imports like `@/assets/cast/marcus.png`. Next
// regenerates the equivalent refs in the gitignored next-env.d.ts at build time.
