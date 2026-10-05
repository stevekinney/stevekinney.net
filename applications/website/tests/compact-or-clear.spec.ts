import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { openExperiment } from './helpers/open-experiment';

// The fixtures are synthetic Claude Code sessions: a streamed response, a
// subagent response, a placeholder response, one manual compaction from
// 312,693 to 12,969 tokens, and a line cut off mid-write.
const fixture = (name: string): string =>
  fileURLToPath(new URL(`./fixtures/compact-or-clear/${name}`, import.meta.url));

const path = '/experiments/compact-or-clear';

const open = async (page: Page): Promise<void> => {
  await openExperiment(page, path);
  // The session reader and the file reader load once the page is interactive.
  await expect(calibrationZone(page)).toBeVisible();
  await expect(rereadZone(page)).toBeVisible();
};

const calibrationZone = (page: Page): Locator =>
  page.getByRole('group', { name: 'Calibrate from my session' });
const rereadZone = (page: Page): Locator => page.getByRole('group', { name: 'Size it from files' });

const field = (page: Page, id: string): Locator => page.locator(`#${id}`);
const leadTile = (page: Page): Locator => page.locator('#lead-tile');
const compactTile = (page: Page): Locator => page.locator('#compact-tile');
const clearTile = (page: Page): Locator => page.locator('#clear-tile');
const chart = (page: Page): Locator => page.getByTestId('spend-chart');
const projectionTable = (page: Page): Locator =>
  page.getByRole('region', { name: 'Projected spend table' });
const row = (page: Page, turn: number): Locator =>
  projectionTable(page)
    .getByRole('row')
    .filter({ has: page.getByRole('rowheader', { name: new RegExp(`^${turn}\\b`) }) });

const horizontalOverflow = (page: Page): Promise<number> =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

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
      message: { id, model: 'claude-opus-5', role: 'assistant', usage },
    });

  return {
    name: 'recent.jsonl',
    mimeType: 'application/x-ndjson',
    buffer: Buffer.from(
      `${line('r1', { input_tokens: 0, output_tokens: 100, cache_read_input_tokens: 0, cache_creation_input_tokens: 40_000 })}\n${line('r2', { input_tokens: 0, output_tokens: 300, cache_read_input_tokens: 40_000, cache_creation_input_tokens: 5_000 })}\n`,
    ),
  };
};

