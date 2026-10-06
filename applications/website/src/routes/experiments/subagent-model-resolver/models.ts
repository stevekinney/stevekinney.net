/** Model families, cheapest to most expensive. */
export const families = ['haiku', 'sonnet', 'opus', 'fable'] as const;

export type Family = (typeof families)[number];

/**
 * A model that is not one of the four families, such as a custom model behind
 * a proxy. Its price is unknown, so it has no tier.
 */
export const unrecognized = 'unrecognized' as const;

export type ModelValue = Family | typeof unrecognized;

/**
 * What a source says about the model. `unset` means the source is absent and
 * `inherit` means "use the main conversation's model". A per-invocation model
 * never says `inherit`.
 */
export type ModelSetting = 'unset' | 'inherit' | ModelValue;

export const tierOf = (family: Family): number => families.indexOf(family) + 1;

export const isFamily = (value: string): value is Family =>
  (families as readonly string[]).includes(value);

/** Maps a family name or a full model ID, such as `claude-opus-5-5[1m]`, to its family by substring. */
export const familyOf = (modelId: string): Family | null =>
  families.find((family) => modelId.toLowerCase().includes(family)) ?? null;

/** The tier of a model, or `null` when it has none because the model is unrecognized. */
export const tierOfModel = (model: ModelValue): number | null =>
  model === unrecognized ? null : tierOf(model);

/** Caps a model at Opus. A family above Opus becomes `opus`; anything else is unchanged. */
export const capAtOpus = (model: ModelValue): ModelValue =>
  model !== unrecognized && tierOf(model) > tierOf('opus') ? 'opus' : model;

export const modelLabel = (model: ModelValue): string =>
  model === unrecognized ? 'unrecognized model ID' : model;

/** How a frontmatter or environment value reads once mapped. */
export type ParsedModelValue = {
  setting: ModelSetting;
  /** Set when the text was not empty, `inherit`, or a recognizable model. */
  unknown: boolean;
};

/**
 * Reads a raw model string from frontmatter, a settings file, or the
 * environment. Quotes and case don't matter, `inherit` stays `inherit`, and a
 * full model ID maps to its family. Anything else is a model Claude Code would
 * pass along as-is, so it resolves to an unrecognized model, with a warning.
 */
export const parseModelSetting = (raw: string | null | undefined): ParsedModelValue => {
  const text = (raw ?? '')
    .trim()
    .replace(/^(['"])(.*)\1$/, '$2')
    .trim();

  if (text === '') return { setting: 'unset', unknown: false };
  if (text.toLowerCase() === 'inherit') return { setting: 'inherit', unknown: false };

  const family = familyOf(text);

  return family ? { setting: family, unknown: false } : { setting: unrecognized, unknown: true };
};
