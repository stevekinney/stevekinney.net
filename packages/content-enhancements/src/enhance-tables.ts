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

const CONTAINER_CLASSES = [
  'flex',
  'gap-1',
  'opacity-0',
  'group-hover:opacity-100',
  'transition-opacity',
  'absolute',
  'right-2',
  'top-2',
  'z-10',
].join(' ');

function showFeedback(button: HTMLButtonElement, success: boolean, idleIcon: string): void {
  button.innerHTML = success ? CHECK_SVG : ERROR_SVG;
  button.style.color = success ? '#4ade80' : '#f87171';
  setTimeout(() => {
    button.innerHTML = idleIcon;
    button.style.color = '';
  }, 2000);
}

/** The table is drawn on whatever the page is, so the image matches light or dark. */
function pageBackgroundColor(): string {
  for (const element of [document.body, document.documentElement]) {
    const color = getComputedStyle(element).backgroundColor;
    if (color && color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent') return color;
  }

  return '#ffffff';
}

function tableToMarkdown(table: HTMLTableElement): string {
  const rows: string[][] = [];

  for (const row of table.rows) {
    const cells: string[] = [];
    for (const cell of row.cells) {
      cells.push(cell.textContent?.trim() ?? '');
    }
    rows.push(cells);
  }

  if (rows.length === 0) return '';

  const columnCount = Math.max(...rows.map((r) => r.length));
  const widths = Array.from({ length: columnCount }, (_, col) =>
    Math.max(...rows.map((r) => (r[col] ?? '').length), 3),
  );

  const pad = (text: string, width: number) => text.padEnd(width);
  const formatRow = (cells: string[]) =>
    '| ' + cells.map((c, i) => pad(c, widths[i])).join(' | ') + ' |';

  const lines: string[] = [];
  lines.push(formatRow(rows[0]));

  const hasHeader = table.querySelector('thead') !== null;
  if (hasHeader) {
    const separators = widths.map((w) => '-'.repeat(w));
    lines.push('| ' + separators.join(' | ') + ' |');
  }

  for (const row of rows.slice(1)) {
    lines.push(formatRow(row));
  }

  return lines.join('\n');
}

function tableToCleanHtml(table: HTMLTableElement): string {
  const clone = table.cloneNode(true) as HTMLTableElement;

  clone.removeAttribute('class');
  clone.style.borderCollapse = 'collapse';
  clone.style.fontFamily = '-apple-system, system-ui, sans-serif';
  clone.style.fontSize = '16px';

  for (const cell of clone.querySelectorAll<HTMLTableCellElement>('th, td')) {
    cell.removeAttribute('class');
    cell.style.border = '1px solid #ccc';
    cell.style.padding = '8px 12px';
    cell.style.textAlign = 'left';
  }

  for (const th of clone.querySelectorAll<HTMLTableCellElement>('th')) {
    th.style.fontWeight = '600';
    th.style.backgroundColor = '#f5f5f5';
  }

  return clone.outerHTML;
}

async function copyTableToClipboard(table: HTMLTableElement): Promise<void> {
  const markdown = tableToMarkdown(table);
  const html = tableToCleanHtml(table);

  const item = new ClipboardItem({
    'text/html': new Blob([html], { type: 'text/html' }),
    'text/plain': new Blob([markdown], { type: 'text/plain' }),
  });

  await navigator.clipboard.write([item]);
}

type ImageCopyModule = typeof import('./copy-code-block-as-image');

const loadImageCopyModuleIfSupported = async (): Promise<ImageCopyModule | null> => {
  const module = await import('./copy-code-block-as-image');
  return module.supportsClipboardImageCopy() ? module : null;
};

export async function enhanceTables(node: HTMLElement): Promise<{ destroy: () => void }> {
  const imageCopyModule = await loadImageCopyModuleIfSupported();
  const tables = node.querySelectorAll<HTMLTableElement>('table');
  const wrappers: HTMLElement[] = [];

  for (const table of tables) {
    const wrapper = document.createElement('div');
    wrapper.className = 'relative group';
    table.parentNode?.insertBefore(wrapper, table);
    wrapper.appendChild(table);

    const container = document.createElement('div');
    container.className = CONTAINER_CLASSES;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = BUTTON_CLASSES;
    button.setAttribute('aria-label', 'Copy table');
    button.innerHTML = CLIPBOARD_SVG;

    button.addEventListener('click', async () => {
      try {
        await copyTableToClipboard(table);
        showFeedback(button, true, CLIPBOARD_SVG);
      } catch (error) {
        console.error('Failed to copy table:', error);
        showFeedback(button, false, CLIPBOARD_SVG);
      }
    });

    container.appendChild(button);

    if (imageCopyModule) {
      const imageButton = document.createElement('button');
      imageButton.type = 'button';
      imageButton.className = BUTTON_CLASSES;
      imageButton.setAttribute('aria-label', 'Copy table as image');
      imageButton.innerHTML = CAMERA_SVG;

      imageButton.addEventListener('click', async () => {
        try {
          container.style.display = 'none';
          await imageCopyModule.copyElementAsImage(wrapper, {
            backgroundColor: pageBackgroundColor(),
            padding: '16px',
          });
          container.style.display = '';
          showFeedback(imageButton, true, CAMERA_SVG);
        } catch (error) {
          container.style.display = '';
          console.error('Failed to copy table as image:', error);
          showFeedback(imageButton, false, CAMERA_SVG);
        }
      });

      container.appendChild(imageButton);
    }

    wrapper.appendChild(container);
    wrappers.push(wrapper);
  }

  return {
    destroy() {
      for (const wrapper of wrappers) {
        const table = wrapper.querySelector('table');
        if (table) {
          wrapper.parentNode?.insertBefore(table, wrapper);
        }
        wrapper.remove();
      }
    },
  };
}
