type DestroyableEnhancement = {
  destroy: () => void;
};

type RootEnhancer =
  | ((node: HTMLElement) => Promise<DestroyableEnhancement | void>)
  | ((node: HTMLElement) => DestroyableEnhancement | void);

type EnhancementDefinition = {
  selector: string;
  load: () => Promise<RootEnhancer>;
};

type LoadedEnhancement = {
  selector: string;
  enhance: RootEnhancer;
};

const cleanupByRoot = new WeakMap<HTMLElement, Array<() => void>>();

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

const getContentRoots = (): HTMLElement[] => [
  ...document.querySelectorAll<HTMLElement>('[data-content-document]'),
];

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

const getDestroyCallback = (value: DestroyableEnhancement | void): (() => void) | null =>
  typeof value?.destroy === 'function' ? value.destroy : null;

const cleanupRoot = (root: HTMLElement): void => {
  const cleanupCallbacks = cleanupByRoot.get(root) ?? [];

  for (const cleanup of [...cleanupCallbacks].reverse()) {
    cleanup();
  }

  cleanupByRoot.delete(root);
  delete root.dataset.contentEnhanced;
};

const enhanceRoot = async (root: HTMLElement, enhancements: LoadedEnhancement[]): Promise<void> => {
  cleanupRoot(root);

  const cleanupCallbacks: Array<() => void> = [];

  for (const { selector, enhance } of enhancements) {
    if (root.querySelector(selector)) {
      const result = await enhance(root);
      const destroy = getDestroyCallback(result);
      if (destroy) {
        cleanupCallbacks.push(destroy);
      }
    }
  }

  if (cleanupCallbacks.length > 0) {
    cleanupByRoot.set(root, cleanupCallbacks);
  }

  root.dataset.contentEnhanced = 'true';
};

const applyEnhancements = async (): Promise<void> => {
  const roots = getContentRoots();
  if (roots.length === 0) {
    return;
  }

  const enhancements = await loadEnhancements(roots);
  await Promise.all(roots.map((root) => enhanceRoot(root, enhancements)));
};

const cleanupEnhancements = (): void => {
  for (const root of getContentRoots()) {
    cleanupRoot(root);
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', applyEnhancements, { once: true });
} else {
  applyEnhancements();
}

window.addEventListener('pagehide', cleanupEnhancements, { once: true });
