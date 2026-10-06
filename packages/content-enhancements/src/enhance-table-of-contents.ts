// `not-prose` keeps the typography plugin's margins off the title, list, and
// items so the padding below is the only spacing inside the box.
const NAV_CLASSES = [
  'not-prose',
  'mb-6',
  'rounded-lg',
  'border',
  'border-slate-200',
  'bg-slate-50',
  'p-4',
  'text-sm',
  'leading-normal',
  'dark:border-slate-700',
  'dark:bg-slate-800/50',
].join(' ');

const DETAILS_CLASSES = 'group';

const SUMMARY_CLASSES = [
  'flex',
  'cursor-pointer',
  'list-none',
  'items-center',
  'gap-1.5',
  'select-none',
  'text-xs',
  'font-semibold',
  'tracking-wider',
  'uppercase',
  'text-slate-500',
  'hover:text-slate-700',
  'dark:text-slate-400',
  'dark:hover:text-slate-200',
  '[&::-webkit-details-marker]:hidden',
].join(' ');

const CHEVRON_CLASSES = ['size-3', 'shrink-0', 'transition-transform', 'group-open:rotate-90'].join(
  ' ',
);

const LIST_CLASSES = ['m-0', 'mt-2', 'list-none', 'space-y-1', 'p-0'].join(' ');

const ITEM_CLASSES_H2 = ['m-0', 'p-0'].join(' ');

const ITEM_CLASSES_H3 = ['m-0', 'p-0', 'pl-4'].join(' ');

const createChevron = (): SVGSVGElement => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 16 16');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('class', CHEVRON_CLASSES);

  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', 'M6 4l4 4-4 4');
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('stroke-linejoin', 'round');
  svg.appendChild(path);

  return svg;
};

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
 * Injects a collapsible "On this page" navigation (open by default) before the first heading in the
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

  const details = document.createElement('details');
  details.className = DETAILS_CLASSES;
  details.open = true;

  const summary = document.createElement('summary');
  summary.className = SUMMARY_CLASSES;
  summary.append(createChevron(), 'On this page');
  details.appendChild(summary);

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

  details.appendChild(list);
  nav.appendChild(details);

  const firstHeading = headings[0];
  firstHeading.parentNode?.insertBefore(nav, firstHeading);

  return {
    destroy() {
      nav.remove();
    },
  };
}
