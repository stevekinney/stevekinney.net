/**
 * One color per category for the graph. The eight known categories take the
 * Okabe-Ito palette, chosen to stay apart for the common kinds of color
 * blindness, and the node's stroke and its label back the color up. A category
 * the library doesn't know gets a stable color from a hash of its name.
 */
const knownColors: Record<string, string> = {
  methodology: '#0072b2',
  'context-management': '#e69f00',
  verification: '#009e73',
  'control-loop': '#d55e00',
  'multi-agent': '#cc79a7',
  academic: '#56b4e9',
  planning: '#b8a400',
  governance: '#6b6b6b',
};

export const categoryColor = (category: string): string => {
  const known = knownColors[category];
  if (known) return known;

  let hash = 0;
  for (const character of category) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;

  return `hsl(${hash % 360} 55% 45%)`;
};
