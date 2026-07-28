/**
 * Pure state selection for the newsletter signup form (the conversion step).
 *
 * The form posts directly to Kit, so its `action` is configuration-driven:
 *   - `NEXT_PUBLIC_KIT_FORM_ID` — when set, the form posts to that Kit form.
 * When the id is absent we must NOT render a live form. An HTML form with no
 * `action` submits to the *current* URL, so a visitor would type an email, hit
 * Enter, and have it silently discarded by a page that never received it — the
 * conversion step failing without a trace. Instead we degrade to an honest
 * notice, mirroring the buy CTA's rule that a surface is never a dead control
 * (see `cta.ts`, and `site.ts`'s "we never ship href='#' dead links").
 *
 * The component reads the env var; this module holds the decision logic so it
 * can be unit-tested without a DOM.
 */

/** Kit's hosted form-submission endpoint; the form id is appended. */
export const KIT_FORMS_BASE = 'https://app.kit.com/forms';

/** Shown in place of the form when no Kit form id is configured. */
export const SIGNUP_UNAVAILABLE_NOTE =
  'Signup is temporarily unavailable — please check back soon.';

export interface SignupInput {
  /** Kit form id, e.g. "9590915". Empty/absent yields the unavailable state. */
  formId?: string | null;
}

export type SignupState =
  | {
      mode: 'live';
      /** Absolute Kit endpoint for the form's `action`. */
      action: string;
    }
  | {
      mode: 'unavailable';
      note: string;
    };

/** Trim a possibly-undefined env value to a non-empty string, or undefined. */
function clean(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * Resolve whether to render a live signup form. A non-empty `formId` yields the
 * live state; anything else — unset, empty, or whitespace — yields the notice.
 */
export function resolveSignup(input: SignupInput = {}): SignupState {
  const formId = clean(input.formId);
  if (formId) {
    return {
      mode: 'live',
      action: `${KIT_FORMS_BASE}/${formId}/subscriptions`,
    };
  }
  return { mode: 'unavailable', note: SIGNUP_UNAVAILABLE_NOTE };
}

/** Read the signup state from the public env var (build-time inlined). */
export function signupFromEnv(): SignupState {
  return resolveSignup({ formId: process.env.NEXT_PUBLIC_KIT_FORM_ID });
}
