import { describe, expect, it } from 'vitest';

import { formatRewrite, startRewrite } from './rewrite';

describe('the When / do / verify rewrite', () => {
  it('starts with the line as the action and blanks for the rest', () => {
    const parts = startRewrite('Maintain high quality code.');

    expect(parts).toEqual({ trigger: '', action: 'maintain high quality code', result: '' });
    expect(formatRewrite(parts)).toBe('When ____, maintain high quality code, then verify ____.');
  });

  it('keeps an acronym’s capital letter', () => {
    expect(startRewrite('CI must pass.').action).toBe('CI must pass');
  });

  it('fills in the template', () => {
    const parts = {
      trigger: 'editing invoice serialization',
      action: 'update the contract fixture',
      result: 'that `pnpm test:billing` passes.',
    };

    expect(formatRewrite(parts)).toBe(
      'When editing invoice serialization, update the contract fixture, then verify that `pnpm test:billing` passes.',
    );
  });
});
