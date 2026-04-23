import { describe, expect, it } from 'vitest';

import { normalizeRoutePath } from '@stevekinney/utilities/routes';

describe('normalizeRoutePath', () => {
  it('strips all trailing slashes except for the root path', () => {
    expect(normalizeRoutePath('/')).toBe('/');
    expect(normalizeRoutePath('/courses/testing/')).toBe('/courses/testing');
    expect(normalizeRoutePath('/courses/testing///')).toBe('/courses/testing');
  });
});
