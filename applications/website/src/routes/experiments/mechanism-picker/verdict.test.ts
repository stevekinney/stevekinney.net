import { describe, expect, it } from 'vitest';

import { lintInstructions } from './lint';
import { defaultRules } from './lint-rules';
import { breakdown, headline, rungNumber, verdictFor, verdictForFile } from './verdict';

const lint = (text: string) => lintInstructions(text, defaultRules);

const sample = [
  '- Maintain high quality code.',
  '- Never read .env files.',
  '- Run `pnpm test:billing` from `apps/api` after billing changes.',
  '- Format files with Prettier after every edit.',
  '- Current branch is feature/invoices-2.',
].join('\n');

describe('verdicts', () => {
  it('tags the must-hold and deterministic lines for enforcement, and the rest as asks', () => {
    const verdicts = lint(sample).map(verdictFor);

    expect(verdicts.map((verdict) => verdict.kind)).toEqual([
      'asks',
      'enforce',
      'asks',
      'enforce',
      'asks',
    ]);
    expect(verdicts[1]).toMatchObject({ kind: 'enforce', rung: { id: 'permission' } });
    expect(verdicts[3]).toMatchObject({ kind: 'enforce', rung: { id: 'hook' } });
  });

  it('sends a branch rule to CI and a production rule to the sandbox', () => {
    const [push, production] = lint(
      '- Do not push to main.\n- Never touch the production database.',
    );

    expect(verdictFor(push)).toMatchObject({ rung: { id: 'ci' } });
    expect(verdictFor(production)).toMatchObject({ rung: { id: 'sandbox' } });
  });

  it('numbers the rungs from the weakest', () => {
    expect(rungNumber('chat')).toBe(1);
    expect(rungNumber('permission')).toBe(5);
    expect(rungNumber('sandbox')).toBe(8);
  });
});

describe('the file verdict', () => {
  it('counts the sample’s two lines that should be enforced', () => {
    const verdict = verdictForFile(lint(sample));

    expect(headline(verdict)).toBe('2 of 5 lines ask for something that should be enforced.');
    expect(breakdown(verdict)).toBe('Move 1 to a permission rule and 1 to a hook.');
  });

  it('says so when nothing needs to refuse', () => {
    const verdict = verdictForFile(lint('- Run `bun test` after editing `src/`.'));

    expect(headline(verdict)).toBe(
      'Nothing here needs to refuse. The one line can stay a request.',
    );
    expect(breakdown(verdict)).toBeNull();
  });

  it('handles an empty file', () => {
    expect(headline(verdictForFile([]))).toBe('There’s nothing to check yet.');
  });
});
