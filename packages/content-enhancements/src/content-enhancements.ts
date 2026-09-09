type EnhancerResult = { destroy?: () => void } | void;
type Enhancer = (root: HTMLElement) => EnhancerResult | Promise<EnhancerResult>;

const enhancers: ReadonlyArray<{ selector: string; load: () => Promise<Enhancer> }> = [
  {
    selector: ':is(h2, h3)[id]',
    load: async () => (await import('./enhance-table-of-contents')).enhanceTableOfContents,
  },
  {
    selector: '[data-tailwind-playground]',
    load: async () => (await import('./enhance-tailwind-playgrounds')).enhanceTailwindPlaygrounds,
  },
  {
    selector: '[data-language]',
    load: async () => (await import('./enhance-code-blocks')).enhanceCodeBlocks,
  },
  {
    selector: '[data-mermaid]',
    load: async () => (await import('./enhance-mermaid-diagrams')).enhanceMermaidDiagrams,
  },
  {
    selector: 'table',
    load: async () => (await import('./enhance-tables')).enhanceTables,
  },
];

const cleanupsByRoot = new WeakMap<HTMLElement, Array<() => void>>();

const getRoots = (): HTMLElement[] => [
  ...document.querySelectorAll<HTMLElement>('[data-content-document]'),
];

const cleanupRoot = (root: HTMLElement): void => {
  const cleanups = cleanupsByRoot.get(root);
  if (cleanups) {
    for (let index = cleanups.length - 1; index >= 0; index -= 1) cleanups[index]();
    cleanupsByRoot.delete(root);
  }
  delete root.dataset.contentEnhanced;
};

const applyEnhancements = async (): Promise<void> => {
  const roots = getRoots();
  if (roots.length === 0) return;

  const activeEnhancers = await Promise.all(
    enhancers
      .filter(({ selector }) => roots.some((root) => root.querySelector(selector)))
      .map(async ({ selector, load }) => ({ selector, enhance: await load() })),
  );

  await Promise.all(
    roots.map(async (root) => {
      cleanupRoot(root);
      const cleanups: Array<() => void> = [];
      for (const { selector, enhance } of activeEnhancers) {
        if (!root.querySelector(selector)) continue;
        const result = await enhance(root);
        if (typeof result?.destroy === 'function') cleanups.push(result.destroy);
      }
      if (cleanups.length > 0) cleanupsByRoot.set(root, cleanups);
      root.dataset.contentEnhanced = 'true';
    }),
  );
};

/**
 * The page loads this entry with a cache-busting `?v=` query, while the lazily
 * imported enhancer chunks import it back by its bare filename for shared
 * symbols. Those are two different URLs, so the browser instantiates this
 * module twice and runs everything below a second time. `cleanupsByRoot` is
 * per-instance, so the second instance sees no prior work and enhances every
 * root again — which is how a page ends up with two "On this page" navs and a
 * duplicate landmark. Claim a flag on `window` so only the first instance
 * drives enhancements; the second becomes inert.
 */
const ACTIVE_FLAG = '__contentEnhancementsActive';

type EnhancementWindow = Window & { [ACTIVE_FLAG]?: boolean };
const enhancementWindow = window as EnhancementWindow;

if (!enhancementWindow[ACTIVE_FLAG]) {
  enhancementWindow[ACTIVE_FLAG] = true;
  registerEnhancementLifecycle();
}

function registerEnhancementLifecycle(): void {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyEnhancements, { once: true });
  } else {
    applyEnhancements();
  }

  window.addEventListener('pagehide', () => {
    for (const root of getRoots()) cleanupRoot(root);
  });

  // If the browser restores the document from the back/forward cache the
  // pagehide listener above has already torn every enhancement down. Re-run
  // them so copy buttons, diagrams, and playgrounds come back.
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) applyEnhancements();
  });
}
