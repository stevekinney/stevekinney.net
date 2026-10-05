import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { openExperiment } from './helpers/open-experiment';

// The fixtures are synthetic Claude Code sessions: one response logged twice
// with identical usage, a missing `timeout`, a quoted pathspec, a result whose
// call is in no file, a manual compaction from 312,693 to 12,969 tokens, a
// subagent transcript in a `subagents` folder, and a line cut off mid-write.
const fixtures = fileURLToPath(new URL('./fixtures/session-log-auditor/', import.meta.url));

const path = '/experiments/session-log-auditor';

const dropZone = (page: Page): Locator =>
  page.getByRole('group', { name: 'Drop session transcripts or whole folders here' });
const guess = (page: Page): Locator =>
  page.getByRole('slider', { name: /What share of your failed tool calls/ });
const clusterRows = (page: Page): Locator => page.getByTestId('cluster-row');
const clusterRow = (page: Page, signature: string): Locator =>
  clusterRows(page).filter({ has: page.getByRole('button', { name: signature, exact: true }) });

const horizontalOverflow = (page: Page): Promise<number> =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

const choosePreset = async (page: Page, name: string): Promise<void> => {
  await page.getByRole('button', { name, exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Predict first' })).toBeVisible();
};

const reveal = async (page: Page): Promise<void> => {
  await page.getByRole('button', { name: 'Reveal the measured share' }).click();
  await expect(page.getByRole('heading', { name: 'Overview', exact: true })).toBeVisible();
};

const chooseFolder = (page: Page): Promise<void> =>
  dropZone(page).locator('input[webkitdirectory]').setInputFiles(fixtures);

/** A JSON line for a failed Bash call, built here so no token-shaped string is committed. */
const pastedSession = (secret: string): string =>
  [
    {
      type: 'assistant',
      sessionId: 'pasted-session',
      timestamp: '2026-09-03T10:00:00.000Z',
      cwd: '/Users/someone/work/app',
      message: {
        id: 'msg_paste',
        model: 'claude-sonnet-5-5',
        content: [
          { type: 'tool_use', id: 'call_paste', name: 'Bash', input: { command: 'git push' } },
        ],
        usage: { input_tokens: 10, output_tokens: 20 },
      },
    },
    {
      type: 'user',
      sessionId: 'pasted-session',
      timestamp: '2026-09-03T10:00:02.000Z',
      message: {
        role: 'user',
        content: [
          {
            type: 'tool_result',
            tool_use_id: 'call_paste',
            is_error: true,
            content: `Exit code 128\nremote: rejected token ${secret}`,
          },
        ],
      },
    },
  ]
    .map((record) => JSON.stringify(record))
    .join('\n');

test.describe('before any sessions', () => {
  test('says the files stay on the machine and asks for transcripts', async ({ page }) => {
    await openExperiment(page, path);

    await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toHaveText(
      'What actually goes wrong in your agent sessions?',
    );
    await expect(page.getByText('Everything stays on your machine.')).toBeVisible();
    await expect(dropZone(page)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Predict first' })).toHaveCount(0);
  });
});

test.describe('predict first', () => {
  test('hides the breakdown until the guess is in, then shows it beside the measured share', async ({
    page,
  }) => {
    await openExperiment(page, path);
    await choosePreset(page, 'A floor that got fixed');

    await expect(page.getByTestId('preset-notice')).toContainText('Twenty-four made-up sessions');
    await expect(page.getByRole('heading', { name: 'Overview', exact: true })).toHaveCount(0);
    await expect(page.getByTestId('clusters-table')).toHaveCount(0);

    await guess(page).fill('20');
    await expect(page.getByTestId('guess-value')).toHaveText('20%');
    await reveal(page);

    const result = page.getByTestId('prediction-result');
    await expect(result).toContainText('Your guess');
    await expect(result).toContainText('20%');
    await expect(result).toContainText('Measured');
    await expect(result).toContainText(/failed\s+tool\s+calls came from the floor/);
    await expect(guess(page)).toBeDisabled();
    await expect(page.getByTestId('tile-floor')).toHaveText(/^\d+\.\d%$/);
  });
});

test.describe('the presets', () => {
  test('ranks a cluster in four sessions above a 200-retry storm in three', async ({ page }) => {
    await openExperiment(page, path);
    await choosePreset(page, 'One session, 200 retries');
    await reveal(page);

    const first = clusterRows(page).nth(0);
    const second = clusterRows(page).nth(1);
    await expect(first).toContainText('zsh: command not found: pnpm');
    await expect(first.getByRole('cell').nth(2)).toHaveText('4');
    await expect(second).toContainText('Error: connect ECONNREFUSED <n>:<n>');
    await expect(second.getByRole('cell').nth(2)).toHaveText('3');
    await expect(second.getByRole('cell').nth(3)).toHaveText('202');
  });

  test('flags a fix that slipped, and its control row raises a regression', async ({ page }) => {
    await openExperiment(page, path);
    await choosePreset(page, 'A fix that slipped');
    await reveal(page);

    const row = clusterRow(page, 'zsh: command not found: timeout');
    await expect(row).toContainText('Regression: back on 2026-09-10');

    await row.getByRole('button', { name: 'zsh: command not found: timeout' }).click();
    await page.getByLabel('Mark fixed on…').fill('2026-09-01');
    await page.getByRole('button', { name: 'Mark fixed' }).click();

    const control = page.getByTestId('control-row');
    await expect(control.getByTestId('control-status')).toHaveText('Regression');
    await expect(control).toContainText('It came back on 2026-09-10');
  });

  test('a fix that held shows its control row holding at 0, and the mark survives a reload', async ({
    page,
  }) => {
    await openExperiment(page, path);
    await choosePreset(page, 'A floor that got fixed');
    await reveal(page);

    await clusterRow(page, 'zsh: command not found: timeout')
      .getByRole('button', { name: 'zsh: command not found: timeout' })
      .click();
    await page.getByLabel('Mark fixed on…').fill('2026-09-01');
    await page.getByRole('button', { name: 'Mark fixed' }).click();

    await expect(page.getByTestId('control-status')).toHaveText('holding at 0');
    await expect(page.getByTestId('control-row')).toContainText('0 after');

    await openExperiment(page, path);
    await choosePreset(page, 'A floor that got fixed');
    await reveal(page);
    await expect(page.getByTestId('control-status')).toHaveText('holding at 0');
  });
});

test.describe('your own sessions', () => {
  test('reads a dropped folder, subagents included, and counts it in code', async ({ page }) => {
    await openExperiment(page, path);
    await chooseFolder(page);

    await expect(dropZone(page)).toContainText(
      'Read 3 files, 2 sessions, skipped 1 malformed lines.',
    );
    await reveal(page);

    await expect(page.getByTestId('tile-sessions')).toHaveText('2');
    await expect(page.getByTestId('tile-turns')).toHaveText('4');
    await expect(page.getByTestId('tile-failures')).toHaveText('5');
    await expect(page.getByTestId('tile-floor')).toHaveText('60.0%');
    await expect(page.getByTestId('tile-compactions')).toHaveText('1');

    const timeout = clusterRow(page, 'zsh: command not found: timeout');
    await expect(clusterRows(page).first()).toContainText('zsh: command not found: timeout');
    await expect(timeout).toContainText('floor: missing tool');
    await timeout.getByRole('button', { name: 'zsh: command not found: timeout' }).click();

    const details = page.getByTestId('cluster-details');
    await expect(details.getByTestId('example-quote').first()).toHaveText(
      'zsh: command not found: timeout',
    );
    await expect(details).toContainText('aaaaaaaa-0000-4000-8000-000000000001.jsonl:3');
    await expect(details).toContainText('Exit code: 1');
    await details.getByText('Why might this be the floor?').click();
    await expect(details).toContainText('macOS doesn’t ship a timeout command.');

    await expect(clusterRow(page, 'Error: socket hang up').getByRole('cell').first()).toHaveText(
      'unknown',
    );
  });

  test('shows the compaction ratio and prices only what it can match', async ({ page }) => {
    await openExperiment(page, path);
    await chooseFolder(page);
    await reveal(page);

    await expect(page.getByTestId('compaction-median')).toContainText('4.1%');
    await expect(page.getByTestId('compactions-table')).toContainText('312,693');
    await expect(page.getByTestId('cost-by-model')).toContainText('claude-opus-5');
    await expect(page.getByTestId('cost-by-model').getByRole('row').last()).toContainText(
      'unpriced',
    );
    await expect(
      page.getByText(/1 turn\s+wrote to the cache without saying for how long/),
    ).toBeVisible();
  });

  test('narrows every panel with a filter', async ({ page }) => {
    await openExperiment(page, path);
    await chooseFolder(page);
    await reveal(page);

    await page.getByLabel('Git branch').selectOption('feature/search');
    await expect(page.getByTestId('tile-sessions')).toHaveText('1');
    await expect(page.getByTestId('tile-failures')).toHaveText('1');
    await expect(page.getByText('No compactions in these sessions.')).toBeVisible();

    await page.getByRole('button', { name: 'Clear every filter' }).click();
    await page.getByLabel('Search signatures and examples').fill('pathspec');
    await expect(clusterRows(page)).toHaveCount(1);
  });

  test('masks a GitHub token from a pasted transcript in the digest preview', async ({ page }) => {
    const secret = `ghp_${'Zx9'.repeat(12)}`;

    await openExperiment(page, path);
    await page.getByText('Paste a transcript instead').click();
    await page.getByLabel('Transcript lines (JSON Lines)').fill(pastedSession(secret));
    await page.getByRole('button', { name: 'Audit the pasted lines' }).click();
    await reveal(page);

    const preview = page.getByTestId('digest-preview');
    await expect(preview).toContainText('[redacted ghp_]');
    await expect(preview).not.toContainText(secret);
    await expect(page.getByTestId('redaction-findings')).toContainText('GitHub token');

    await page
      .getByRole('group', { name: 'Preview format' })
      .getByRole('button', { name: 'JSON' })
      .click();
    await expect(preview).toContainText('"failedToolCalls": 1');
    await expect(preview).not.toContainText(secret);

    await page.getByTestId('redaction-toggle').uncheck();
    await expect(preview).toContainText(secret);
  });

  test('cancels a large read', async ({ page }, testInfo) => {
    await openExperiment(page, path);

    // Each line is a response the reader has to parse and keep, so reading takes a while.
    const lines = Array.from({ length: 160_000 }, (_, index) =>
      JSON.stringify({
        type: 'assistant',
        sessionId: 'big',
        timestamp: '2026-09-01T00:00:00.000Z',
        message: {
          id: `msg_${index}`,
          model: 'claude-opus-5-5',
          content: [{ type: 'text', text: 'x'.repeat(120) }],
          usage: { input_tokens: 1, output_tokens: 1 },
        },
      }),
    );
    const big = testInfo.outputPath('big.jsonl');
    writeFileSync(big, `${lines.join('\n')}\n`);
    await dropZone(page).locator('input[type="file"]:not([webkitdirectory])').setInputFiles(big);

    await expect(page.getByTestId('read-progress')).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(dropZone(page)).toContainText('Cancelled. Nothing new was loaded.');
    await expect(page.getByRole('heading', { name: 'Predict first' })).toHaveCount(0);
  });

  test('copies a Markdown summary', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await openExperiment(page, path);
    await chooseFolder(page);
    await reveal(page);

    await page.getByRole('button', { name: 'Copy summary' }).click();
    await expect(page.getByText('Copied the summary as Markdown.')).toBeVisible();

    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toContain('## Session log audit');
    expect(copied).toContain('- Failed tool calls: 5 of 5 (100.0%)');
    expect(copied).toContain(
      '| zsh: command not found: timeout | Bash | floor: missing tool | 2 | 2 |',
    );
  });
});

test.describe('at phone width', () => {
  for (const colorScheme of ['light', 'dark'] as const) {
    test(`never scrolls sideways with every panel open in ${colorScheme} mode`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 360, height: 800 });
      await page.emulateMedia({ colorScheme });
      await openExperiment(page, path);
      await choosePreset(page, 'A floor that got fixed');
      await reveal(page);

      await clusterRows(page).first().getByRole('button').first().click();
      await page.getByRole('button', { name: 'Mark fixed' }).click();
      await expect(page.getByTestId('control-row')).toBeVisible();
      await expect(page.getByTestId('cost-histogram')).toBeVisible();
      await expect(page.getByTestId('digest-preview')).toBeVisible();
      await expect(page.getByTestId('prices-table')).toBeVisible();

      // Hover each chart near its right edge, where a tooltip is likeliest to spill.
      for (const id of ['timeline-chart', 'control-chart', 'cost-histogram', 'cache-chart']) {
        const chart = page.getByTestId(id);
        await chart.scrollIntoViewIfNeeded();
        const bounds = (await chart.boundingBox())!;
        await page.mouse.move(bounds.x + bounds.width - 4, bounds.y + bounds.height / 2);

        const tooltip = page.getByTestId(`${id}-tooltip`);
        await expect(tooltip).toBeVisible();
        const box = (await tooltip.boundingBox())!;
        expect(box.x, id).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width, id).toBeLessThanOrEqual(360);
        expect(await horizontalOverflow(page)).toBe(0);
      }

      // And with the keyboard.
      const timeline = page.getByTestId('timeline-chart');
      await timeline.focus();
      await page.keyboard.press('End');
      const tooltip = page.getByTestId('timeline-chart-tooltip');
      await expect(tooltip).toBeVisible();
      const box = (await tooltip.boundingBox())!;
      expect(box.x + box.width).toBeLessThanOrEqual(360);

      expect(await horizontalOverflow(page)).toBe(0);
    });
  }

  test('wraps long tool names, directories, branches, and models from a transcript', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await openExperiment(page, path);

    const long = 'x'.repeat(150);
    const session = `session-${long}`;
    const transcript = [
      {
        type: 'assistant',
        sessionId: session,
        timestamp: '2026-09-03T10:00:00.000Z',
        cwd: `/work/${long}`,
        gitBranch: `feature/${long}`,
        version: `3.1.2-${long}`,
        message: {
          id: 'msg_long',
          model: `claude-opus-5-5-${long}`,
          content: [{ type: 'tool_use', id: 'call_long', name: `Tool${long}`, input: {} }],
          usage: { input_tokens: 10, output_tokens: 20 },
        },
      },
      {
        type: 'user',
        sessionId: session,
        timestamp: '2026-09-03T10:00:01.000Z',
        message: {
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: 'call_long',
              is_error: true,
              content: `Exit code 2\nerror:${long}${long}`,
            },
          ],
        },
      },
    ]
      .map((record) => JSON.stringify(record))
      .join('\n');

    await page.getByText('Paste a transcript instead').click();
    await page.getByLabel('Transcript lines (JSON Lines)').fill(transcript);
    await page.getByRole('button', { name: 'Audit the pasted lines' }).click();
    await reveal(page);

    await clusterRows(page).first().getByRole('button').first().click();
    await page.getByRole('button', { name: 'Mark fixed' }).click();
    await expect(page.getByTestId('control-row')).toBeVisible();

    expect(await horizontalOverflow(page)).toBe(0);
  });
});

test.describe('keyboard focus', () => {
  test('moves focus to the measured share after a reveal', async ({ page }) => {
    await openExperiment(page, path);
    await choosePreset(page, 'A floor that got fixed');
    await reveal(page);
    await expect(
      page.getByRole('group', { name: 'Your guess and the measured share' }),
    ).toBeFocused();
    await expect(page.getByTestId('clusters-table')).toBeVisible();
    await expect(page.locator('[aria-label="Top clusters table"]')).toHaveAttribute(
      'tabindex',
      '0',
    );
  });
});