test.describe('the defaults', () => {
  test('answers the question with the specification’s numbers', async ({ page }) => {
    await open(page);

    await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toHaveText(
      'Compact or clear, and what it costs',
    );
    await expect(leadTile(page)).toHaveText('Compaction pays for itself after 6 turns');
    await expect(compactTile(page)).toHaveText('Compacting costs $1.05 up front, on a warm cache');
    await expect(clearTile(page)).toHaveText(
      'Clearing costs $0.40 up front, and loses everything you don’t re-read',
    );
    await expect(page.getByText('Clearing pays for itself after 3 turns.')).toBeVisible();
  });

  test('splits the compaction cost and names the largest slice', async ({ page }) => {
    await open(page);

    const breakdown = page.getByRole('img', { name: /up-front compaction cost/ });
    await expect(breakdown).toHaveAttribute('aria-label', /Generating the summary 48%/);
    await expect(page.getByText('Reading history to summarize it').first()).toBeVisible();
    await expect(page.getByText('$0.20', { exact: true })).toBeVisible();
    await expect(page.getByText('$0.50', { exact: true })).toBeVisible();
    await expect(page.getByText('$0.35', { exact: true })).toBeVisible();
    await expect(
      page.getByText('Generating the summary is the largest slice, 48% of the up-front cost.'),
    ).toBeVisible();
  });

  test('prints a share inside each segment of the bar that is 12% or more', async ({ page }) => {
    await open(page);

    const bar = page.getByRole('img', { name: /up-front compaction cost/ });
    await expect(bar).toContainText('19%');
    await expect(bar).toContainText('48%');
    await expect(bar).toContainText('33%');

    // Shrinking the summary makes the generate slice small enough to go unlabeled.
    await field(page, 'summary-size').fill('1%');
    await expect(bar).not.toContainText('48%');
    await expect(bar).toContainText('%');
  });

  test('totals $11.12, $6.70, and $6.12 after 30 turns, and names the best in words', async ({
    page,
  }) => {
    await open(page);

    const last = row(page, 30);
    await expect(last.getByRole('cell').nth(0)).toHaveText('$11.12');
    await expect(last.getByRole('cell').nth(1)).toHaveText('$6.70');
    await expect(last.getByRole('cell').nth(2)).toHaveText('$6.12');
    await expect(last.getByRole('cell').nth(3)).toHaveText('Clear now');
    await expect(row(page, 1).getByRole('cell').nth(3)).toHaveText('Keep going');
  });

  test('marks both crossovers on the chart', async ({ page }) => {
    await open(page);

    await expect(chart(page).locator('svg text', { hasText: /^turn 6$/ })).toHaveCount(1);
    await expect(chart(page).locator('svg text', { hasText: /^turn 3$/ })).toHaveCount(1);
    await expect(chart(page).locator('svg text', { hasText: 'Keep going $11.12' })).toHaveCount(1);
    await expect(chart(page).locator('svg text', { hasText: 'Compact now $6.70' })).toHaveCount(1);
    await expect(chart(page).locator('svg text', { hasText: 'Clear now $6.12' })).toHaveCount(1);
  });

  test('has a labeled control for every setting', async ({ page }) => {
    await open(page);

    for (const name of [
      'Context now',
      'Summary size',
      'Re-read after clear',
      'Input per turn',
      'Output per turn',
      'Turns ahead',
    ]) {
      await expect(page.getByRole('slider', { name, exact: true })).toBeVisible();
      await expect(page.getByRole('textbox', { name, exact: true })).toBeVisible();
    }

    await expect(page.getByRole('combobox', { name: 'Model' })).toHaveValue('opus-5');
    await expect(page.locator('#ttl-1h')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#cache-warm')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('option', { name: 'Opus 5 ($5/$25)' })).toHaveCount(1);
  });

  test('shows the summary as 20K (5%) without calling it invalid', async ({ page }) => {
    await open(page);

    await expect(field(page, 'summary-size')).toHaveValue('20K (5%)');
    await expect(field(page, 'summary-size')).not.toHaveAttribute('aria-invalid', 'true');
  });
});

test.describe('the scenario', () => {
  test('a cold cache turns the summarize step to $2.00 and payback to turn 16', async ({
    page,
  }) => {
    await open(page);
    await page.locator('#cache-cold').click();

    await expect(page.locator('#cache-cold')).toHaveAttribute('aria-pressed', 'true');
    await expect(compactTile(page)).toHaveText('Compacting costs $2.85 up front, on a cold cache');
    await expect(leadTile(page)).toHaveText('Compaction pays for itself after 16 turns');
    await expect(page.getByText('$2.00', { exact: true })).toBeVisible();
  });

  test('switching to Sonnet 5 scales every dollar by 0.4 and leaves the turns alone', async ({
    page,
  }) => {
    await open(page);
    await page.getByRole('combobox', { name: 'Model' }).selectOption('sonnet-5');

    await expect(compactTile(page)).toHaveText('Compacting costs $0.42 up front, on a warm cache');
    await expect(clearTile(page)).toContainText('Clearing costs $0.16 up front');
    await expect(leadTile(page)).toHaveText('Compaction pays for itself after 6 turns');
    await expect(page.getByText('Clearing pays for itself after 3 turns.')).toBeVisible();
    await expect(row(page, 30).getByRole('cell').nth(0)).toHaveText('$4.45');
  });

  test('accepts 400k, 1m, and 1,000,000 as token counts', async ({ page }) => {
    await open(page);
    const context = field(page, 'context-now');

    await context.fill('1m');
    await expect(context).not.toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByRole('slider', { name: 'Context now' })).toHaveValue('1000000');

    await context.fill('1,000,000');
    await expect(context).not.toHaveAttribute('aria-invalid', 'true');
    await context.blur();
    await expect(context).toHaveValue('1M');

    await context.fill('250k');
    await context.blur();
    await expect(context).toHaveValue('250K');
  });

  test('takes a percentage or a token count for the summary size', async ({ page }) => {
    await open(page);
    const summary = field(page, 'summary-size');

    await summary.fill('10%');
    await summary.blur();
    await expect(summary).toHaveValue('40K (10%)');

    await summary.fill('20k');
    await summary.blur();
    await expect(summary).toHaveValue('20K (5%)');

    await summary.fill('lots');
    await expect(summary).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByText('Enter a value such as 5, 5%, or 20k.')).toBeVisible();
  });

  test('lets the turn count run to 500 by typing, past the slider’s 120', async ({ page }) => {
    await open(page);
    await field(page, 'turns-ahead').fill('500');

    await expect(page.getByRole('slider', { name: 'Turns ahead' })).toHaveValue('120');
    await expect(row(page, 500).getByRole('cell').nth(0)).toBeVisible();
    await expect(chart(page)).toHaveAttribute('aria-valuemax', '500');
  });

  test('says why compacting can never pay when the summary is no smaller than the context', async ({
    page,
  }) => {
    await open(page);
    await field(page, 'context-now').fill('20k');
    await field(page, 'summary-size').fill('30%');

    await expect(leadTile(page)).toContainText('Compaction never pays for itself');
    await expect(page.getByText('no smaller than your 20K of context')).toBeVisible();
    await expect(chart(page).locator('svg text', { hasText: /^turn \d+$/ })).toHaveCount(0);
  });

  test('flags a summary larger than the re-read, and still projects it', async ({ page }) => {
    await open(page);
    await field(page, 'summary-size').fill('20%');

    await expect(
      page.getByText('A 80K summary is larger than the 25K you’d re-read after a clear.'),
    ).toBeVisible();
  });

  test('says nothing pays off within one turn and draws no marker at turn zero', async ({
    page,
  }) => {
    await open(page);
    await field(page, 'turns-ahead').fill('1');
    await expect(page.getByText('Not within 1 turn at this scenario.')).toBeVisible();
    await expect(chart(page).locator('svg text', { hasText: /^turn \d+$/ })).toHaveCount(0);
    await expect(row(page, 1)).toBeVisible();
  });

  test('charges only the baseline to clear when nothing is re-read', async ({ page }) => {
    await open(page);
    await field(page, 'reread-after-clear').fill('0');

    await expect(clearTile(page)).toContainText('Clearing costs $0.15 up front');
  });

  test('draws no marker at turn zero when clearing costs nothing up front', async ({ page }) => {
    await open(page);
    await page.getByText('Advanced').click();
    await field(page, 'baseline-prefix').fill('0');
    await field(page, 'reread-after-clear').fill('0');

    await expect(clearTile(page)).toContainText('Clearing costs $0.00 up front');
    await expect(page.getByText('Clearing is cheaper right away.')).toBeVisible();
    await expect(chart(page).locator('svg text', { hasText: /^turn 0$/ })).toHaveCount(0);
  });

  test('puts a five-minute TTL and a cold cache together without breaking', async ({ page }) => {
    await open(page);
    await page.locator('#ttl-5m').click();
    await page.locator('#cache-cold').click();

    await expect(compactTile(page)).toHaveText('Compacting costs $2.72 up front, on a cold cache');
    await expect(page.getByRole('region', { name: 'Projected spend table' })).toBeVisible();
  });
});

