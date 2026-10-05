import { describe, expect, it } from 'vitest';

import { evaluate } from './evaluate';
import { findPreset } from './presets';
import { summaryToMarkdown } from './summary';

describe('the Markdown summary', () => {
  it('has the verdict, the path, the controls by kind, and the residual risks', () => {
    const state = findPreset('careful')?.state();
    if (!state) throw new Error('careful');

    const markdown = summaryToMarkdown(state, evaluate(state));

    expect(markdown).toContain('Exploitable: all three legs are intact.');
    expect(markdown).toContain(
      'A stranger’s issue → agent context ← exported tokens in the environment → the shell network, through any HTTP client but curl.',
    );
    expect(markdown).toContain('### Structural\n\n- Bash(curl *) deny (partial)');
    expect(markdown).toContain('### Prompt-only and best-effort');
    expect(markdown).toContain('- Partial: Bash(curl *) deny blocks curl only.');
  });

  it('lists the human-gated exits for strict egress', () => {
    const state = findPreset('allowlist')?.state();
    if (!state) throw new Error('allowlist');
    state.allowlist = [];

    const markdown = summaryToMarkdown(state, evaluate(state));
    expect(markdown).toContain('Leg cut: a way out.');
    expect(markdown).toContain('- Human gate: A stranger’s issue');
  });
});
