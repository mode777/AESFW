/**
 * The command-result notice (REF-13.4). Shows a short localized toast for a
 * rejected command; an accepted command clears it. It is presentation only and
 * never mutates the mirror.
 *
 * Source: REF-13.4
 */
import { h } from '../dom/h.js';

/** A mounted notice. */
export interface Notice {
  readonly el: HTMLElement;
  show(text: string | null): void;
}

/**
 * Creates the command-result notice (REF-13.4).
 *
 * Source: REF-13.4
 */
export function createNotice(): Notice {
  const el = h('div', { class: 'notice', 'data-testid': 'notice', role: 'status' });
  const show = (text: string | null): void => {
    if (text === null) {
      el.removeAttribute('data-message');
      el.textContent = '';
      return;
    }
    el.setAttribute('data-message', text);
    el.textContent = text;
  };
  show(null);
  return { el, show };
}
