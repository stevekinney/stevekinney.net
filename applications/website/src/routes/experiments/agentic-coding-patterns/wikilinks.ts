export type Wikilink = {
  /** The note's name, without a folder, heading, or block reference. */
  target: string;
  /** What to show: the text after `|`, or the target. */
  label: string;
};

/** Reads what's inside `[[...]]`: `Target`, `Target|label`, `Target#Heading`, or `folder/Target`. */
export const parseWikilink = (inner: string): Wikilink | null => {
  const [reference = '', ...labelParts] = inner.split('|');
  const target = (reference.split(/[#^]/)[0] ?? '').split('/').at(-1)?.trim() ?? '';
  if (target === '') return null;

  const label = labelParts.join('|').trim();

  return { target, label: label === '' ? target : label };
};

/** The targets of every `[[wikilink]]` in a piece of text, ignoring `![[embeds]]`. */
export const extractWikilinkTargets = (text: string): string[] => {
  const targets: string[] = [];

  for (const match of text.matchAll(/(!?)\[\[([^\]\n]+)\]\]/g)) {
    if (match[1] === '!') continue;

    const link = parseWikilink(match[2] ?? '');
    if (link) targets.push(link.target);
  }

  return targets;
};