test.describe('compact later', () => {
  test('adds a line, a column, and a hero tile', async ({ page }) => {
    await open(page);
    await page.getByRole('checkbox', { name: 'Compare compacting later' }).check();

    await expect(page.getByRole('slider', { name: 'Compact after' })).toBeVisible();
    await expect(
      projectionTable(page).getByRole('columnheader', { name: 'Compact later' }),
    ).toBeVisible();
    await expect(page.locator('#later-tile')).toContainText('Compacting after 5 turns');
    await expect(page.locator('#later-tile')).toContainText('pays for itself after');
    await expect(chart(page).locator('svg polyline')).toHaveCount(4);

    await field(page, 'compact-after').fill('1');
    await expect(page.locator('#later-tile')).toContainText(/Compacting after 1\s+turn\b/);
    await expect(row(page, 30).getByRole('cell').nth(3)).not.toBeEmpty();
  });

  test('keeps k below the last turn', async ({ page }) => {
    await open(page);
    await page.getByRole('checkbox', { name: 'Compare compacting later' }).check();
    await field(page, 'turns-ahead').fill('6');

    await expect(page.getByRole('slider', { name: 'Compact after' })).toHaveAttribute('max', '5');
  });
});

test.describe('calibrating from a session', () => {
  test('fills in the fields from the transcript and says which came from it', async ({ page }) => {
    await open(page);
    await chooseSession(page, 'session-opus-5.jsonl');

    const summary = page.getByTestId('calibration-summary');
    await expect(summary).toBeVisible();

    // The latest main-thread turn's context, the median of output and of growth,
    // and the 4.1% median compaction ratio.
    await expect(field(page, 'context-now')).toHaveValue('17.4K');
    await expect(field(page, 'output-per-turn')).toHaveValue('390');
    await expect(field(page, 'input-per-turn')).toHaveValue('4.53K');
    await expect(field(page, 'summary-size')).toHaveValue('713 (4.1%)');
    await expect(page.locator('label[for="context-now"]')).toContainText('from your session');
    await expect(page.locator('label[for="summary-size"]')).toContainText('from your session');
    await expect(page.locator('label[for="model"]')).toContainText('from your session');
  });

  test('counts the streamed response once and leaves out the subagent and placeholder', async ({
    page,
  }) => {
    await open(page);
    await chooseSession(page, 'session-opus-5.jsonl');

    const summary = page.getByTestId('calibration-summary');
    await expect(summary).toContainText('1 file, 4 turns across 1 session');
    await expect(summary).toContainText('1 left out');
  });

  test('lists each compaction with its trigger and counts the line it could not read', async ({
    page,
  }) => {
    await open(page);
    await chooseSession(page, 'session-opus-5.jsonl');

    await expect(page.getByTestId('skipped-lines')).toHaveText('1');
    await page.getByText('1 compaction found (0 auto, 1 manual)').click();
    await expect(page.getByText('manual · 313K → 13K (4.1%).')).toBeVisible();
  });

  test('calls an old session cold and explains why, then lets the person override it', async ({
    page,
  }) => {
    await open(page);
    await chooseSession(page, 'session-opus-5.jsonl');

    const summary = page.getByTestId('calibration-summary');
    await expect(summary).toContainText(
      /Your last turn was \d+d( \d+h)? ago, longer than the 1-hour TTL, so the cache is cold\./,
    );
    await expect(page.locator('#cache-cold')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#cache-label')).toContainText('from your session');

    await page.locator('#cache-warm').click();
    await expect(page.locator('#cache-warm')).toHaveAttribute('aria-pressed', 'true');
    await expect(summary).toContainText('You’ve since set the cache yourself');
    await expect(page.locator('#cache-label')).not.toContainText('from your session');
  });

  test('calls a recent session warm', async ({ page }) => {
    await open(page);
    await calibrationZone(page)
      .locator('input[type="file"]')
      .first()
      .setInputFiles(recentSession(12));

    await expect(page.getByTestId('calibration-summary')).toContainText(
      /Your last turn was (11|12)m ago, within the 1-hour TTL, so the cache is warm\./,
    );
    await expect(page.locator('#cache-warm')).toHaveAttribute('aria-pressed', 'true');

    // The same turn is cold against a five-minute lifetime.
    await page.locator('#ttl-5m').click();
    await expect(page.getByTestId('calibration-summary')).toContainText(
      'longer than the 5-minute TTL, so the cache is cold.',
    );
    await expect(page.locator('#cache-cold')).toHaveAttribute('aria-pressed', 'true');
  });

  test('matches the model when it is in the price table', async ({ page }) => {
    await open(page);
    await page.getByRole('combobox', { name: 'Model' }).selectOption('haiku-4-5');
    await chooseSession(page, 'session-opus-5.jsonl');

    await expect(page.getByRole('combobox', { name: 'Model' })).toHaveValue('opus-5');
    await expect(page.getByTestId('calibration-summary')).toContainText('matches Opus 5');
  });

  test('names a model it can’t match, leaves the selection alone, and points to the price table', async ({
    page,
  }) => {
    await open(page);
    await page.getByRole('combobox', { name: 'Model' }).selectOption('sonnet-4-6');
    await chooseSession(page, 'session-opus-5-5.jsonl');

    const summary = page.getByTestId('calibration-summary');
    await expect(summary).toContainText('claude-opus-5-5');
    await expect(summary).toContainText('isn’t in the price table');
    await expect(page.getByRole('combobox', { name: 'Model' })).toHaveValue('sonnet-4-6');
    await expect(page.locator('label[for="model"]')).not.toContainText('from your session');

    await summary.getByRole('button', { name: 'Open the price table' }).click();
    await expect(page.getByTestId('price-table')).toHaveAttribute('open', '');
  });

  test('offers the first turn’s context as a baseline without applying it', async ({ page }) => {
    await open(page);
    await chooseSession(page, 'session-opus-5.jsonl');

    await page.getByText('Advanced').click();
    await expect(field(page, 'baseline-prefix')).toHaveValue('15K');
    await page.getByRole('button', { name: 'Use 30K from your session’s first turn' }).click();
    await expect(field(page, 'baseline-prefix')).toHaveValue('30K');
  });

  test('discards the import and restores the fields', async ({ page }) => {
    await open(page);
    await chooseSession(page, 'session-opus-5.jsonl');
    await expect(page.getByTestId('calibration-summary')).toBeVisible();

    await page.getByRole('button', { name: 'Discard import' }).click();

    await expect(page.getByTestId('calibration-summary')).toHaveCount(0);
    await expect(field(page, 'context-now')).toHaveValue('400K');
    await expect(field(page, 'summary-size')).toHaveValue('20K (5%)');
    await expect(field(page, 'output-per-turn')).toHaveValue('2K');
    await expect(page.locator('#cache-warm')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('label[for="context-now"]')).not.toContainText('from your session');
  });

  test('removes the mark from a field once the person edits it', async ({ page }) => {
    await open(page);
    await chooseSession(page, 'session-opus-5.jsonl');
    await expect(page.locator('label[for="context-now"]')).toContainText('from your session');

    await field(page, 'context-now').fill('500k');

    await expect(page.locator('label[for="context-now"]')).not.toContainText('from your session');
    await expect(page.locator('label[for="summary-size"]')).toContainText('from your session');
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
    await expect(page.getByTestId('calibration-summary')).toHaveCount(0);
    await expect(field(page, 'context-now')).toHaveValue('400K');
  });

  test('reads a session dropped on the zone and never leaves the page', async ({ page }) => {
    const requests: string[] = [];
    page.on('request', (request) => requests.push(request.url()));
    await open(page);
    const before = requests.length;

    const dataTransfer = await page.evaluateHandle(
      (contents) => {
        const transfer = new DataTransfer();
        transfer.items.add(new File([contents], 'dropped.jsonl'));

        return transfer;
      },
      readFileSync(fixture('session-opus-5.jsonl'), 'utf8'),
    );
    await calibrationZone(page).dispatchEvent('drop', { dataTransfer });

    await expect(page.getByTestId('calibration-summary')).toBeVisible();
    expect(new URL(page.url()).pathname).toBe(path);
    expect(requests.slice(before).filter((url) => !url.includes('127.0.0.1'))).toEqual([]);
    expect(requests.slice(before).filter((request) => request.includes('session'))).toEqual([]);
  });

  test('says at the drop zone that nothing leaves the browser', async ({ page }) => {
    await open(page);

    await expect(calibrationZone(page)).toContainText('nothing is sent anywhere');
    await expect(rereadZone(page)).toContainText('nothing is sent anywhere');
  });
});

test.describe('sizing the re-read from files', () => {
  const textFile = (name: string, characters: number) => ({
    name,
    mimeType: 'text/plain',
    buffer: Buffer.from('a'.repeat(characters)),
  });

  test('sets the re-read size from a 100,000-character file, and unchecking it sets zero', async ({
    page,
  }) => {
    await open(page);
    await rereadZone(page)
      .locator('input[type="file"]')
      .first()
      .setInputFiles(textFile('notes.md', 100_000));

    await expect(field(page, 'reread-after-clear')).toHaveValue('25K');
    await expect(page.getByTestId('reread-total')).toContainText(
      '1 of 1 file checked, an estimated 25K tokens',
    );
    await expect(page.getByText('notes.md')).toBeVisible();
    await expect(
      page
        .getByRole('region', { name: 'Files to re-read' })
        .getByText('25K tokens', { exact: true }),
    ).toBeVisible();

    await page.getByTestId('reread-list').getByRole('checkbox').uncheck();
    await expect(field(page, 'reread-after-clear')).toHaveValue('0');
    await expect(clearTile(page)).toContainText('Clearing costs $0.15 up front');
  });

  test('sums the checked files, and moving the slider unpins the estimate until it is pinned again', async ({
    page,
  }) => {
    await open(page);
    await rereadZone(page)
      .locator('input[type="file"]')
      .first()
      .setInputFiles([textFile('a.md', 40_000), textFile('b.md', 20_000)]);

    await expect(field(page, 'reread-after-clear')).toHaveValue('15K');
    const pin = page.getByRole('button', { name: 'Pin estimate' });
    await expect(pin).toHaveAttribute('aria-pressed', 'true');

    await page.getByRole('slider', { name: 'Re-read after clear' }).fill('100000');
    await expect(pin).toHaveAttribute('aria-pressed', 'false');
    await expect(field(page, 'reread-after-clear')).toHaveValue('100K');
    await expect(
      page.getByText('Not pinned: the re-read size is 100K, and the checked files come to 15K.'),
    ).toBeVisible();

    await pin.click();
    await expect(pin).toHaveAttribute('aria-pressed', 'true');
    await expect(field(page, 'reread-after-clear')).toHaveValue('15K');
  });

  test('re-estimates when characters per token changes', async ({ page }) => {
    await open(page);
    await rereadZone(page)
      .locator('input[type="file"]')
      .first()
      .setInputFiles(textFile('notes.md', 100_000));
    await expect(field(page, 'reread-after-clear')).toHaveValue('25K');

    await page.getByText('Advanced').click();
    await field(page, 'characters-per-token').fill('2');
    await expect(field(page, 'reread-after-clear')).toHaveValue('50K');
  });

  test('skips binary files and lists why', async ({ page }) => {
    await open(page);
    await rereadZone(page)
      .locator('input[type="file"]')
      .first()
      .setInputFiles([
        textFile('notes.md', 4_000),
        { name: 'logo.png', mimeType: 'image/png', buffer: Buffer.from([137, 80, 78, 71, 0, 1]) },
        {
          name: 'blob',
          mimeType: 'application/octet-stream',
          buffer: Buffer.from([104, 105, 0, 33]),
        },
      ]);

    await expect(page.getByText('2 skipped')).toBeVisible();
    await page.getByText('2 skipped').click();
    await expect(page.getByText('logo.png: a binary file')).toBeVisible();
    await expect(page.getByText('blob: a binary file')).toBeVisible();
    await expect(field(page, 'reread-after-clear')).toHaveValue('1K');
  });
});

test.describe('the chart and the table', () => {
  test('shows all three values for a turn on keyboard focus, and pins it with Enter', async ({
    page,
  }) => {
    await open(page);

    await chart(page).focus();
    await expect(page.getByTestId('chart-tooltip')).toContainText('Turn 0 (up front only)');

    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    const tooltip = page.getByTestId('chart-tooltip');
    await expect(tooltip).toContainText('Turn 3');
    await expect(tooltip).toContainText('Keep going');
    await expect(tooltip).toContainText('Compact now');
    await expect(tooltip).toContainText('Clear now');
    await expect(chart(page)).toHaveAttribute('aria-valuetext', /^Turn 3: Keep going \$0\.\d\d/);

    await page.keyboard.press('Enter');
    await expect(tooltip).toContainText('pinned');
    const temporary = projectionTable(page).locator('tr[data-pinned]');
    await expect(temporary).toContainText('3');
    await expect(temporary).toContainText('temporary row');

    await page.keyboard.press('Enter');
    await expect(projectionTable(page).locator('tr[data-pinned]')).toHaveCount(0);
  });

  test('pins a turn by clicking it, and highlights its row in the table', async ({ page }) => {
    await open(page);
    await chart(page).scrollIntoViewIfNeeded();
    const box = (await chart(page).boundingBox())!;

    // Turn 10 sits a third of the way along a 30-turn plot.
    const plotLeft = 48;
    const plotWidth = box.width - plotLeft - 132;
    await page.mouse.click(box.x + plotLeft + plotWidth / 3, box.y + 100);

    await expect(page.getByTestId('chart-tooltip')).toContainText('Turn 10');
    await expect(page.getByTestId('chart-tooltip')).toContainText('pinned');
    const pinned = projectionTable(page).locator('tr[data-pinned]');
    await expect(pinned).toHaveCount(1);
    await expect(pinned).toContainText('pinned');
    await expect(pinned).not.toContainText('temporary');

    await pinned.getByRole('button', { name: 'Unpin turn 10' }).click();
    await expect(page.getByTestId('chart-tooltip')).toHaveCount(0);
  });

  test('shows a crosshair tooltip on hover that follows the pointer to whole turns', async ({
    page,
  }) => {
    await open(page);
    await chart(page).scrollIntoViewIfNeeded();
    const box = (await chart(page).boundingBox())!;
    await page.mouse.move(box.x + 48 + (box.width - 48 - 132) / 2, box.y + 120);

    await expect(page.getByTestId('chart-tooltip')).toContainText('Turn 15');
    await page.mouse.move(box.x + 5, box.y + 330);
    await page.mouse.move(box.x + box.width + 20, box.y + 120);
    await expect(page.getByTestId('chart-tooltip')).toHaveCount(0);
  });

  test('exports every turn from 0 to T for every strategy as CSV', async ({ page }) => {
    await open(page);
    await expect(page.getByRole('button', { name: 'Export CSV' })).toBeEnabled();

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Export CSV' }).click(),
    ]);
    expect(download.suggestedFilename()).toBe('compact-or-clear.csv');

    const contents = readFileSync((await download.path())!, 'utf8')
      .trimEnd()
      .split('\n');
    expect(contents[0]).toBe('Turn,Keep going,Compact now,Clear now');
    expect(contents).toHaveLength(32);
    expect(contents[1]).toBe('0,0.000000,1.050000,0.400000');
    expect(contents[31].split(',')[0]).toBe('30');
    expect(Number(contents[31].split(',')[1])).toBeCloseTo(11.1225, 4);
  });

  test('copies a Markdown summary with the costs and crossovers', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await open(page);
    await expect(page.getByRole('button', { name: 'Copy summary' })).toBeEnabled();
    await page.getByRole('button', { name: 'Copy summary' }).click();

    await expect(page.getByText('Summary copied as Markdown.')).toBeVisible();
    const text = await page.evaluate(() => navigator.clipboard.readText());
    expect(text).toContain('- Model: Opus 5 ($5/$25)');
    expect(text).toContain('- Compact now: $1.05');
    expect(text).toContain('- Clear now: $0.40');
    expect(text).toContain('- Compacting: after 6 turns');
    expect(text).toContain('- Clearing: after 3 turns');
    expect(text).toContain('## Total after 30 turns');
    expect(text).toContain('- Keep going: $11.12');
  });

  test('falls back to selectable text when the clipboard rejects', async ({ page }) => {
    await open(page);
    await page.evaluate(() => {
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: () => Promise.reject(new Error('denied')) },
        configurable: true,
      });
    });
    await page.getByRole('button', { name: 'Copy link' }).click();

    await expect(page.getByText('Couldn’t reach the clipboard.')).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Link to copy' })).toHaveValue(/#model=opus-5/);
  });
});

