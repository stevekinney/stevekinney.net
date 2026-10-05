import { describe, expect, it } from 'vitest';

import { decodeSettings, defaultSettings, encodeSettings } from './share-link';
import type { LinkSettings } from './share-link';

describe('share links', () => {
  it('round-trips every setting', () => {
    const settings: LinkSettings = {
      preset: 'faster-more-rework',
      endpoint: 'rework',
      paired: false,
      seed: 12345,
      alpha: 0.01,
      power: 0.9,
      sigma: 12.5,
      delta: 3,
      felt: -12,
    };

    expect(decodeSettings(encodeSettings(settings))).toEqual({ ...settings, ownData: false });
  });

  it('marks the person’s own data without carrying any of it', () => {
    const encoded = encodeSettings({ ...defaultSettings, preset: null });

    expect(encoded).toContain('preset=own');
    expect(decodeSettings(encoded)).toMatchObject({ preset: null, ownData: true });
  });

  it('leaves the planner out while it follows the data', () => {
    expect(encodeSettings(defaultSettings)).not.toMatch(/sigma|delta|felt/);
  });

  it('falls back field by field when parts of a link are garbage', () => {
    expect(
      decodeSettings(
        '#preset=nope&endpoint=loc&seed=-4&alpha=0.2&power=2&sigma=1e9&delta=abc&felt=500',
      ),
    ).toEqual({ ...defaultSettings, ownData: false });
  });

  it('ignores a hash that isn’t settings', () => {
    expect(decodeSettings('')).toBeNull();
    expect(decodeSettings('#section')).toBeNull();
  });
});
