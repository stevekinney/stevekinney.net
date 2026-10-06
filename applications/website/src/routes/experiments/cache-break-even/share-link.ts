import { defaultState, MAX_RATIO, MAX_TOKENS, normalizeState } from './calculator-state';
import type { CalculatorState } from './calculator-state';
import { defaultPricing, isCustomPricing, parsePricingTable } from './pricing';
import type { PricingTable } from './pricing';

/** Longer than this and a link isn't worth following, so custom prices in it are ignored. */
const MAX_PRICES_LENGTH = 16_000;

const toBase64Url = (text: string): string => {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const fromBase64Url = (text: string): string => {
  const padded = text.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, '='));

  return new TextDecoder().decode(Uint8Array.from(binary, (character) => character.charCodeAt(0)));
};

/**
 * Writes the full configuration as `key=value` pairs for the URL's hash, which
 * never reaches a server. Prices go in only when they differ from the
 * defaults. Imported session data is never part of a link.
 */
export const encodeConfiguration = (state: CalculatorState, pricing: PricingTable): string => {
  const parameters = new URLSearchParams({
    from: state.fromModel,
    fromEffort: state.fromEffort,
    to: state.toModel,
    toEffort: state.toEffort,
    ttl: state.ttl,
    n: String(state.contextTokens),
    r: String(state.remainingOutput),
  });

  if (state.ratioOverride !== null) parameters.set('ratio', String(state.ratioOverride));
  if (isCustomPricing(pricing)) parameters.set('prices', toBase64Url(JSON.stringify(pricing)));

  return parameters.toString();
};

export type DecodedConfiguration = {
  state: CalculatorState;
  pricing: PricingTable;
};

const readCount = (text: string | null): number | null => {
  if (text === null || !/^\d+$/.test(text)) return null;

  const count = Number(text);

  return Number.isSafeInteger(count) && count <= MAX_TOKENS ? count : null;
};

/** Reads a link's hash back. Every field that isn't valid falls back to its default. */
export const decodeConfiguration = (hash: string): DecodedConfiguration | null => {
  const parameters = new URLSearchParams(hash.replace(/^#/, ''));
  if (!parameters.has('from') && !parameters.has('to') && !parameters.has('n')) return null;

  let pricing: PricingTable = defaultPricing;
  const encodedPrices = parameters.get('prices');
  if (encodedPrices && encodedPrices.length <= MAX_PRICES_LENGTH) {
    try {
      const parsed = parsePricingTable(JSON.parse(fromBase64Url(encodedPrices)));
      if (parsed.ok) pricing = parsed.table;
    } catch {
      // A damaged price table falls back to the defaults.
    }
  }

  const ttl = parameters.get('ttl');
  const ratioText = parameters.get('ratio');
  const ratio =
    ratioText !== null && /^\d+(?:\.\d+)?(?:e[+-]?\d+)?$/i.test(ratioText)
      ? Number(ratioText)
      : null;

  const state = normalizeState(
    {
      fromModel: parameters.get('from') ?? defaultState.fromModel,
      fromEffort: parameters.get('fromEffort') ?? defaultState.fromEffort,
      toModel: parameters.get('to') ?? defaultState.toModel,
      toEffort: parameters.get('toEffort') ?? defaultState.toEffort,
      ttl: ttl === '5m' || ttl === '1h' ? ttl : defaultState.ttl,
      contextTokens: readCount(parameters.get('n')) ?? defaultState.contextTokens,
      remainingOutput: readCount(parameters.get('r')) ?? defaultState.remainingOutput,
      ratioOverride: ratio !== null && Number.isFinite(ratio) && ratio <= MAX_RATIO ? ratio : null,
    },
    pricing,
  );

  return { state, pricing };
};
