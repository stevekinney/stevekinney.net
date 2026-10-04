export type ReorderOptions = {
  /** Called with the index of the dragged row and the index of the row it was dropped on. */
  onMove: (from: number, to: number) => void;
};

const rowOf = (target: EventTarget | null): HTMLElement | null =>
  target instanceof Element ? target.closest<HTMLElement>('tr[data-index]') : null;

const dropTarget = ['bg-primary-50', 'dark:bg-primary-950/40'];

/**
 * Lets the rows of a table body be dragged into a new order. Each row needs a
 * `data-index` and `draggable="true"`. The listeners sit on the body and find
 * the row from the event, so they don't have to be repeated on every row.
 * Keyboard users reorder with the move buttons instead.
 */
export const reorderable = (body: HTMLElement, options: ReorderOptions) => {
  let current = options;
  let dragging: number | null = null;
  let hovered: HTMLElement | null = null;

  const clear = (): void => {
    dragging = null;
    hovered?.classList.remove(...dropTarget);
    hovered = null;
    for (const row of body.querySelectorAll('.opacity-50')) row.classList.remove('opacity-50');
  };

  const handleDragStart = (event: DragEvent): void => {
    const row = rowOf(event.target);
    if (!row) return;

    dragging = Number(row.dataset.index);
    row.classList.add('opacity-50');
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', row.dataset.path ?? '');
    }
  };

  const handleDragOver = (event: DragEvent): void => {
    if (dragging === null) return;

    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';

    const row = rowOf(event.target);
    if (row !== hovered) {
      hovered?.classList.remove(...dropTarget);
      hovered = row;
      hovered?.classList.add(...dropTarget);
    }
  };

  const handleDrop = (event: DragEvent): void => {
    if (dragging === null) return;

    event.preventDefault();
    const row = rowOf(event.target);
    const from = dragging;
    clear();

    if (row) current.onMove(from, Number(row.dataset.index));
  };

  body.addEventListener('dragstart', handleDragStart);
  body.addEventListener('dragover', handleDragOver);
  body.addEventListener('drop', handleDrop);
  body.addEventListener('dragend', clear);

  return {
    update(next: ReorderOptions): void {
      current = next;
    },
    destroy(): void {
      body.removeEventListener('dragstart', handleDragStart);
      body.removeEventListener('dragover', handleDragOver);
      body.removeEventListener('drop', handleDrop);
      body.removeEventListener('dragend', clear);
    },
  };
};
