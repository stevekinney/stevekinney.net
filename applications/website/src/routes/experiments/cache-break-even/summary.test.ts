import { describe, expect, it } from 'vitest';

import { evaluateState, defaultState } from './calculator-state';
import { defaultPricing } from './pricing';
import { buildSummary } from './summary';

describe('buildSummary', () => {
  const summary = buildSummary(evaluateState(defaultState, defaultPricing), false);

  it('lists the configuration, the three figures, and the verdict', () => {
    expect(summary).toContain('- From: Opus 5 at high effort');
    expect(summary).toContain('- To: Sonnet 5 at high effort');
    expect(summary).toContain('- Cache TTL: 1-hour');
    expect(summary).toContain('- Cost to make the change: $2.00');
    expect(summary).toContain('- Value of remaining work: +$2.25');
    expect(summary).toContain('- Net: +$0.25 (ahead)');
    expect(summary).toContain('**Sonnet 5** already pays for itself, by **$0.25**');
  });

  it('mentions custom prices only when they are custom', () => {
    expect(summary).not.toContain('custom');
    expect(buildSummary(evaluateState(defaultState, defaultPricing), true)).toContain('custom');
  });
});
