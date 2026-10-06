import { findMechanism, isMechanismId, mechanisms } from './mechanisms';
import type { MechanismId } from './mechanisms';
import type { Scenario } from './scenarios';

export const MAXIMUM_CUSTOM_CARDS = 100;
export const MAXIMUM_SCENARIO_LENGTH = 300;
export const MAXIMUM_REASONING_LENGTH = 600;
/** A deck can hold hundreds of thousands of entries, so reading stops a little past the card limit. */
export const MAXIMUM_EXAMINED_ENTRIES = MAXIMUM_CUSTOM_CARDS + 20;
/** Reasons kept one per entry. The rest are counted in a single closing line. */
export const MAXIMUM_DECK_DIAGNOSTICS = 20;

/** A card a learner wrote, as it's stored and shared. */
export type CustomCard = { scenario: string; answer: MechanismId; reasoning: string };

export type ImportResult = {
  cards: CustomCard[];
  /** Why entries were skipped: one line each for the first few, then a count of the rest. */
  skipped: string[];
  /** How many entries the file had, whether or not they were read. */
  total: number;
};

const clean = (text: string, limit: number): string =>
  text.replace(/\s+/g, ' ').trim().slice(0, limit);

/** Accepts a mechanism's ID or its name, such as `ci` or "Required CI check". */
export const readAnswer = (value: unknown): MechanismId | null => {
  if (typeof value !== 'string') return null;

  const normalized = value.trim().toLowerCase();
  if (isMechanismId(normalized)) return normalized;

  return mechanisms.find((mechanism) => mechanism.name.toLowerCase() === normalized)?.id ?? null;
};

/** Checks one card. Returns the card, or why it was skipped. */
export const readCard = (value: unknown, position: number): CustomCard | string => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return `Card ${position} isn’t an object.`;
  }

  const record = value as Record<string, unknown>;
  const scenario =
    typeof record.scenario === 'string' ? clean(record.scenario, MAXIMUM_SCENARIO_LENGTH) : '';
  if (scenario === '') return `Card ${position} has no scenario text.`;

  const answer = readAnswer(record.answer);
  if (!answer) return `Card ${position} names a mechanism this guide doesn’t know.`;

  const reasoning =
    typeof record.reasoning === 'string' ? clean(record.reasoning, MAXIMUM_REASONING_LENGTH) : '';

  return { scenario, answer, reasoning };
};

/** Reads a shared deck: `{ "version": 1, "scenarios": [...] }` or a bare array of cards. */
export const parseDeck = (json: string): ImportResult => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { cards: [], skipped: ['The file isn’t valid JSON.'], total: 0 };
  }

  const list = Array.isArray(parsed)
    ? parsed
    : typeof parsed === 'object' &&
        parsed !== null &&
        Array.isArray((parsed as { scenarios?: unknown }).scenarios)
      ? (parsed as { scenarios: unknown[] }).scenarios
      : null;
  if (!list) return { cards: [], skipped: ['The file has no list of scenarios.'], total: 0 };

  const cards: CustomCard[] = [];
  const skipped: string[] = [];
  let skippedCount = 0;
  const skip = (reason: string): void => {
    skippedCount += 1;
    if (skipped.length < MAXIMUM_DECK_DIAGNOSTICS) skipped.push(reason);
  };

  const examined = Math.min(list.length, MAXIMUM_EXAMINED_ENTRIES);
  for (let index = 0; index < examined; index += 1) {
    const card = readCard(list[index], index + 1);
    if (typeof card === 'string') skip(card);
    else if (cards.length < MAXIMUM_CUSTOM_CARDS) cards.push(card);
    else skip(`Card ${index + 1} is past the limit of ${MAXIMUM_CUSTOM_CARDS} cards.`);
  }
  skippedCount += list.length - examined;

  const unlisted = skippedCount - skipped.length;
  if (unlisted > 0) {
    skipped.push(
      unlisted === 1
        ? '…and 1 more entry was skipped.'
        : `…and ${unlisted.toLocaleString('en-US')} more entries were skipped.`,
    );
  }

  return { cards, skipped, total: list.length };
};

/** Adds imported cards to a deck, leaving out exact duplicates and anything past the limit. */
export const mergeDecks = (
  current: readonly CustomCard[],
  incoming: readonly CustomCard[],
): CustomCard[] => {
  const key = (card: CustomCard): string => `${card.scenario.toLowerCase()}\u0000${card.answer}`;
  const seen = new Set(current.map(key));
  const merged = [...current];

  for (const card of incoming) {
    if (merged.length >= MAXIMUM_CUSTOM_CARDS) break;
    if (seen.has(key(card))) continue;
    seen.add(key(card));
    merged.push(card);
  }

  return merged;
};

export const serializeDeck = (cards: readonly CustomCard[]): string =>
  `${JSON.stringify({ version: 1, scenarios: cards }, null, 2)}\n`;

/** Turns a custom card into a scenario the game can deal. */
export const toScenario = (card: CustomCard, index: number): Scenario => ({
  id: `custom-${index + 1}`,
  text: card.scenario,
  answer: card.answer,
  reasoning: card.reasoning || `You said this belongs in: ${findMechanism(card.answer).name}.`,
  alternatives: [],
  tempting: null,
  custom: true,
});
