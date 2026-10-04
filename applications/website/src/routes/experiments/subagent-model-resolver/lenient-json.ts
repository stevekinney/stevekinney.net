/** Removes a leading byte order mark, which some editors add to the start of a file. */
export const stripByteOrderMark = (text: string): string =>
  text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

/**
 * Removes comments and trailing commas from JSON text, leaving string
 * contents alone, so a `//` inside a URL survives.
 */
export const stripJsonExtras = (text: string): string => {
  let output = '';
  let index = 0;

  while (index < text.length) {
    const character = text[index];
    const next = text[index + 1];

    if (character === '"') {
      let end = index + 1;
      while (end < text.length && text[end] !== '"') {
        end += text[end] === '\\' ? 2 : 1;
      }
      output += text.slice(index, end + 1);
      index = end + 1;
    } else if (character === '/' && next === '/') {
      while (index < text.length && text[index] !== '\n') index += 1;
    } else if (character === '/' && next === '*') {
      const end = text.indexOf('*/', index + 2);
      index = end === -1 ? text.length : end + 2;
    } else if (character === ',') {
      // A comma is trailing when the next real character closes a container.
      let lookahead = index + 1;
      while (lookahead < text.length) {
        const peek = text[lookahead];
        if (/\s/.test(peek)) lookahead += 1;
        else if (peek === '/' && text[lookahead + 1] === '/') {
          while (lookahead < text.length && text[lookahead] !== '\n') lookahead += 1;
        } else if (peek === '/' && text[lookahead + 1] === '*') {
          const end = text.indexOf('*/', lookahead + 2);
          lookahead = end === -1 ? text.length : end + 2;
        } else break;
      }

      if (text[lookahead] === '}' || text[lookahead] === ']') {
        index += 1;
      } else {
        output += character;
        index += 1;
      }
    } else {
      output += character;
      index += 1;
    }
  }

  return output;
};

export type LenientJson = { value: unknown; lenient: boolean };

/** Parses JSON, then retries without comments and trailing commas. `null` means neither worked. */
export const parseLenientJson = (text: string): LenientJson | null => {
  const source = stripByteOrderMark(text);

  try {
    return { value: JSON.parse(source), lenient: false };
  } catch {
    try {
      return { value: JSON.parse(stripJsonExtras(source)), lenient: true };
    } catch {
      return null;
    }
  }
};
