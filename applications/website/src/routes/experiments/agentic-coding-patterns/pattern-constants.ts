/** The categories the library knows, in the order the heat grid lists them. */
export const knownCategories = [
  'methodology',
  'context-management',
  'verification',
  'control-loop',
  'multi-agent',
  'academic',
  'planning',
  'governance',
] as const;

export const knownMaturities = ['foundational', 'established', 'emerging'] as const;

export const knownConfidences = ['Strong', 'Emerging', 'Experimental'] as const;

/** Where the browser fetches the whole bundled library. `build-dataset.ts` writes it. */
export const bundledLibraryPath = '/experiments/agentic-coding-patterns/patterns.json';

/** The types a note must have to be included unless the person says otherwise. */
export const defaultIncludedTypes = ['pattern', 'methodology'] as const;

export const sectionHeadings = {
  summary: 'TL;DR',
  whenToUse: 'When To Use It',
  whenNotToUse: 'When Not To Use It',
  drawbacks: 'Drawbacks and Failure Modes',
  related: 'Related Patterns',
} as const;

export const sectionLabels = {
  summary: 'Summary',
  whenToUse: 'When to use it',
  whenNotToUse: 'When not to use it',
  drawbacks: 'Drawbacks and failure modes',
} as const;

/** The category a note without one is filed under. */
export const uncategorized = 'uncategorized';
