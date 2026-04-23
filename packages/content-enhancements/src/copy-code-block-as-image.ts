/**
 * Converts a code block DOM element to a PNG blob and copies it to the clipboard.
 * Temporarily shrinks the element to fit its content so the image is tightly cropped.
 */
export async function copyCodeBlockAsImage(element: HTMLElement): Promise<void> {
  const { domToBlob } = await import('modern-screenshot');

  const previousWidth = element.style.width;
  const previousOverflow = element.style.overflow;
  element.style.width = 'fit-content';
  element.style.overflow = 'visible';

  try {
    const blob = await domToBlob(element, {
      scale: 2,
      backgroundColor: '#011627',
    });

    if (!blob) {
      throw new Error('Failed to generate image from code block');
    }

    await navigator.clipboard.write([
      new ClipboardItem({
        'image/png': blob,
      }),
    ]);
  } finally {
    element.style.width = previousWidth;
    element.style.overflow = previousOverflow;
  }
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
