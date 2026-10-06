import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { fileURLToPath } from 'node:url';

import { openExperiment } from './helpers/open-experiment';

// The fixtures are synthetic Claude Code sessions: a streamed response, a
// subagent response, a placeholder response, one manual compaction from
// 312,693 to 12,969 tokens, and a line cut off mid-write.
const fixture = (name: string): string =>
  fileURLToPath(new URL(`./fixtures/compact-or-clear/${name}`, import.meta.url));

const path = '/experiments/compact-or-clear';

const DEFAULT_VERDICT =
  'Over the next 30 turns, compact now: it comes to $4.46, against $5.89 to keep going and $6.05 to switch to Claude Sonnet 5.5.';

const calibrationZone = (page: Page): Locator =>
  page.getByRole('group', { name: 'Calibrate from my session' });

const open = async (page: Page): Promise<void> => {
  await openExperiment(page, path);
  // The session reader loads once the page is interactive.
  await expect(calibrationZone(page)).toBeVisible();
};

const openAssumptions = async (page: Page): Promise<void> => {
  const assumptions = page.locator('details').filter({ hasText: 'Assumptions' }).first();
  if ((await assumptions.getAttribute('open')) === null) {
    await assumptions.locator('summary').first().click();
  }
};

const field = (page: Page, id: string): Locator => page.locator(`#${id}`);
const chart = (page: Page): Locator => page.getByTestId('spend-chart');
const verdict = (page: Page): Locator => page.getByTestId('verdict');
const summary = (page: Page): Locator => page.getByTestId('calibration-summary');
const modelNow = (page: Page): Locator => page.locator('#model');
const switchTo = (page: Page): Locator => page.locator('#switch-model');

const chooseSession = (page: Page, name: string): Promise<void> =>
  calibrationZone(page).locator('input[type="file"]').first().setInputFiles(fixture(name));

/** A session whose last turn was `minutesAgo` minutes ago. */
const recentSession = (minutesAgo: number) => {
  const timestamp = new Date(Date.now() - minutesAgo * 60_000).toISOString();
  const line = (id: string, usage: Record<string, number>) =>
    JSON.stringify({
      type: 'assistant',
      sessionId: 'recent',
      timestamp,
      message: { id, model: 'claude-opus-5-5', role: 'assistant', usage },
    });

  return {
    name: 'recent.jsonl',
    mimeType: 'application/x-ndjson',
    buffer: Buffer.from(
      `${line('r1', { input_tokens: 0, output_tokens: 100, cache_read_input_tokens: 0, cache_creation_input_tokens: 40_000 })}\n${line('r2', { input_tokens: 0, output_tokens: 300, cache_read_input_tokens: 40_000, cache_creation_input_tokens: 5_000 })}\n`,
    ),
  };
};

const horizontalOverflow = (page: Page): Promise<number> =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test.describe('the answer', () => {
  test('shows the rule of thumb and the verdict before anything is touched', async ({ page }) => {
    await open(page);

    await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toHaveText(
      'Keep going, compact, or switch models?',
    );

    const row = page
      .getByTestId('rule-of-thumb')
      .getByRole('row')
      .filter({ has: page.getByRole('rowheader', { name: '400K', exact: true }) });
    await expect(row.getByRole('cell')).toHaveText(['11 turns', 'Right away', '34 turns']);

    await expect(verdict(page)).toHaveText(DEFAULT_VERDICT);
    await expect(page.getByTestId('paybacks')).toHaveText(
      'Compacting costs $0.76 up front and pays for itself after 11 turns. Switching to Claude Sonnet 5.5 costs $1.60 up front and pays for itself after 34 turns, more than the 30 you have left.',
    );
  });

  test('shows five inputs and keeps the rest under Assumptions', async ({ page }) => {
    await open(page);

    await expect(page.getByRole('slider', { name: 'Context now', exact: true })).toBeVisible();
    await expect(page.getByRole('slider', { name: 'Turns ahead', exact: true })).toBeVisible();
    await expect(page.locator('#cache-warm')).toBeVisible();
    await expect(modelNow(page)).toHaveValue('claude-opus-5-5');
    await expect(switchTo(page)).toHaveValue('claude-sonnet-5-5');
    await expect(page.getByRole('slider', { name: 'Summary size', exact: true })).toBeHidden();

    await openAssumptions(page);
    await expect(page.getByRole('slider', { name: 'Summary size', exact: true })).toBeVisible();
  });

  test('without JavaScript', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto(path);

    await expect(verdict(page)).toHaveText(DEFAULT_VERDICT);
    await expect(page.getByTestId('rule-of-thumb')).toBeVisible();
    await context.close();
  });
});