test.describe('sharing', () => {
  test('copies a link with the scenario and none of the session, and reopens to the same answer', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await open(page);
    await chooseSession(page, 'session-opus-5.jsonl');
    await expect(page.getByTestId('calibration-summary')).toBeVisible();
    await page.locator('#cache-cold').click();
    await field(page, 'turns-ahead').fill('40');

    await page.getByRole('button', { name: 'Copy link' }).click();
    await expect(page.getByText('Link copied.')).toBeVisible();
    const link = await page.evaluate(() => navigator.clipboard.readText());

    expect(link).toContain(`${path}#`);
    expect(link).toContain('context=17400');
    expect(link).toContain('cache=cold');
    expect(link).toContain('turns=40');
    for (const forbidden of ['msg_', 'jsonl', 'fixture', '00000000-0000-4000', 'opus-5-5']) {
      expect(link).not.toContain(forbidden);
    }

    const other = await context.newPage();
    await openExperiment(other, link.replace(/^https?:\/\/[^/]+/, ''));
    await expect(other.locator('#context-now')).toHaveValue('17.4K');
    await expect(other.locator('#turns-ahead')).toHaveValue('40');
    await expect(other.locator('#cache-cold')).toHaveAttribute('aria-pressed', 'true');
    await expect(other.getByTestId('calibration-summary')).toHaveCount(0);
  });

  test('keeps the address bar in step once a control changes, without a history warning', async ({
    page,
  }) => {
    const warnings: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'warning') warnings.push(message.text());
    });
    await open(page);
    await field(page, 'turns-ahead').fill('45');

    await expect.poll(() => page.url()).toContain('turns=45');
    expect(warnings.filter((text) => text.includes('history'))).toEqual([]);
  });

  test('ignores a link it can’t read', async ({ page }) => {
    await openExperiment(page, `${path}#context=lots&turns=-4&ttl=2h`);

    await expect(field(page, 'context-now')).toHaveValue('400K');
    await expect(field(page, 'turns-ahead')).toHaveValue('30');
  });
});

