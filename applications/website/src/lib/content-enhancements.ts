type RootEnhancer = (node: HTMLElement) => Promise<unknown> | unknown;

const hasMatch = (roots: HTMLElement[], selector: string): boolean =>
  roots.some((root) => root.querySelector(selector) !== null);

const applyEnhancements = async (): Promise<void> => {
  const roots = [...document.querySelectorAll<HTMLElement>('[data-content-document]')].filter(
    (root) => root.dataset.contentEnhanced !== 'true',
  );

  if (roots.length === 0) {
    return;
  }

  const [tailwindEnhancer, codeBlockEnhancer, mermaidEnhancer, tableEnhancer] = await Promise.all([
    hasMatch(roots, '[data-tailwind-playground]')
      ? import('./actions/enhance-tailwind-playgrounds').then(
          (module) => module.enhanceTailwindPlaygrounds as RootEnhancer,
        )
      : Promise.resolve<RootEnhancer | null>(null),
    hasMatch(roots, '[data-language]')
      ? import('./actions/enhance-code-blocks').then(
          (module) => module.enhanceCodeBlocks as RootEnhancer,
        )
      : Promise.resolve<RootEnhancer | null>(null),
    hasMatch(roots, '[data-mermaid]')
      ? import('./actions/enhance-mermaid-diagrams').then(
          (module) => module.enhanceMermaidDiagrams as RootEnhancer,
        )
      : Promise.resolve<RootEnhancer | null>(null),
    hasMatch(roots, 'table')
      ? import('./actions/enhance-tables').then((module) => module.enhanceTables as RootEnhancer)
      : Promise.resolve<RootEnhancer | null>(null),
  ]);

  for (const root of roots) {
    if (tailwindEnhancer && root.querySelector('[data-tailwind-playground]')) {
      await tailwindEnhancer(root);
    }

    if (codeBlockEnhancer && root.querySelector('[data-language]')) {
      await codeBlockEnhancer(root);
    }

    if (mermaidEnhancer && root.querySelector('[data-mermaid]')) {
      await mermaidEnhancer(root);
    }

    if (tableEnhancer && root.querySelector('table')) {
      await tableEnhancer(root);
    }

    root.dataset.contentEnhanced = 'true';
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', applyEnhancements, { once: true });
} else {
  applyEnhancements();
}
