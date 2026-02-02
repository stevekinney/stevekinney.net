import { describe, expect, it } from 'vitest';
import { buildOpenGraphHash } from './hash';

describe('buildOpenGraphHash', () => {
  it('returns a stable hash for the same input', () => {
    const input = {
      title: 'Hello World',
      description: 'Testing OG hash',
      accentColor: '#ff0000',
      secondaryAccentColor: '#00ff00',
      textColor: '#000000',
      backgroundColor: '#ffffff',
      hideFooter: false,
    };

    const first = buildOpenGraphHash(input);
    const second = buildOpenGraphHash(input);

    expect(first).toBe(second);
  });

  it('changes when inputs change', () => {
    const base = {
      title: 'Hello World',
      description: 'Testing OG hash',
    };

    const first = buildOpenGraphHash(base);
    const second = buildOpenGraphHash({ ...base, description: 'Updated description' });

    expect(first).not.toBe(second);
  });
});
