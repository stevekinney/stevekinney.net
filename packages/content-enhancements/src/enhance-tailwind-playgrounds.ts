import { decodeTailwindPlaygroundHtml } from '@stevekinney/utilities/tailwind-playground';

export function enhanceTailwindPlaygrounds(node: HTMLElement): { destroy: () => void } {
  const playgrounds = node.querySelectorAll<HTMLElement>('[data-tailwind-playground]');
  const enhanced: HTMLElement[] = [];

  for (const playground of playgrounds) {
    const encodedHtml = playground.dataset.tailwindPlaygroundHtml;
    if (!encodedHtml) continue;

    playground.innerHTML = decodeTailwindPlaygroundHtml(encodedHtml);
    enhanced.push(playground);
  }

  return {
    destroy() {
      for (const playground of enhanced) {
        playground.innerHTML = '';
      }
    },
  };
}
