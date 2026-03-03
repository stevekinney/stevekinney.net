import { copyCodeBlockAsImage, supportsClipboardImageCopy } from '$lib/copy-code-block-as-image';

const CLIPBOARD_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg>`;
const CAMERA_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>`;
const CHECK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`;
const ERROR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`;

const BUTTON_CLASSES = [
  'flex',
  'items-center',
  'justify-center',
  'rounded',
  'border',
  'border-slate-600',
  'bg-slate-800/80',
  'p-1.5',
  'text-slate-300',
  'backdrop-blur-sm',
  'hover:bg-slate-700',
  'hover:text-white',
  'cursor-pointer',
].join(' ');

const CONTAINER_BASE_CLASSES = [
  'flex',
  'gap-1',
  'opacity-0',
  'group-hover:opacity-100',
  'transition-opacity',
];
const CONTAINER_FLOATING_CLASSES = ['absolute', 'right-2', 'top-2', 'z-10'];

function showFeedback(button: HTMLButtonElement, success: boolean, originalSvg: string): void {
  button.innerHTML = success ? CHECK_SVG : ERROR_SVG;
  button.style.color = success ? '#4ade80' : '#f87171';
  setTimeout(() => {
    button.innerHTML = originalSvg;
    button.style.color = '';
  }, 2000);
}

function createCopyTextButton(codeBlock: HTMLElement): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = BUTTON_CLASSES;
  button.setAttribute('aria-label', 'Copy code');
  button.innerHTML = CLIPBOARD_SVG;

  button.addEventListener('click', async () => {
    try {
      const codeElement = codeBlock.querySelector('pre code');
      let text = '';
      if (codeElement) {
        const clone = codeElement.cloneNode(true) as HTMLElement;
        clone.querySelectorAll('.code-annotation').forEach((el) => el.remove());
        text = clone.textContent ?? '';
      } else {
        text = codeBlock.querySelector('pre')?.textContent ?? '';
      }
      await navigator.clipboard.writeText(text);
      showFeedback(button, true, CLIPBOARD_SVG);
    } catch (error) {
      console.error('Failed to copy code:', error);
      showFeedback(button, false, CLIPBOARD_SVG);
    }
  });

  return button;
}

function createCopyImageButton(codeBlock: HTMLElement, container: HTMLElement): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = BUTTON_CLASSES;
  button.setAttribute('aria-label', 'Copy as image');
  button.innerHTML = CAMERA_SVG;

  button.addEventListener('click', async () => {
    try {
      container.style.display = 'none';
      await copyCodeBlockAsImage(codeBlock);
      container.style.display = '';
      showFeedback(button, true, CAMERA_SVG);
    } catch (error) {
      container.style.display = '';
      console.error('Failed to copy code block as image:', error);
      showFeedback(button, false, CAMERA_SVG);
    }
  });

  return button;
}

export function enhanceCodeBlocks(node: HTMLElement): { destroy: () => void } {
  const codeBlocks = node.querySelectorAll<HTMLElement>('[data-language]');
  const containers: HTMLElement[] = [];
  const canCopyImage = supportsClipboardImageCopy();

  for (const codeBlock of codeBlocks) {
    codeBlock.classList.add('relative', 'group');

    const header = codeBlock.querySelector<HTMLElement>('.code-block-header');
    const container = document.createElement('div');

    container.appendChild(createCopyTextButton(codeBlock));

    if (canCopyImage) {
      container.appendChild(createCopyImageButton(codeBlock, container));
    }

    if (header) {
      container.className = CONTAINER_BASE_CLASSES.join(' ');
      header.appendChild(container);
    } else {
      container.className = [...CONTAINER_BASE_CLASSES, ...CONTAINER_FLOATING_CLASSES].join(' ');
      codeBlock.appendChild(container);
    }

    containers.push(container);
  }

  return {
    destroy() {
      for (const container of containers) {
        container.remove();
      }
    },
  };
}