test.describe('the scenario', () => {
  test('draws three lines and marks where each move pays for itself', async ({ page }) => {
    await open(page);
    await field(page, 'turns-ahead').fill('60');

    await expect(page.getByText('Keep going', { exact: true })).toBeVisible();
    await expect(page.getByText('Compact now', { exact: true })).toBeVisible();
    await expect(page.getByText('Switch model (dashed)', { exact: true })).toBeVisible();
    await expect(chart(page).locator('svg text', { hasText: /^turn 11$/ })).toHaveCount(1);
    await expect(chart(page).locator('svg text', { hasText: /^turn 34$/ })).toHaveCount(1);
    await expect(verdict(page)).toContainText('Over the next 60 turns');
  });

  test('pays back both moves on the first turn once the cache has expired', async ({ page }) => {
    await open(page);
    await page.locator('#cache-cold').click();

    await expect(page.getByTestId('paybacks')).toContainText(
      'Compacting costs $2.28 up front and pays for itself after 1 turn.',
    );
    await expect(page.getByTestId('paybacks')).toContainText(
      'costs $1.60 up front and pays for itself after 1 turn.',
    );
  });

  test('never offers to switch to the model you are already on', async ({ page }) => {
    await open(page);
    await modelNow(page).selectOption('claude-sonnet-5-5');

    await expect(switchTo(page).locator('option[value="claude-sonnet-5-5"]')).toHaveCount(0);
    await expect(switchTo(page)).toHaveValue('claude-haiku-4-5');
    await expect(verdict(page)).toContainText('Claude Haiku 4.5');
  });

  test('reads a turn from the chart with the keyboard', async ({ page }) => {
    await open(page);

    await chart(page).focus();
    await expect(page.getByTestId('chart-tooltip')).toContainText('Turn 0 (up front only)');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');

    const tooltip = page.getByTestId('chart-tooltip');
    await expect(tooltip).toContainText('Turn 2');
    await expect(tooltip).toContainText('Switch model');
    await expect(chart(page)).toHaveAttribute('aria-valuetext', /^Turn 2: Keep going \$0\.\d\d/);
  });
});

test.describe('starting from a session', () => {
  test('fills in the fields from the transcript and says which came from it', async ({ page }) => {
    await open(page);
    await modelNow(page).selectOption('claude-haiku-4-5');
    await chooseSession(page, 'session.jsonl');

    await expect(summary(page)).toContainText('1 file, 4 turns across 1 session');
    await expect(summary(page)).toContainText('is Claude Opus 5.5');
    await expect(field(page, 'context-now')).toHaveValue('17.4K');
    await expect(modelNow(page)).toHaveValue('claude-opus-5-5');
    await expect(page.locator('label[for="context-now"]')).toContainText('from your session');
    await expect(page.locator('label[for="model"]')).toContainText('from your session');

    await openAssumptions(page);
    await expect(field(page, 'summary-size')).toHaveValue('713 (4.1%)');
  });

  test('calls an old session expired, then lets the person override it', async ({ page }) => {
    await open(page);
    await chooseSession(page, 'session.jsonl');

    await expect(summary(page)).toContainText(
      /Your last turn was \d+d( \d+h)? ago, longer than the 1-hour TTL, so the cache is cold\./,
    );
    await expect(page.locator('#cache-cold')).toHaveAttribute('aria-pressed', 'true');

    await page.locator('#cache-warm').click();
    await expect(page.locator('#cache-warm')).toHaveAttribute('aria-pressed', 'true');
    await expect(summary(page)).toContainText('You’ve since set the cache yourself');
  });

  test('calls a recent session warm, and cold against a five-minute lifetime', async ({ page }) => {
    await open(page);
    await calibrationZone(page)
      .locator('input[type="file"]')
      .first()
      .setInputFiles(recentSession(12));

    await expect(summary(page)).toContainText(/within the 1-hour TTL, so the cache is warm\./);
    await expect(page.locator('#cache-warm')).toHaveAttribute('aria-pressed', 'true');

    await openAssumptions(page);
    await page.locator('#ttl-5m').click();
    await expect(summary(page)).toContainText(
      'longer than the 5-minute TTL, so the cache is cold.',
    );
    await expect(page.locator('#cache-cold')).toHaveAttribute('aria-pressed', 'true');
  });

  test('names a model it can’t price and leaves the selection alone', async ({ page }) => {
    await open(page);
    await modelNow(page).selectOption('claude-haiku-4-5');
    await chooseSession(page, 'session-unknown-model.jsonl');

    await expect(summary(page)).toContainText('claude-opus-5-1');
    await expect(summary(page)).toContainText('isn’t one of the Claude models priced here');
    await expect(modelNow(page)).toHaveValue('claude-haiku-4-5');
  });

  test('discards the import and restores the fields', async ({ page }) => {
    await open(page);
    await chooseSession(page, 'session.jsonl');
    await expect(summary(page)).toBeVisible();

    await page.getByRole('button', { name: 'Discard import' }).click();

    await expect(summary(page)).toHaveCount(0);
    await expect(field(page, 'context-now')).toHaveValue('400K');
    await expect(page.locator('#cache-warm')).toHaveAttribute('aria-pressed', 'true');
    await expect(verdict(page)).toHaveText(DEFAULT_VERDICT);
  });

  test('says when a file has only subagent responses, or isn’t a session at all', async ({
    page,
  }) => {
    await open(page);

    await chooseSession(page, 'session-subagent-only.jsonl');
    await expect(page.getByRole('alert').filter({ hasText: 'subagent' })).toBeVisible();

    await chooseSession(page, 'not-a-session.jsonl');
    await expect(
      page
        .getByRole('alert')
        .filter({ hasText: 'None of those files looked like a Claude Code session' }),
    ).toBeVisible();
    await expect(field(page, 'context-now')).toHaveValue('400K');
  });
});

for (const colorScheme of ['light', 'dark'] as const) {
  test(`never scrolls sideways at 360 pixels wide in ${colorScheme} mode`, async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.emulateMedia({ colorScheme });
    await open(page);

    await chooseSession(page, 'session-unknown-model.jsonl');
    await expect(summary(page)).toBeVisible();
    await openAssumptions(page);
    await chart(page).focus();
    await page.keyboard.press('End');

    expect(await horizontalOverflow(page)).toBe(0);

    // The line labels at the ends of the chart stay inside the page.
    const labels = await chart(page)
      .locator('svg text')
      .evaluateAll((nodes) =>
        nodes.map((node) => ({
          text: node.textContent?.trim(),
          right: node.getBoundingClientRect().right,
        })),
      );
    for (const label of labels) {
      expect(label.right, label.text).toBeLessThanOrEqual(360);
    }
  });
}