test.describe('the price table', () => {
  const prices = (page: Page): Locator => page.getByTestId('price-table');

  const openPrices = async (page: Page): Promise<void> => {
    await open(page);
    await prices(page).locator('summary').click();
    await expect(prices(page)).toHaveAttribute('open', '');
  };

  test('shows a custom prices badge when a price changes and resets to the defaults', async ({
    page,
  }) => {
    await openPrices(page);
    await expect(page.getByText('custom prices')).toHaveCount(0);

    await page.getByRole('textbox', { name: 'Output price of Opus 5', exact: true }).fill('30');
    await expect(page.getByText('custom prices').first()).toBeVisible();
    await expect(page.getByRole('option', { name: 'Opus 5 ($5/$30)' })).toHaveCount(1);
    // Output is no longer 5x input, so the copy softens.
    await expect(page.getByText('Your edited price table breaks that for Opus 5')).toBeVisible();

    await page.getByRole('button', { name: 'Reset to defaults' }).click();
    await expect(page.getByText('custom prices')).toHaveCount(0);
    await expect(page.getByRole('option', { name: 'Opus 5 ($5/$25)' })).toHaveCount(1);
  });

  test('moves the compaction payback when a price breaks the 5x ratio', async ({ page }) => {
    await openPrices(page);
    await page.getByRole('textbox', { name: 'Output price of Opus 5', exact: true }).fill('100');

    await expect(leadTile(page)).not.toHaveText('Compaction pays for itself after 6 turns');
  });

  test('keeps the last good value when an edit is not usable', async ({ page }) => {
    await openPrices(page);
    const input = page.getByRole('textbox', { name: 'Input price of Opus 5', exact: true });
    await input.fill('free');

    await expect(input).toHaveAttribute('aria-invalid', 'true');
    await expect(compactTile(page)).toContainText('$1.05');
  });

  test('imports and exports the table as JSON', async ({ page }) => {
    await openPrices(page);

    await prices(page).locator('input[type="file"]').setInputFiles(fixture('custom-prices.json'));
    await expect(page.getByText('Imported 2 models.')).toBeVisible();
    await expect(page.getByRole('option', { name: 'Opus 5.5 ($6/$30)' })).toHaveCount(1);
    await expect(page.getByRole('option')).toHaveCount(2);

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Export JSON' }).click(),
    ]);
    expect(download.suggestedFilename()).toBe('compact-or-clear-prices.json');
    const exported = JSON.parse(readFileSync((await download.path())!, 'utf8')) as {
      models: { id: string }[];
    };
    expect(exported.models.map((model) => model.id)).toEqual(['opus-5-5', 'opus-5']);
  });

  test('rejects a file that is not a price table', async ({ page }) => {
    await openPrices(page);
    await prices(page).locator('input[type="file"]').setInputFiles(fixture('session-opus-5.jsonl'));

    await expect(page.getByRole('alert').filter({ hasText: 'valid JSON' })).toBeVisible();
    await expect(page.getByRole('option')).toHaveCount(5);
  });

  test('prices a session’s model after it is added to the table', async ({ page }) => {
    await openPrices(page);
    await prices(page).locator('input[type="file"]').setInputFiles(fixture('custom-prices.json'));
    await expect(page.getByRole('option')).toHaveCount(2);

    await chooseSession(page, 'session-opus-5-5.jsonl');
    await expect(page.getByTestId('calibration-summary')).toContainText('matches Opus 5.5');
    await expect(page.getByRole('combobox', { name: 'Model' })).toHaveValue('opus-5-5');
  });
});

