import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { HomeClient } from './HomeClient';

/**
 * The signup submit handler's honesty contract.
 *
 * Regression pinned here: the handler used to call `preventDefault()` and then,
 * for a form with no `action`, write "You are on the list. Welcome, walker."
 * and reset the field. The email went nowhere and the visitor was told they had
 * subscribed. An action-less form is no longer rendered at all (see
 * `src/lib/signup.ts`), but the handler must never fake success even if one
 * appears — a silent false confirmation is worse than a visible failure.
 */

const FAKE_SUCCESS = /you are on the list/i;

function mountSignupDom(action?: string) {
  const form = document.createElement('form');
  form.id = 'signupForm';
  if (action !== undefined) form.setAttribute('action', action);

  const input = document.createElement('input');
  input.name = 'email_address';
  input.value = 'walker@example.com';
  form.appendChild(input);

  const note = document.createElement('p');
  note.id = 'signupNote';
  note.textContent = 'Early chapters · field notes · new codex entries';

  document.body.append(form, note);
  return { form, note };
}

describe('HomeClient signup submit', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    cleanup();
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('never reports success for a form with no action', () => {
    const { form, note } = mountSignupDom();
    const before = note.textContent;
    render(<HomeClient />);

    const submit = new Event('submit', { bubbles: true, cancelable: true });
    form.dispatchEvent(submit);

    expect(note.textContent).toBe(before);
    expect(note.textContent ?? '').not.toMatch(FAKE_SUCCESS);
  });

  it('does not swallow the submit event when there is no action', () => {
    const { form } = mountSignupDom();
    render(<HomeClient />);

    const submit = new Event('submit', { bubbles: true, cancelable: true });
    form.dispatchEvent(submit);

    // Not prevented => the browser would handle it; we never silently absorb
    // the visitor's email and claim it landed.
    expect(submit.defaultPrevented).toBe(false);
  });

  it('posts to the configured action and prevents the native submit', () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue({ ok: true } as Response);
    vi.stubGlobal('fetch', fetchMock);

    const { form } = mountSignupDom('https://app.kit.com/forms/9590915/subscriptions');
    render(<HomeClient />);

    const submit = new Event('submit', { bubbles: true, cancelable: true });
    form.dispatchEvent(submit);

    expect(submit.defaultPrevented).toBe(true);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://app.kit.com/forms/9590915/subscriptions');
  });
});
