import { describe, expect, it } from 'vitest';

import {
  MAXIMUM_CUSTOM_CARDS,
  MAXIMUM_SCENARIO_LENGTH,
  mergeDecks,
  parseDeck,
  readAnswer,
  serializeDeck,
  toScenario,
} from './custom-scenarios';
import type { CustomCard } from './custom-scenarios';

const card: CustomCard = {
  scenario: 'Block pushes that skip the changelog',
  answer: 'ci',
  reasoning: 'It has to hold for everyone.',
};

describe('custom decks', () => {
  it('round-trips through JSON', () => {
    expect(parseDeck(serializeDeck([card]))).toEqual({ cards: [card], skipped: [] });
  });

  it('reads a bare array, and answers given by name', () => {
    expect(
      parseDeck(JSON.stringify([{ scenario: 'x', answer: 'Required CI check' }])).cards,
    ).toEqual([{ scenario: 'x', answer: 'ci', reasoning: '' }]);
    expect(readAnswer(' HOOK ')).toBe('hook');
    expect(readAnswer('a bash script')).toBeNull();
  });

  it('skips cards it can’t use, and says why', () => {
    const result = parseDeck(
      JSON.stringify({
        version: 1,
        scenarios: [card, { scenario: '', answer: 'ci' }, { scenario: 'y', answer: 'nope' }, 4],
      }),
    );

    expect(result.cards).toEqual([card]);
    expect(result.skipped).toEqual([
      'Card 2 has no scenario text.',
      'Card 3 names a mechanism this guide doesn’t know.',
      'Card 4 isn’t an object.',
    ]);
  });

  it('rejects text that isn’t a deck', () => {
    expect(parseDeck('not json').skipped).toEqual(['The file isn’t valid JSON.']);
    expect(parseDeck('{"cards": []}').skipped).toEqual(['The file has no list of scenarios.']);
  });

  it('bounds the number of cards and the length of each', () => {
    const many = Array.from({ length: MAXIMUM_CUSTOM_CARDS + 3 }, (_, index) => ({
      scenario: `Card ${index} ${'x'.repeat(MAXIMUM_SCENARIO_LENGTH)}`,
      answer: 'hook',
    }));
    const result = parseDeck(JSON.stringify(many));

    expect(result.cards).toHaveLength(MAXIMUM_CUSTOM_CARDS);
    expect(result.skipped).toHaveLength(3);
    expect(result.cards[0].scenario).toHaveLength(MAXIMUM_SCENARIO_LENGTH);
  });

  it('merges without duplicates', () => {
    expect(mergeDecks([card], [{ ...card, scenario: card.scenario.toUpperCase() }, card])).toEqual([
      card,
    ]);
  });

  it('turns a card into a scenario the game can deal', () => {
    expect(toScenario(card, 0)).toMatchObject({
      id: 'custom-1',
      text: card.scenario,
      answer: 'ci',
      custom: true,
      alternatives: [],
      tempting: null,
    });
    expect(toScenario({ ...card, reasoning: '' }, 1).reasoning).toBe(
      'You said this belongs in: Required CI check.',
    );
  });
});