test.describe('what would change this answer', () => {
  const rows = (page: Page): Locator => page.getByTestId('sensitivity-table').locator('tbody tr');

  test('lists every input, widest spread first, with the payback at each end', async ({ page }) => {
    await open(page);
    await expect(rows(page)).toHaveCount(7);
    await expect(
      page
        .getByTestId('sensitivity-table')
        .getByRole('columnheader', { name: 'Spread', exact: true }),
    ).toHaveAttribute('aria-sort', 'descending');

    const names = await rows(page).locator('th').allTextContents();
    expect(names.map((name) => name.trim())).toEqual([
      'Context now',
      'Summary size',
      'Warm or cold cache',
      'Re-read after clear',
      'Input per turn',
      'Output per turn',
      'Model',
    ]);

    const cache = rows(page).filter({ hasText: 'Warm or cold cache' });
    await expect(cache).toContainText('turn 6 at Warm');
    await expect(cache).toContainText('turn 16 at Cold');
    await expect(cache).toContainText('10 turns');
    await expect(rows(page).filter({ hasText: 'Model' })).toContainText('none');
  });

  test('moves focus to the control when a row is chosen', async ({ page }) => {
    await open(page);
    await rows(page).filter({ hasText: 'Summary size' }).getByRole('button').click();

    await expect(field(page, 'summary-size')).toBeFocused();

    await rows(page).filter({ hasText: 'Model' }).getByRole('button').click();
    await expect(page.getByRole('combobox', { name: 'Model' })).toBeFocused();
  });

  test('re-ranks as the scenario changes', async ({ page }) => {
    await open(page);
    await page.locator('#cache-cold').click();

    const cache = rows(page).filter({ hasText: 'Warm or cold cache' });
    await expect(cache).toContainText('turn 6 at Warm');
    await expect(page.getByText('at turn 16')).toBeVisible();
  });
});

