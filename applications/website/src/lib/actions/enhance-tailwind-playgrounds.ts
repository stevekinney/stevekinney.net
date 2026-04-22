import { decodeTailwindPlaygroundHtml } from '@stevekinney/utilities/tailwind-playground';

export function enhanceTailwindPlaygrounds(node: HTMLElement): { destroy: () => void } {
  const playgrounds = node.querySelectorAll<HTMLElement>('[data-tailwind-playground]');
  const placeholders: Array<{ element: HTMLElement; html: string }> = [];

  for (const playground of playgrounds) {
    const encodedHtml = playground.dataset.tailwindPlaygroundHtml;
    if (!encodedHtml) continue;

    const html = decodeTailwindPlaygroundHtml(encodedHtml);
    playground.innerHTML = html;
    placeholders.push({ element: playground, html });
  }

  return {
    destroy() {
      for (const placeholder of placeholders) {
        placeholder.element.innerHTML = '';
      }
    },
  };
}
