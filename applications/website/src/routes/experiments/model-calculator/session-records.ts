import type { TokenUsage } from './token-usage';

/** One billed model request found in a session file. */
export type SessionRequest = {
  /** The model ID exactly as the session file recorded it. */
  model: string;
  usage: TokenUsage;
  /** Every input token sent with this request, used to flag prompt-size pricing tiers. */
  promptTokens: number;
};

export type JsonRecord = Record<string, unknown>;

export const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Reads a token count, treating anything that isn't a non-negative finite number as zero. */
export const readCount = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;
