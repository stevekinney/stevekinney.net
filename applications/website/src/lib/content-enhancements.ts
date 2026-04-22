import { enhanceCodeBlocks } from '$lib/actions/enhance-code-blocks';
import { enhanceMermaidDiagrams } from '$lib/actions/enhance-mermaid-diagrams';
import { enhanceTailwindPlaygrounds } from '$lib/actions/enhance-tailwind-playgrounds';
import { enhanceTables } from '$lib/actions/enhance-tables';

const applyEnhancements = (): void => {
  const roots = document.querySelectorAll<HTMLElement>('[data-content-document]');

  for (const root of roots) {
    if (root.dataset.contentEnhanced === 'true') continue;

    enhanceTailwindPlaygrounds(root);
    enhanceCodeBlocks(root);
    enhanceMermaidDiagrams(root);
    enhanceTables(root);

    root.dataset.contentEnhanced = 'true';
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', applyEnhancements, { once: true });
} else {
  applyEnhancements();
}
