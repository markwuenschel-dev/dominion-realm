/// <reference path="../.astro/types.d.ts" />

/**
 * Typed public env vars for the third-party integrations (ADR-0005, ADR-0006).
 * All are `PUBLIC_`-prefixed because they're read in the browser, and optional
 * so local/CI builds without the secrets still succeed — the consuming code
 * degrades gracefully when an id is absent.
 */
interface ImportMetaEnv {
  /** Kit (ConvertKit) form id for the email signup. */
  readonly PUBLIC_KIT_FORM_ID?: string;
  /** Kit account/publishable id, if the embed snippet requires it. */
  readonly PUBLIC_KIT_UID?: string;
  /** GA4 measurement id, e.g. "G-XXXXXXXXXX". */
  readonly PUBLIC_GA4_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
