/**
 * Tiny DOM helpers (REF-14.1). No virtual DOM; views reconcile keyed children
 * themselves.
 *
 * Source: REF-14.1
 */

type Props = Record<string, unknown>;

const attrValue = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
};

const applyProps = (element: Element, props: Props | undefined): void => {
  if (props === undefined) return;
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === null) continue;
    if (key === 'text') {
      element.textContent = attrValue(value);
    } else if (key === 'onclick' && typeof value === 'function') {
      element.addEventListener('click', value as EventListener);
    } else if (key === 'class') {
      element.setAttribute('class', attrValue(value));
    } else {
      element.setAttribute(key, attrValue(value));
    }
  }
};

/**
 * Creates an HTML element (REF-14.1).
 *
 * Source: REF-14.1
 */
export function h(tag: string, props?: Props, ...children: Array<Node | string>): HTMLElement {
  const element = document.createElement(tag);
  applyProps(element, props);
  for (const child of children) {
    element.append(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return element;
}

/**
 * Creates an SVG element (REF-14.1).
 *
 * Source: REF-14.1
 */
export function svg(tag: string, props?: Props, ...children: Array<Node | string>): SVGElement {
  const element = document.createElementNS('http://www.w3.org/2000/svg', tag);
  applyProps(element, props);
  for (const child of children) {
    element.append(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return element;
}

/** Replaces `element`'s children (REF-14.1). */
export function replaceChildren(element: Element, ...children: Array<Node | string>): void {
  element.replaceChildren(...children);
}
