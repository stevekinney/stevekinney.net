/**
 * Token counts split the way providers bill them. Claude Code and Codex
 * sessions both normalize into this shape, and so does the manual form.
 */
export type TokenUsage = {
  /** Input tokens that were neither read from nor written to a prompt cache. */
  uncachedInput: number;
  /** Input tokens read from a prompt cache. */
  cacheRead: number;
  /** Input tokens written to a prompt-cache entry that lives five minutes. */
  cacheWrite5m: number;
  /** Input tokens written to a prompt-cache entry that lives one hour. */
  cacheWrite1h: number;
  /** Output tokens, including reasoning or thinking tokens. */
  output: number;
};

export const emptyTokenUsage = (): TokenUsage => ({
  uncachedInput: 0,
  cacheRead: 0,
  cacheWrite5m: 0,
  cacheWrite1h: 0,
  output: 0,
});

/** Adds `addition` into `target` in place and returns `target`. */
export const addTokenUsage = (target: TokenUsage, addition: TokenUsage): TokenUsage => {
  target.uncachedInput += addition.uncachedInput;
  target.cacheRead += addition.cacheRead;
  target.cacheWrite5m += addition.cacheWrite5m;
  target.cacheWrite1h += addition.cacheWrite1h;
  target.output += addition.output;

  return target;
};

/** Field order shared by every view that lists usage. */
export const TOKEN_USAGE_FIELDS = [
  'uncachedInput',
  'cacheRead',
  'cacheWrite5m',
  'cacheWrite1h',
  'output',
] as const satisfies readonly (keyof TokenUsage)[];

export const tokenUsageEquals = (first: TokenUsage, second: TokenUsage): boolean =>
  TOKEN_USAGE_FIELDS.every((field) => first[field] === second[field]);

/** Every input token in the usage, however it was billed. */
export const totalInputTokens = (usage: TokenUsage): number =>
  usage.uncachedInput + usage.cacheRead + usage.cacheWrite5m + usage.cacheWrite1h;

export const totalTokens = (usage: TokenUsage): number => totalInputTokens(usage) + usage.output;
