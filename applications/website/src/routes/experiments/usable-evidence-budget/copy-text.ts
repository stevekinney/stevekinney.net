/**
 * Puts text on the clipboard. The clipboard can reject, such as in a frame
 * or when the page lacks permission, so this reports whether it worked
 * instead of throwing.
 */
export const copyText = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);

    return true;
  } catch {
    return false;
  }
};
