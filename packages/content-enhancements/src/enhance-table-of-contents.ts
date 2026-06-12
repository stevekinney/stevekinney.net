const NAV_CLASSES = [
  'mb-6',
  'rounded-lg',
  'border',
  'border-slate-200',
  'bg-slate-50',
  'px-5',
  'py-4',
  'text-sm',
  'leading-normal',
  'dark:border-slate-700',
  'dark:bg-slate-800/50',
].join(' ');

const TITLE_CLASSES = [
  'm-0',
  'mb-2',
  'text-xs',
  'font-semibold',
  'tracking-wider',
  'uppercase',
  'text-slate-500',
  'dark:text-slate-400',
].join(' ');

const LIST_CLASSES = ['m-0', 'list-none', 'p-0'].join(' ');

const ITEM_CLASSES_H2 = ['my-1', 'p-0'].join(' ');

const ITEM_CLASSES_H3 = ['my-1', 'p-0', 'pl-4'].join(' ');

const LINK_CLASSES = [
  'block',
  'py-0.5',
  'text-slate-600',
  'no-underline',
  'hover:text-slate-900',
  'dark:text-slate-300',
  'dark:hover:text-white',
].join(' ');

/**
 * Injects an "On this page" navigation nav before the first heading in the
 * content root when there are 3 or more linkable `h2`/`h3` elements with `id`
 * attributes. The `id`s are added upstream by the markdown pipeline.
 *
 * A heading is linkable only if it has non-empty trimmed text and an `id` not
 * already used by an earlier heading — duplicate `id`s would produce ambiguous
 * fragment links, and empty headings would produce blank, inaccessible links.
 */
export function enhanceTableOfContents(node: HTMLElement): { destroy: () => void } {
  const seenIds = new Set<string>();
  const headings = [...node.querySelectorAll<HTMLElement>(':is(h2, h3)[id]')].filter((heading) => {
    const text = heading.textContent?.trim();
    if (!text || seenIds.has(heading.id)) return false;
    seenIds.add(heading.id);
    return true;
  });

  if (headings.length < 3) {
    return { destroy() {} };
  }

  const nav = document.createElement('nav');
  nav.setAttribute('aria-label', 'On this page');
  nav.className = NAV_CLASSES;

  const title = document.createElement('p');
  title.textContent = 'On this page';
  title.className = TITLE_CLASSES;
  nav.appendChild(title);

  const list = document.createElement('ul');
  list.className = LIST_CLASSES;

  for (const heading of headings) {
    const isH3 = heading.tagName === 'H3';

    const item = document.createElement('li');
    item.className = isH3 ? ITEM_CLASSES_H3 : ITEM_CLASSES_H2;

    const anchor = document.createElement('a');
    // Percent-encode the fragment so ids with spaces or non-ASCII characters
    // still produce valid links. Heading ids are URL-safe slugs in practice, so
    // this is a no-op for the common case.
    anchor.setAttribute('href', `#${encodeURIComponent(heading.id)}`);
    anchor.textContent = heading.textContent?.trim() ?? '';
    anchor.className = LINK_CLASSES;

    item.appendChild(anchor);
    list.appendChild(item);
  }

  nav.appendChild(list);

  const firstHeading = headings[0];
  firstHeading.parentNode?.insertBefore(nav, firstHeading);

  return {
    destroy() {
      nav.remove();
    },
  };
}
