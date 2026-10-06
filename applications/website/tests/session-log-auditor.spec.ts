import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { openExperiment } from './helpers/open-experiment';

// The fixtures are synthetic Claude Code sessions: one response logged twice
// with identical usage, a missing `timeout`, a quoted pathspec, a result whose
// call is in no file, a subagent transcript in a `subagents` folder, and a
// line cut off mid-write.
const fixtures = fileURLToPath(new URL('./fixtures/session-log-auditor/', import.meta.url));

const path = '/experiments/session-log-auditor';

const dropZone = (page: Page): Locator =>
  page.getByRole('group', { name: 'Drop your session transcripts or whole folders here' });
const clusterRows = (page: Page): Locator => page.getByTestId('cluster-row');
const clusterRow = (page: Page, signature: string): Locator =>
  clusterRows(page).filter({ has: page.getByRole('button', { name: signature, exact: true }) });

const horizontalOverflow = (page: Page): Promise<number> =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

const chooseFolder = (page: Page): Promise<void> =>
  dropZone(page).locator('input[webkitdirectory]').setInputFiles(fixtures);

const chooseFile = (page: Page, file: string | { name: string; buffer: Buffer }): Promise<void> =>
  dropZone(page)
    .locator('input[type="file"]:not([webkitdirectory])')
    .setInputFiles(
      typeof file === 'string'
        ? file
        : { name: file.name, mimeType: 'application/x-ndjson', buffer: file.buffer },
    );

test.describe('on load', () => {
  test('answers the question from the sample before anything is dropped', async ({ page }) => {
    await openExperiment(page, path);

    await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toHaveText(
      'Is it the model, or your machine?',
    );
    await expect(page.getByTestId('sample-label')).toHaveText('Sample data');
    await expect(page.getByTestId('floor-share')).toHaveText('55%');
    await expect(page.getByTestId('sample-notice')).toContainText('Twenty-four made-up sessions');
    await expect(page.getByText('Everything stays on your machine.')).toBeVisible();

    await expect(clusterRows(page)).toHaveCount(9);
    await expect(page.getByTestId('timeline-chart')).toBeVisible();
    await expect(page.getByTestId('rules-list').getByRole('listitem')).toHaveCount(7);
    await expect(page.locator('[aria-label="Top clusters table"]')).toHaveAttribute(
      'tabindex',
      '0',
    );
  });

  test('badges each cluster and explains why the floor might be the floor', async ({ page }) => {
    await openExperiment(page, path);

    const timeout = clusterRow(page, 'zsh: command not found: timeout');
    await expect(timeout.getByTestId('verdict-badge')).toHaveText('floor');
    await expect(timeout).toContainText('A command the agent expected isn’t there');
    await expect(
      clusterRow(page, 'FAIL src/cart.test.ts > applies the discount').getByTestId('verdict-badge'),
    ).toHaveText('task');

    await timeout.getByRole('button', { name: 'zsh: command not found: timeout' }).click();
    await expect(page.getByTestId('floor-explainer')).toContainText(
      'macOS doesn’t ship a timeout command.',
    );
  });
});

test.describe('your own sessions', () => {
  test('reads a dropped folder, subagents included, and swaps out the sample', async ({ page }) => {
    await openExperiment(page, path);
    await chooseFolder(page);

    await expect(dropZone(page)).toContainText(
      'Read 3 files, 2 sessions, skipped 1 malformed line.',
    );
    await expect(page.getByTestId('sample-label')).toHaveCount(0);
    await expect(page.getByTestId('floor-share')).toHaveText('60%');
    await expect(page.getByTestId('verdict')).toContainText('3 failed tool calls out of 5');

    const timeout = clusterRow(page, 'zsh: command not found: timeout');
    await expect(clusterRows(page).first()).toContainText('zsh: command not found: timeout');
    await expect(timeout.getByTestId('verdict-badge')).toHaveText('floor');
    await timeout.getByRole('button', { name: 'zsh: command not found: timeout' }).click();

    const details = page.getByTestId('cluster-details');
    await expect(details.getByTestId('example-quote').first()).toHaveText(
      'zsh: command not found: timeout',
    );
    await expect(details).toContainText('aaaaaaaa-0000-4000-8000-000000000001.jsonl:3');
    await expect(details).toContainText('Exit code: 1');

    await page.getByRole('button', { name: 'Show the sample again' }).click();
    await expect(page.getByTestId('floor-share')).toHaveText('55%');
  });

  test('cancels a large read and keeps what was there', async ({ page }, testInfo) => {
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
    await chooseFile(page, big);

    await expect(page.getByTestId('read-progress')).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(dropZone(page)).toContainText('Cancelled. Nothing new was loaded.');
    await expect(page.getByTestId('sample-label')).toBeVisible();
  });
});

test.describe('at phone width', () => {
  for (const colorScheme of ['light', 'dark'] as const) {
    test(`never scrolls sideways, chart tooltip included, in ${colorScheme} mode`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 360, height: 800 });
      await page.emulateMedia({ colorScheme });
      await openExperiment(page, path);

      await clusterRows(page).first().getByRole('button').first().click();
      await expect(page.getByTestId('cluster-details')).toBeVisible();

      // Hover the chart near its right edge, where a tooltip is likeliest to spill.
      const chart = page.getByTestId('timeline-chart');
      await chart.scrollIntoViewIfNeeded();
      const bounds = (await chart.boundingBox())!;
      await page.mouse.move(bounds.x + bounds.width - 4, bounds.y + bounds.height / 2);

      const tooltip = page.getByTestId('timeline-chart-tooltip');
      await expect(tooltip).toBeVisible();
      let box = (await tooltip.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(360);

      // And with the keyboard.
      await chart.focus();
      await page.keyboard.press('End');
      await expect(tooltip).toBeVisible();
      box = (await tooltip.boundingBox())!;
      expect(box.x + box.width).toBeLessThanOrEqual(360);

      expect(await horizontalOverflow(page)).toBe(0);
    });
  }

  test('wraps a long tool name and error from a transcript', async ({ page }) => {
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

    await chooseFile(page, { name: `${long}.jsonl`, buffer: Buffer.from(transcript) });
    await expect(page.getByTestId('sample-label')).toHaveCount(0);

    await clusterRows(page).first().getByRole('button').first().click();
    await expect(page.getByTestId('cluster-details')).toBeVisible();

    expect(await horizontalOverflow(page)).toBe(0);
  });
});
