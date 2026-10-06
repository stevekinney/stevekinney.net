/**
 * Converts a DOM element to a PNG blob and copies it to the clipboard.
 * Temporarily shrinks the element to fit its content so the image is tightly cropped.
 */
export async function copyElementAsImage(
  element: HTMLElement,
  { backgroundColor, padding }: { backgroundColor: string; padding?: string },
): Promise<void> {
  const { domToBlob } = await import('modern-screenshot');

  const previousWidth = element.style.width;
  const previousOverflow = element.style.overflow;
  const previousPadding = element.style.padding;
  element.style.width = 'fit-content';
  element.style.overflow = 'visible';
  if (padding) element.style.padding = padding;

  try {
    const blob = await domToBlob(element, {
      scale: 2,
      backgroundColor,
    });

    if (!blob) {
      throw new Error('Failed to generate image from element');
    }

    await navigator.clipboard.write([
      new ClipboardItem({
        'image/png': blob,
      }),
    ]);
  } finally {
    element.style.width = previousWidth;
    element.style.overflow = previousOverflow;
    element.style.padding = previousPadding;
  }
}

/**
 * Converts a code block DOM element to a PNG blob and copies it to the clipboard.
 */
export function copyCodeBlockAsImage(element: HTMLElement): Promise<void> {
  return copyElementAsImage(element, { backgroundColor: '#011627' });
}

/**
 * Checks whether the current browser supports copying images to the clipboard.
 */
export function supportsClipboardImageCopy(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.clipboard !== 'undefined' &&
    typeof navigator.clipboard.write === 'function' &&
    typeof ClipboardItem !== 'undefined'
  );
}
