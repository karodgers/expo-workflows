export type ElementChild = Node | string | null | undefined;

/**
 * Minimal element builder. The dashboard renders from typed data rather than
 * markup strings — nothing crossing the extension boundary is ever parsed as
 * HTML — so this is the only place elements are created.
 *
 * Props are interpreted by key: `class` and `text` set the corresponding
 * property, an `on*` key registers a listener, and anything else becomes an
 * attribute. `false`, `null`, and `undefined` values drop the attribute
 * entirely, and `true` sets it to the empty string.
 */
export function el(
  tag: string,
  props?: Record<string, any> | null,
  children?: ElementChild[],
): HTMLElement {
  const node = document.createElement(tag);
  if (props)
    for (const [key, value] of Object.entries(props)) {
      if (key === 'class') node.className = value;
      else if (key === 'text') node.textContent = value;
      else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
      else if (value !== undefined && value !== null && value !== false)
        node.setAttribute(key, value === true ? '' : value);
    }
  for (const child of children || []) {
    if (child == null) continue;
    node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return node;
}

/** A codicon glyph, hidden from assistive technology: every icon here accompanies a text label. */
export function icon(name: string, spin?: boolean): HTMLElement {
  return el(
    'span',
    {
      class: 'codicon codicon-' + name + (spin ? ' codicon-modifier-spin' : ''),
      'aria-hidden': 'true',
    },
    [],
  );
}

export function sectionHeading(title: string, trailing?: ElementChild): HTMLElement {
  return el('div', { class: 'section-heading' }, [el('h2', {}, [title]), trailing]);
}

/**
 * A link to Expo's documentation.
 *
 * Rendered as a button that asks the extension host to open the URL, not as an
 * anchor: the host re-checks the destination against its allowlist before
 * anything leaves the editor, and the webview's CSP forbids navigation anyway.
 */
export function docsLink(
  url: string | undefined,
  label = 'Read the Expo docs',
): HTMLElement | null {
  if (!url) return null;
  return el(
    'button',
    {
      class: 'link-button docs-link',
      title: url,
      onclick: () => runDocsCommand(url),
    },
    [icon('link-external'), label],
  );
}

/** Set by store.ts at start-up; kept indirect so dom.ts imports nothing. */
let runDocsCommand: (url: string) => void = () => {};

export function setDocsOpener(open: (url: string) => void): void {
  runDocsCommand = open;
}
