/** How many characters a string has, counting an emoji or other astral character once. */
export const countCharacters = (text: string): number => Array.from(text).length;

/**
 * The first `maximum` characters of trimmed text, trimmed again. It cuts by
 * code point, so it never splits an emoji's surrogate pair into a broken one.
 */
export const truncateCharacters = (text: string, maximum: number): string =>
  Array.from(text.trim()).slice(0, maximum).join('').trim();
