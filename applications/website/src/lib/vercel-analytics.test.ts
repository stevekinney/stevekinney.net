import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';

import VercelAnalytics from '$lib/components/vercel-analytics.svelte';

describe('Vercel analytics', () => {
  it.each([true, false])('renders first-party scripts when enabled is %s', (enabled) => {
    const { head } = render(VercelAnalytics, { props: { enabled } });

    if (enabled) {
      expect(head).toContain('/_vercel/insights/script.js');
      expect(head).toContain('/_vercel/speed-insights/script.js');
    } else {
      expect(head).not.toContain('/_vercel/insights/script.js');
      expect(head).not.toContain('/_vercel/speed-insights/script.js');
    }
  });

  it('omits first-party scripts by default in a local build', () => {
    const { head } = render(VercelAnalytics);

    expect(head).not.toContain('/_vercel/insights/script.js');
    expect(head).not.toContain('/_vercel/speed-insights/script.js');
  });
});
