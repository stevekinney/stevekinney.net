type RootEnhancer = (node: HTMLElement) => Promise<unknown> | unknown;

type EnhancementDefinition = {
  selector: string;
  load: () => Promise<RootEnhancer>;
};

type LoadedEnhancement = {
  selector: string;
  enhance: RootEnhancer;
};

const enhancementDefinitions: EnhancementDefinition[] = [
  {
    selector: '[data-tailwind-playground]',
    load: () =>
      import('./actions/enhance-tailwind-playgrounds').then(
        (module) => module.enhanceTailwindPlaygrounds as RootEnhancer,
      ),
  },
  {
    selector: '[data-language]',
    load: () =>
      import('./actions/enhance-code-blocks').then(
        (module) => module.enhanceCodeBlocks as RootEnhancer,
      ),
  },
  {
    selector: '[data-mermaid]',
    load: () =>
      import('./actions/enhance-mermaid-diagrams').then(
        (module) => module.enhanceMermaidDiagrams as RootEnhancer,
      ),
  },
  {
    selector: 'table',
    load: () => import('./actions/enhance-tables').then((module) => module.enhanceTables),
  },
];

const getPendingRoots = (): HTMLElement[] =>
  [...document.querySelectorAll<HTMLElement>('[data-content-document]')].filter(
    (root) => root.dataset.contentEnhanced !== 'true',
  );

const matchesAnyRoot = (roots: HTMLElement[], selector: string): boolean =>
  roots.some((root) => root.querySelector(selector) !== null);

const loadEnhancements = async (roots: HTMLElement[]): Promise<LoadedEnhancement[]> =>
  Promise.all(
    enhancementDefinitions
      .filter(({ selector }) => matchesAnyRoot(roots, selector))
      .map(async ({ selector, load }) => ({
        selector,
        enhance: await load(),
      })),
  );

const enhanceRoot = async (root: HTMLElement, enhancements: LoadedEnhancement[]): Promise<void> => {
  for (const { selector, enhance } of enhancements) {
    if (root.querySelector(selector)) {
      await enhance(root);
    }
  }

  root.dataset.contentEnhanced = 'true';
};

const applyEnhancements = async (): Promise<void> => {
  const roots = getPendingRoots();
  if (roots.length === 0) {
    return;
  }

  const enhancements = await loadEnhancements(roots);
  await Promise.all(roots.map((root) => enhanceRoot(root, enhancements)));
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', applyEnhancements, { once: true });
} else {
  applyEnhancements();
}
