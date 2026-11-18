// Updates the page in place to match fresh HTML, touching only what differs (the way React or Next.js apply a
// re-render): a changed listener count changes that one text, a new station replaces that one card, and nothing
// else on the page moves. If nothing changed, nothing is touched.

/** Attributes this script sets on the page itself (player state, favourites, logos); fresh HTML never has them. */
const OWN_ATTRIBUTES = new Set(["data-state", "data-current", "data-playing", "data-loaded", "data-broken", "aria-pressed", "aria-label", "tabindex", "data-active", "aria-current"]);

/** Parts that belong to this visitor or to what they are doing (personal lists, the dial): never replaced. */
const KEEP = "[data-personal], [data-dial], [data-tuned-list], [data-tuned-status], [data-tuned-more]";

function sameKind(a: Node, b: Node): boolean {
  if (a.nodeType !== b.nodeType) return false;
  if (a instanceof Element && b instanceof Element) {
    // A different station (or a different element) is a different thing: replace it rather than edit it.
    return a.tagName === b.tagName && a.getAttribute("data-card") === b.getAttribute("data-card");
  }
  return true;
}

function morphAttributes(from: Element, to: Element) {
  for (const { name, value } of [...to.attributes]) {
    if (OWN_ATTRIBUTES.has(name) && from.hasAttribute(name)) continue;
    if (from.getAttribute(name) !== value) from.setAttribute(name, value);
  }
  for (const { name } of [...from.attributes]) {
    if (!to.hasAttribute(name) && !OWN_ATTRIBUTES.has(name)) from.removeAttribute(name);
  }
}

function morphChildren(from: Node, to: Node): number {
  let changes = 0;
  const fresh = [...to.childNodes];
  let current = from.firstChild;
  for (const next of fresh) {
    if (!current) {
      from.appendChild(next);
      changes++;
      continue;
    }
    const following: ChildNode | null = current.nextSibling;
    changes += morphNode(current, next);
    current = following;
  }
  // Anything left over in the old page is gone from the fresh one.
  while (current) {
    const following: ChildNode | null = current.nextSibling;
    from.removeChild(current);
    changes++;
    current = following;
  }
  return changes;
}

function morphNode(from: ChildNode, to: ChildNode): number {
  if (!sameKind(from, to)) {
    from.replaceWith(to);
    return 1;
  }
  if (from.nodeType === Node.TEXT_NODE || from.nodeType === Node.COMMENT_NODE) {
    if (from.nodeValue === to.nodeValue) return 0;
    from.nodeValue = to.nodeValue;
    return 1;
  }
  if (!(from instanceof Element) || !(to instanceof Element)) return 0;
  if (from.matches(KEEP)) return 0;
  // Same element: an image with the same address stays loaded, a button keeps its focus.
  morphAttributes(from, to);
  return morphChildren(from, to);
}

/** Makes `root`'s content match `markup`. Returns how many places changed (0 = the page was already up to date). */
export function morph(root: Element, markup: string): number {
  const template = document.createElement("template");
  template.innerHTML = markup;
  return morphChildren(root, template.content);
}