test.describe('appearance', () => {
  test('explains the model claim, and keeps it only while the 5x ratio holds', async ({ page }) => {
    await open(page);

    await expect(
      page.getByText('Every model in the price table prices output at 5× input'),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'How a turn is priced' })).toBeVisible();
    await expect(page.getByText('$0.50 per million tokens to read from the cache')).toBeVisible();
  });

  for (const colorScheme of ['light', 'dark'] as const) {
    test(`never scrolls sideways at 360 pixels wide with a populated page in ${colorScheme} mode`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 360, height: 800 });
      await page.emulateMedia({ colorScheme });
      await open(page);

      await chooseSession(page, 'session-opus-5.jsonl');
      await expect(page.getByTestId('calibration-summary')).toBeVisible();
      await page.getByText('1 compaction found').click();
      await rereadZone(page)
        .locator('input[type="file"]')
        .first()
        .setInputFiles([
          {
            name: 'a-very-long-file-name-that-keeps-going-and-going.md',
            mimeType: 'text/plain',
            buffer: Buffer.from('a'.repeat(9_000)),
          },
          { name: 'logo.png', mimeType: 'image/png', buffer: Buffer.from([1, 0, 2]) },
        ]);
      await expect(page.getByTestId('reread-list')).toBeVisible();
      await page.getByRole('checkbox', { name: 'Compare compacting later' }).check();
      await page.getByText('Advanced').click();
      await chart(page).focus();
      await page.keyboard.press('End');
      await page.keyboard.press('Enter');
      await page.locator('[data-testid="price-table"] summary').click();

      expect(await horizontalOverflow(page)).toBe(0);

      // The line labels at the ends of the chart stay inside the page.
      const labels = await chart(page)
        .locator('svg text')
        .evaluateAll((nodes) =>
          nodes.map((node) => {
            const bounds = node.getBoundingClientRect();

            return { text: node.textContent?.trim(), right: bounds.right };
          }),
        );
      for (const label of labels) {
        expect(label.right, label.text).toBeLessThanOrEqual(360);
      }
    });
  }

  test('draws the chart wide enough to read on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await open(page);

    const bounds = (await chart(page).boundingBox())!;
    expect(bounds.width).toBeGreaterThan(280);
    await expect(chart(page).locator('svg text', { hasText: /^Keep \$11\.12$/ })).toHaveCount(1);
  });

  test('has a text equivalent for the chart in the table, and a named slider for it', async ({
    page,
  }) => {
    await open(page);

    await expect(chart(page)).toHaveAttribute('role', 'slider');
    await expect(chart(page)).toHaveAttribute(
      'aria-label',
      /projected spend table has the same numbers/,
    );
    await expect(page.getByRole('region', { name: 'Projected spend table' })).toBeVisible();
  });
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('still shows the answer', async ({ page }) => {
    await page.goto(path);

    await expect(page.locator('#lead-tile')).toHaveText('Compaction pays for itself after 6 turns');
  });
});
