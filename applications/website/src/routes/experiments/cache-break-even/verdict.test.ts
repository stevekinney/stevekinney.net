import { describe, expect, it } from 'vitest';

import { evaluateChange } from './calculate';
import type { ChangeInputs } from './calculate';
import { defaultPricing, findEffort, findModel } from './pricing';
import { describeChange, describeVerdict, segmentsToMarkdown, segmentsToText } from './verdict';

const model = (id: string) => findModel(defaultPricing, id)!;
const effort = (id: string) => findEffort(defaultPricing, id)!;

const defaults: ChangeInputs = {
  from: model('opus-5'),
  fromEffort: effort('high'),
  to: model('sonnet-5'),
  toEffort: effort('high'),
  ttl: '1h',
  contextTokens: 500_000,
  remainingOutput: 150_000,
  ratioOverride: null,
};

const verdict = (overrides: Partial<ChangeInputs>): string =>
  segmentsToText(describeVerdict(evaluateChange({ ...defaults, ...overrides })));

describe('describeChange', () => {
  it('names a model switch, an effort drop, an effort rise, and a move', () => {
    const phrase = (overrides: Partial<ChangeInputs>) =>
      segmentsToText(describeChange(evaluateChange({ ...defaults, ...overrides })));

    expect(phrase({})).toBe('Switching to Sonnet 5');
    expect(phrase({ to: model('opus-5'), toEffort: effort('medium') })).toBe(
      'Dropping Opus 5 from high to medium effort',
    );
    expect(phrase({ to: model('opus-5'), toEffort: effort('max') })).toBe(
      'Raising Opus 5 from high to max effort',
    );
    expect(phrase({ toEffort: effort('medium') })).toBe('Moving to Sonnet 5 at medium effort');
  });
});

describe('describeVerdict', () => {
  it('says so when nothing is changing', () => {
    expect(verdict({ to: model('opus-5') })).toMatch(/^Nothing’s changing\./);
  });

  it('says a change pays for itself and how long that stays true', () => {
    expect(verdict({})).toBe(
      'Switching to Sonnet 5 already pays for itself, by $0.25. That stays true as long as your context doesn’t grow past 563K tokens.',
    );
  });

  it('says how much more work a change needs when it is not there yet', () => {
    expect(verdict({ to: model('opus-5'), toEffort: effort('medium') })).toBe(
      'Not yet—at 500K tokens of context, dropping Opus 5 from high to medium effort needs at least 400K tokens of remaining output work to pay for itself, about 250K more than you have.',
    );
  });

  it('says a more expensive model never pays for itself', () => {
    const text = verdict({ from: model('sonnet-5'), to: model('opus-5') });

    expect(text).toContain('Switching to Opus 5 doesn’t reduce your per-token output cost—');
    expect(text).toContain('it raises it by $15.00 per MTok');
    expect(text).toContain('never pays for itself no matter how much work is left');
  });

  it('says a change that saves nothing leaves the cost unchanged', () => {
    expect(verdict({ to: model('opus-5'), ratioOverride: 1 })).toContain('it leaves it unchanged');
  });

  it('puts the numbers in bold in Markdown', () => {
    expect(segmentsToMarkdown(describeVerdict(evaluateChange(defaults)))).toContain(
      '**Sonnet 5** already pays for itself, by **$0.25**',
    );
  });
});
