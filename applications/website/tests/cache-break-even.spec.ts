import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { openExperiment } from './helpers/open-experiment';

// The session fixtures are synthetic: five main-thread turns where two
// responses stream across duplicate lines, a subagent response with a huge
// context that must not count, a compaction, and two lines that aren't JSON.
const fixture = (name: string): string =>
  fileURLToPath(new URL(`./fixtures/cache-break-even/${name}`, import.meta.url));

const path = '/experiments/cache-break-even';

const open = (page: Page): Promise<void> => openExperiment(page, path);

const stat = (page: Page, name: 'cost' | 'value' | 'net'): Locator =>
  page.locator(`[data-stat="${name}"]`);

const verdict = (page: Page): Locator => page.locator('[data-verdict]');

const fromModel = (page: Page): Locator => page.getByLabel('From model');
const toModel = (page: Page): Locator => page.getByLabel('To model');
const toEffort = (page: Page): Locator =>
  page.getByRole('group', { name: 'Where you’re going' }).getByLabel('at effort');
const contextField = (page: Page): Locator =>
  page.getByRole('textbox', { name: 'Tokens already in context (N)', exact: true });
const outputField = (page: Page): Locator =>
  page.getByRole('textbox', { name: 'Remaining output work (R)', exact: true });
const swapButton = (page: Page): Locator => page.getByRole('button', { name: 'Swap from and to' });
const chart = (page: Page): Locator =>
  page.getByRole('slider', { name: /^Cost to change by tokens/ });

const horizontalOverflow = (page: Page): Promise<number> =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

const parseCount = async (field: Locator): Promise<number> =>
  Number((await field.inputValue()).replace(/,/g, ''));

test('responds with 200 and the specified headline', async ({ page }) => {
  const response = await page.goto(path);

  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle(/Cache Break-Even/);
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Breaking the cache: model and effort calculator',
    }),
  ).toBeVisible();
});

test.describe('acceptance check 1: the defaults', () => {
  test('cost $2.00, value $2.25, net +$0.25, $15.00 per MTok', async ({ page }) => {
    await open(page);

    await expect(stat(page, 'cost')).toHaveText('$2.00');
    await expect(stat(page, 'value')).toHaveText('$2.25');
    await expect(stat(page, 'net')).toHaveText('+$0.25');
    await expect(page.getByText('re-cache 500K at Sonnet 5 input rate')).toBeVisible();
    await expect(page.getByText('$15.00 per MTok of output')).toBeVisible();
    await expect(page.getByText('ahead if you change now')).toBeVisible();
    await expect(page.getByLabel('Output volume ratio')).toHaveValue('1.00');
    await expect(page.getByText('no effort change')).toBeVisible();
  });

  test('the verdict says it already pays for itself and names the break-even context', async ({
    page,
  }) => {
    await open(page);

    await expect(verdict(page)).toHaveAttribute('data-verdict', 'worth-it');
    await expect(verdict(page)).toContainText(
      'Switching to Sonnet 5 already pays for itself, by $0.25.',
    );
    await expect(verdict(page)).toContainText('doesn’t grow past 563K tokens');
  });

  test('the break-even output is 133K, which is what the options table lists for the default pair', async ({
    page,
  }) => {
    await open(page);

    const row = page.locator('[data-option-key="sonnet-5:high"]');
    await expect(row).toContainText('133K');
  });

  test('the default model dropdown labels show the prices', async ({ page }) => {
    await open(page);

    await expect(fromModel(page).locator('option:checked')).toHaveText('Opus 5 ($5/$25)');
    await expect(toModel(page).locator('option:checked')).toHaveText('Sonnet 5 ($2/$10)');
    await expect(fromModel(page).locator('option')).toHaveText([
      'Fable 5.1 ($10/$50)',
      'Opus 5 ($5/$25)',
      'Opus 5.5 ($4/$20)',
      'Sonnet 5 ($2/$10)',
      'Sonnet 5.5 ($2/$10)',
      'Sonnet 4.6 ($3/$15)',
      'Haiku 4.5 ($1/$5)',
    ]);
  });
});

test('acceptance check 2: a 5-minute TTL costs $1.25 and nets +$1.00', async ({ page }) => {
  await open(page);

  await page.getByRole('button', { name: '5-minute' }).click();

  await expect(page.getByRole('button', { name: '5-minute' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByRole('button', { name: '1-hour' })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  await expect(stat(page, 'cost')).toHaveText('$1.25');
  await expect(stat(page, 'net')).toHaveText('+$1.00');
});

test.describe('acceptance check 3: an effort-only change', () => {
  test('halves the output: ratio 0.50, $5.00 cost, $1.88 value, 400K break-even, callout', async ({
    page,
  }) => {
    await open(page);
    await toModel(page).selectOption('opus-5');
    await toEffort(page).selectOption('medium');

    await expect(page.getByLabel('Output volume ratio')).toHaveValue('0.50');
    await expect(page.getByText('from published coding runs')).toBeVisible();
    await expect(stat(page, 'cost')).toHaveText('$5.00');
    // $1.875 rounds to the cent.
    await expect(stat(page, 'value')).toHaveText('$1.88');
    await expect(stat(page, 'net')).toHaveText('−$3.13');
    await expect(verdict(page)).toHaveAttribute('data-verdict', 'not-yet');
    await expect(verdict(page)).toContainText('dropping Opus 5 from high to medium effort');
    await expect(verdict(page)).toContainText('needs at least 400K tokens');
    await expect(verdict(page)).toContainText('about 250K more than you have');
    await expect(
      page.getByRole('complementary', { name: 'This change may be free' }),
    ).toContainText('the re-cache cost ($5.00) drops to zero');
  });

  test('the callout stays away from model switches and from models that reset the cache', async ({
    page,
  }) => {
    await open(page);

    const callout = page.getByRole('complementary', { name: 'This change may be free' });
    await expect(callout).toHaveCount(0);

    await fromModel(page).selectOption('sonnet-5');
    await toModel(page).selectOption('sonnet-5');
    await toEffort(page).selectOption('low');
    await expect(callout).toHaveCount(0);
  });

  test('a placeholder effort says it is worth overriding', async ({ page }) => {
    await open(page);
    await toEffort(page).selectOption('xhigh');

    await expect(page.getByLabel('Output volume ratio')).toHaveValue('1.50');
    await expect(
      page.getByText('includes an unpublished placeholder—worth overriding'),
    ).toBeVisible();
  });
});

test('acceptance check 4: an upgrade never pays for itself and has no break-even marker', async ({
  page,
}) => {
  await open(page);
  await expect(page.locator('[data-chart-mark="break-even"]')).toHaveCount(1);

  await swapButton(page).click();

  await expect(fromModel(page)).toHaveValue('sonnet-5');
  await expect(toModel(page)).toHaveValue('opus-5');
  await expect(page.getByText('−$15.00 per MTok of output')).toBeVisible();
  await expect(verdict(page)).toHaveAttribute('data-verdict', 'never');
  await expect(verdict(page)).toContainText('it raises it by $15.00 per MTok');
  await expect(verdict(page)).toContainText('never pays for itself');
  await expect(page.locator('[data-chart-mark="break-even"]')).toHaveCount(0);
  await expect(stat(page, 'net')).toHaveText('−$7.25');
  await expect(page.getByText('behind if you change now')).toBeVisible();
});

test('acceptance check 5: changing nothing costs nothing and says so', async ({ page }) => {
  await open(page);
  await toModel(page).selectOption('opus-5');

  await expect(stat(page, 'cost')).toHaveText('$0.00');
  await expect(verdict(page)).toHaveAttribute('data-verdict', 'unchanged');
  await expect(verdict(page)).toContainText('Nothing’s changing');
  await expect(page.getByText('nothing to re-cache')).toBeVisible();
  // Nothing is being changed, so the Net tile is neutral and says so, not "ahead".
  await expect(page.locator('[data-net-status]')).toHaveText('nothing is changing');
  await expect(page.getByText('ahead if you change now')).toHaveCount(0);
  // The explanation doesn't claim a re-cache cost it isn't charging.
  await expect(page.getByText('nothing is being re-cached')).toBeVisible();
  await expect(page.getByText('500,000 × $5')).toHaveCount(0);
});

test('acceptance check 6: swapping twice restores the defaults', async ({ page }) => {
  await open(page);
  await toEffort(page).selectOption('medium');

  await swapButton(page).click();
  await expect(fromModel(page)).toHaveValue('sonnet-5');
  await expect(toModel(page)).toHaveValue('opus-5');
  await expect(
    page.getByRole('group', { name: 'Where you’re coming from' }).getByLabel('at effort'),
  ).toHaveValue('medium');
  await expect(toEffort(page)).toHaveValue('high');

  await swapButton(page).click();
  await expect(fromModel(page)).toHaveValue('opus-5');
  await expect(toModel(page)).toHaveValue('sonnet-5');
  await expect(toEffort(page)).toHaveValue('medium');
});

test('swapping clears a ratio override', async ({ page }) => {
  await open(page);
  await toEffort(page).selectOption('medium');
  await page.getByLabel('Output volume ratio').fill('0.3');
  await expect(page.getByText('your override—change an effort level to reset')).toBeVisible();

  await swapButton(page).click();

  await expect(page.getByLabel('Output volume ratio')).toHaveValue('2.00');
  await expect(page.getByText('from published coding runs')).toBeVisible();
});

test.describe('acceptance check 7: clicking the chart sets N', () => {
  test('a click at about 300K moves N and updates every figure', async ({ page }) => {
    await open(page);
    const plot = chart(page);
    await expect(plot).toBeVisible();

    const box = await plot.boundingBox();
    const left = Number(await plot.getAttribute('data-plot-left'));
    const plotWidth = Number(await plot.getAttribute('data-plot-width'));
    const domainMax = Number(await plot.getAttribute('data-domain-max'));
    if (!box) throw new Error('The chart has no box.');

    await plot.click({
      position: { x: left + (300_000 / domainMax) * plotWidth, y: box.height / 2 },
    });

    const context = await parseCount(contextField(page));
    expect(Math.abs(context - 300_000)).toBeLessThanOrEqual(domainMax / plotWidth + 1_000);
    // 2 × 2 ÷ 1,000,000 dollars per context token, to the cent.
    await expect(stat(page, 'cost')).toHaveText(`$${((context * 4) / 1_000_000).toFixed(2)}`);
    await expect(page.getByText(`re-cache 300K at Sonnet 5 input rate`)).toBeVisible();
    await expect(verdict(page)).toContainText('Switching to Sonnet 5 already pays for itself');
  });

  test('hovering shows a tooltip, and the keyboard moves a cursor that Enter commits', async ({
    page,
  }) => {
    await open(page);
    const plot = chart(page);

    await plot.focus();
    await expect(page.locator('[data-chart-tooltip]')).toContainText(
      '500K tokens in context · Cost to change $2.00',
    );

    await plot.press('ArrowLeft');
    await plot.press('ArrowLeft');
    await plot.press('Enter');

    const context = await parseCount(contextField(page));
    expect(context).toBeLessThan(500_000);
    expect(context).toBeGreaterThan(450_000);
  });

  test('the "you are here" label stays clear of the value label at phone width', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await open(page);

    const here = chart(page).locator('text', { hasText: 'you are here' });
    const value = chart(page).locator('text', { hasText: /^Value / });
    const hereBox = (await here.boundingBox())!;
    const valueBox = (await value.boundingBox())!;

    const overlapsHorizontally =
      hereBox.x < valueBox.x + valueBox.width && valueBox.x < hereBox.x + hereBox.width;
    const overlapsVertically =
      hereBox.y < valueBox.y + valueBox.height && valueBox.y < hereBox.y + hereBox.height;

    expect(overlapsHorizontally && overlapsVertically).toBe(false);
  });

  test('the chart has a text equivalent and a legend with all five marks', async ({ page }) => {
    await open(page);

    await expect(page.locator('#chart-description')).toContainText(
      'The lines cross at 563K tokens of context.',
    );
    await expect(page.locator('#chart-description')).toContainText('you are ahead');
    for (const mark of [
      'Cost to make the change',
      'Value of remaining work',
      'Break-even point',
      'You are here, ahead',
      'You are here, behind',
    ]) {
      await expect(page.getByRole('listitem').filter({ hasText: mark }).first()).toBeVisible();
    }
  });
});

test.describe('acceptance check 8: importing a session', () => {
  test('counts each message once, leaves subagents out, and fills N and the model', async ({
    page,
  }) => {
    await open(page);
    await fromModel(page).selectOption('haiku-4-5');
    await page.locator('input[type="file"]').first().setInputFiles(fixture('session-opus-5.jsonl'));

    // One response streamed across two lines and a subagent response held 900K tokens.
    await expect(page.locator('[data-session-chip]')).toHaveText(
      'Imported 5 turns · current context 312K · Opus 5 · median output 1.2K/turn',
    );
    await expect(contextField(page)).toHaveValue('312,000');
    await expect(fromModel(page)).toHaveValue('opus-5');
    await expect(page.getByText('from your session', { exact: true })).toHaveCount(2);
    await expect(page.locator('[data-compaction]')).toContainText(
      'context dropped from 168K to 22K (auto)',
    );
    await expect(page.locator('[data-skipped]')).toContainText('Skipped 2 lines');
    await expect(page.getByLabel('Average output per turn')).toHaveValue('1,400');
    await expect(stat(page, 'cost')).toHaveText('$1.25');
  });

  test('editing a filled field drops its marker, and discarding restores what was there', async ({
    page,
  }) => {
    await open(page);
    await page.locator('input[type="file"]').first().setInputFiles(fixture('session-opus-5.jsonl'));
    await expect(contextField(page)).toHaveValue('312,000');

    await fromModel(page).selectOption('fable-5-1');
    await expect(page.getByText('from your session', { exact: true })).toHaveCount(1);

    await page.getByRole('button', { name: 'Discard import' }).click();

    await expect(page.locator('[data-session-summary]')).toHaveCount(0);
    await expect(page.getByText('from your session', { exact: true })).toHaveCount(0);
    await expect(contextField(page)).toHaveValue('500,000');
    // The model was edited after the import, so discarding leaves the person's choice alone.
    await expect(fromModel(page)).toHaveValue('fable-5-1');
  });

  test('turns remaining times the average output sets R', async ({ page }) => {
    await open(page);
    await page.locator('input[type="file"]').first().setInputFiles(fixture('session-opus-5.jsonl'));

    await page.getByLabel('Turns you expect remaining').fill('100');

    await expect(outputField(page)).toHaveValue('140,000');
    await expect(page.getByText('≈ 140K tokens')).toBeVisible();
  });

  test('a model that is not in the price table is named, and the selection stays', async ({
    page,
  }) => {
    await open(page);
    await fromModel(page).selectOption('haiku-4-5');
    await page
      .locator('input[type="file"]')
      .first()
      .setInputFiles(fixture('session-opus-5-1.jsonl'));

    await expect(page.locator('[data-model-unmatched]')).toContainText('claude-opus-5-1');
    await expect(fromModel(page)).toHaveValue('haiku-4-5');
    await expect(contextField(page)).toHaveValue('35,500');

    await page.getByRole('button', { name: 'Prices and assumptions' }).first().click();
    await expect(page.getByRole('button', { name: 'Add a model' })).toBeVisible();
  });

  test('a session on Opus 5.5 matches the Opus 5.5 row and sets From model', async ({ page }) => {
    await open(page);
    await fromModel(page).selectOption('haiku-4-5');
    await page
      .locator('input[type="file"]')
      .first()
      .setInputFiles(fixture('session-opus-5-5.jsonl'));

    await expect(page.locator('[data-model-unmatched]')).toHaveCount(0);
    await expect(fromModel(page)).toHaveValue('opus-5-5');
    await expect(contextField(page)).toHaveValue('35,500');
  });

  test('an unmatched model ID with no break points stays inside a 360-pixel page', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await open(page);
    const longModel = `claude-${'x'.repeat(120)}`;
    const directory = mkdtempSync(join(tmpdir(), 'cache-break-even-'));
    const session = join(directory, 'long-model.jsonl');
    writeFileSync(
      session,
      readFileSync(fixture('session-opus-5-1.jsonl'), 'utf8').replaceAll(
        'claude-opus-5-1',
        longModel,
      ),
    );

    await page.locator('input[type="file"]').first().setInputFiles(session);

    await expect(page.locator('[data-model-unmatched]')).toContainText(longModel);
    await expect(page.locator('[data-session-chip]')).toContainText(longModel);
    expect(await horizontalOverflow(page)).toBe(0);
  });

  test('a file with no responses changes nothing and says so', async ({ page }) => {
    await open(page);
    const directory = mkdtempSync(join(tmpdir(), 'cache-break-even-'));
    const empty = join(directory, 'empty.jsonl');
    writeFileSync(empty, '{"type":"user","sessionId":"s"}\nnot json\n');

    await page.locator('input[type="file"]').first().setInputFiles(empty);

    await expect(page.getByRole('alert')).toContainText('nothing changed');
    await expect(contextField(page)).toHaveValue('500,000');
  });

  test('reads a file dropped anywhere on the page', async ({ page }) => {
    await open(page);

    const dataTransfer = await page.evaluateHandle(
      (contents) => {
        const transfer = new DataTransfer();
        transfer.items.add(new File([contents], 'session.jsonl'));

        return transfer;
      },
      readFileSync(fixture('session-opus-5.jsonl'), 'utf8'),
    );
    await page
      .getByRole('main')
      .getByRole('heading', { level: 1 })
      .dispatchEvent('drop', { dataTransfer });

    await expect(contextField(page)).toHaveValue('312,000');
    expect(new URL(page.url()).pathname).toBe(path);
  });
});

test.describe('pasting a context readout', () => {
  test('offers the first pair in the interactive form as N', async ({ page }) => {
    await open(page);

    await page.getByLabel('Or paste a context readout').fill('opus · 312k/1000k tokens · 31%');
    await expect(page.getByText('Found 312K of 1M tokens.')).toBeVisible();
    await page.getByRole('button', { name: 'Use 312K as N' }).click();

    await expect(contextField(page)).toHaveValue('312,000');
    await expect(page.getByText('from your pasted readout')).toBeVisible();
  });

  test('reads the print form with spaces and a lowercase m', async ({ page }) => {
    await open(page);

    await page
      .getByLabel('Or paste a context readout')
      .fill('## Context Usage\n**Tokens:** 35.5k / 1m (4%)');
    await page.getByRole('button', { name: 'Use 35.5K as N' }).click();

    await expect(contextField(page)).toHaveValue('35,500');
  });

  test('says when there is nothing to read', async ({ page }) => {
    await open(page);

    await page.getByLabel('Or paste a context readout').fill('no numbers here');

    await expect(page.getByText('No context readout in that text yet')).toBeVisible();
  });
});

test.describe('setup controls', () => {
  test('the token boxes parse shorthand and keep the last good value on garbage', async ({
    page,
  }) => {
    await open(page);

    await contextField(page).fill('1.2M');
    await expect(stat(page, 'cost')).toHaveText('$4.80');
    await contextField(page).fill('lots');
    await expect(contextField(page)).toHaveAttribute('aria-invalid', 'true');
    await expect(stat(page, 'cost')).toHaveText('$4.80');
    await contextField(page).fill('0');
    await expect(stat(page, 'cost')).toHaveText('$0.00');
    await expect(verdict(page)).toContainText('already pays for itself');

    await outputField(page).fill('250k');
    await expect(stat(page, 'value')).toHaveText('$3.75');
  });

  test('the log slider covers 1K to 10M and the box accepts more', async ({ page }) => {
    await open(page);
    const slider = page.getByRole('slider', { name: /^Tokens already in context \(N\) slider/ });

    await slider.fill('500');
    await expect(contextField(page)).toHaveValue('100,000');
    await slider.fill('1000');
    await expect(contextField(page)).toHaveValue('10,000,000');

    await contextField(page).fill('50M');
    await expect(slider).toHaveValue('1000');
    await expect(stat(page, 'cost')).toHaveText('$200.00');
    await expect(page.locator('#chart-description')).toContainText('65M tokens');
  });

  test('typing a ratio sets an override, and changing an effort clears it', async ({ page }) => {
    await open(page);
    const ratio = page.getByLabel('Output volume ratio');

    await ratio.fill('0.4');
    await expect(page.getByText('your override—change an effort level to reset')).toBeVisible();
    // 150,000 × ($25 − 0.4 × $10) ÷ 1,000,000
    await expect(stat(page, 'value')).toHaveText('$3.15');

    await ratio.fill('-1');
    await expect(page.getByText('That isn’t a positive number')).toBeVisible();
    await expect(stat(page, 'value')).toHaveText('$2.25');

    await ratio.fill('0.4');
    await toEffort(page).selectOption('low');
    await expect(ratio).toHaveValue('0.25');
    await expect(page.getByText('from published coding runs')).toBeVisible();
  });

  test('the cache TTL toggle exposes its pressed state', async ({ page }) => {
    await open(page);

    await expect(page.getByRole('group', { name: 'Cache TTL' })).toBeVisible();
    await expect(page.getByRole('button', { name: '1-hour' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});

test.describe('every option from here', () => {
  test('lists every destination sorted by net, best first, with never-paying rows muted', async ({
    page,
  }) => {
    await open(page);
    const table = page.locator('[data-options-table]');

    await expect(table.locator('tbody tr')).toHaveCount(35);
    await expect(table.getByRole('columnheader', { name: 'Net' })).toHaveAttribute(
      'aria-sort',
      'descending',
    );
    await expect(table.locator('tbody tr').first()).toContainText('Haiku 4.5 at low');
    await expect(table.locator('tbody tr').last()).toContainText('Fable 5.1 at max');
    await expect(table.locator('[data-option-key="fable-5-1:high"]')).toContainText('never');
    await expect(table.locator('[data-option-key="opus-5:medium"]')).toContainText(
      'Free with a per-request effort setting',
    );
    await expect(table.locator('[data-option-key="opus-5:high"]')).toContainText(
      '(your current setup)',
    );
  });

  test('clicking a row, or its button, sets the destination', async ({ page }) => {
    await open(page);
    const table = page.locator('[data-options-table]');

    await table.locator('[data-option-key="haiku-4-5:medium"] td').first().click();
    await expect(toModel(page)).toHaveValue('haiku-4-5');
    await expect(toEffort(page)).toHaveValue('medium');

    await table.getByRole('button', { name: 'Sonnet 4.6 at high' }).click();
    await expect(toModel(page)).toHaveValue('sonnet-4-6');
    await expect(toEffort(page)).toHaveValue('high');
  });

  test('sorts from the column headings and puts never last', async ({ page }) => {
    await open(page);
    const table = page.locator('[data-options-table]');

    await table.getByRole('button', { name: 'Break-even R' }).click();
    await expect(table.getByRole('columnheader', { name: 'Break-even R' })).toHaveAttribute(
      'aria-sort',
      'ascending',
    );
    await expect(table.locator('tbody tr').first()).toContainText('Haiku 4.5 at low');
    await expect(table.locator('tbody tr').last()).toContainText('never');
  });
});

test.describe('the sensitivity map', () => {
  test('states the boundary in words and sets both N and R when a cell is chosen', async ({
    page,
  }) => {
    await open(page);
    const map = page.locator('[data-sensitivity-map]');
    await expect(map).toBeVisible();

    await expect(page.locator('[data-boundary]')).toContainText('Pays back whenever R ≥ 0.27 × N.');

    const box = await map.boundingBox();
    if (!box) throw new Error('The map has no box.');

    await map.hover({ position: { x: box.width * 0.6, y: box.height * 0.3 } });
    await expect(page.locator('[data-map-tooltip]')).toContainText(/N .* · R .* · Net [+−]\$/);

    await map.click({ position: { x: box.width * 0.6, y: box.height * 0.3 } });

    expect(await parseCount(contextField(page))).not.toBe(500_000);
    expect(await parseCount(outputField(page))).not.toBe(150_000);
    // Both axes are logarithmic and the click is above and right of the middle.
    expect(await parseCount(contextField(page))).toBeGreaterThan(1_000);
    expect(await parseCount(outputField(page))).toBeGreaterThan(1_000);
  });

  test('the keyboard moves between cells and Enter chooses one', async ({ page }) => {
    await open(page);
    const map = page.locator('[data-sensitivity-map]');
    await expect(map).toBeVisible();

    await map.focus();
    await expect(page.locator('[data-map-tooltip]')).toBeVisible();
    await map.press('ArrowRight');
    await map.press('Enter');

    expect(await parseCount(contextField(page))).toBeGreaterThan(500_000);
  });

  test('says when a change never pays back', async ({ page }) => {
    await open(page);
    await swapButton(page).click();

    await expect(page.locator('[data-boundary]')).toContainText('never pays back');
  });
});

test.describe('prices and assumptions', () => {
  const openPanel = async (page: Page): Promise<void> => {
    await page.getByText('Prices and assumptions', { exact: true }).first().click();
    await expect(page.getByRole('button', { name: 'Add a model' })).toBeVisible();
  };

  test('editing a price updates every figure and shows the custom prices badge', async ({
    page,
  }) => {
    await open(page);
    await expect(page.locator('[data-custom-prices]')).toHaveCount(0);
    await openPanel(page);

    await page.getByLabel('Model 4 output price').fill('12');

    await expect(page.locator('[data-custom-prices]')).toBeVisible();
    // 150,000 × ($25 − $12) ÷ 1,000,000
    await expect(stat(page, 'value')).toHaveText('$1.95');
    await expect(toModel(page).locator('option:checked')).toHaveText('Sonnet 5 ($2/$12)');

    await page.getByRole('button', { name: 'Reset to defaults' }).click();
    await expect(stat(page, 'value')).toHaveText('$2.25');
    await expect(page.locator('[data-custom-prices]')).toHaveCount(0);
  });

  test('adds and removes a model, and effort factors are editable', async ({ page }) => {
    await open(page);
    await openPanel(page);

    await page.getByRole('button', { name: 'Add a model' }).click();
    await expect(page.getByLabel('Model 8 name')).toHaveValue('New model');
    await expect(toModel(page).locator('option')).toHaveCount(8);

    await page.getByRole('button', { name: 'Remove model 8' }).click();
    await expect(toModel(page).locator('option')).toHaveCount(7);

    await toEffort(page).selectOption('medium');
    await page.getByLabel('medium effort factor', { exact: true }).fill('0.4');
    await expect(page.getByLabel('Output volume ratio')).toHaveValue('0.40');
    await page.getByLabel('medium effort factor is sourced from published runs').uncheck();
    await expect(
      page.getByText('includes an unpublished placeholder—worth overriding'),
    ).toBeVisible();
  });

  test('removing the selected model falls back to one that exists', async ({ page }) => {
    await open(page);
    await openPanel(page);

    await page.getByRole('button', { name: 'Remove model 4' }).click();

    await expect(toModel(page)).not.toHaveValue('sonnet-5');
    await expect(toModel(page).locator('option')).toHaveCount(6);
  });

  test('exports the table as JSON and imports one, skipping what is unusable', async ({ page }) => {
    await open(page);
    await openPanel(page);

    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export' }).click();
    const file = await download;
    expect(file.suggestedFilename()).toBe('cache-break-even-prices.json');
    const exported = JSON.parse(readFileSync((await file.path()) ?? '', 'utf8'));
    expect(exported.models).toHaveLength(7);
    expect(exported.efforts).toHaveLength(5);

    await page
      .locator('input[type="file"][accept="application/json,.json"]')
      .setInputFiles(fixture('custom-prices.json'));

    await expect(page.getByText('Imported 2 models.')).toBeVisible();
    await expect(page.locator('[data-custom-prices]')).toBeVisible();
    await expect(fromModel(page).locator('option')).toHaveText([
      'Opus 5.5 ($6/$30)',
      'Sonnet 5 ($2/$10)',
    ]);
    await expect(page.getByLabel('max effort factor', { exact: true })).toHaveValue('3');
  });

  test('rejects a file that is not a price table', async ({ page }) => {
    await open(page);
    await openPanel(page);

    await page
      .locator('input[type="file"][accept="application/json,.json"]')
      .setInputFiles(fixture('session-opus-5.jsonl'));

    await expect(page.getByRole('alert')).toContainText('isn’t valid JSON');
    await expect(page.locator('[data-custom-prices]')).toHaveCount(0);
  });
});

test.describe('sharing', () => {
  test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

  test('copy link reproduces the whole configuration, custom prices included, and nothing imported', async ({
    page,
    context,
  }) => {
    await open(page);
    await page.locator('input[type="file"]').first().setInputFiles(fixture('session-opus-5.jsonl'));
    await expect(contextField(page)).toHaveValue('312,000');
    await toModel(page).selectOption('opus-5');
    await toEffort(page).selectOption('medium');
    await page.getByRole('button', { name: '5-minute' }).click();
    await page.getByLabel('Output volume ratio').fill('0.45');
    await outputField(page).fill('90k');
    await page.getByText('Prices and assumptions', { exact: true }).first().click();
    await page.getByLabel('Model 7 input price').fill('1.5');

    await page.getByRole('button', { name: 'Copy link' }).click();
    await expect(page.getByText('Link copied.')).toBeVisible();
    const link = await page.evaluate(() => navigator.clipboard.readText());

    expect(link).toContain('#from=');
    expect(link).not.toContain('claude-opus');
    expect(link).not.toContain('session');

    const other = await context.newPage();
    await openExperiment(other, link.replace(/^https?:\/\/[^/]+/, ''));
    await expect(contextField(other)).toHaveValue('312,000');
    await expect(outputField(other)).toHaveValue('90,000');
    await expect(other.getByLabel('To model')).toHaveValue('opus-5');
    await expect(
      other.getByRole('group', { name: 'Where you’re going' }).getByLabel('at effort'),
    ).toHaveValue('medium');
    await expect(other.getByRole('button', { name: '5-minute' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(other.getByLabel('Output volume ratio')).toHaveValue('0.45');
    await expect(other.locator('[data-custom-prices]')).toBeVisible();
    await expect(other.getByLabel('From model').locator('option').last()).toHaveText(
      'Haiku 4.5 ($1.5/$5)',
    );
    // No session came along.
    await expect(other.locator('[data-session-summary]')).toHaveCount(0);
  });

  test('the address bar follows the setup once something changes', async ({ page }) => {
    await open(page);
    expect(page.url()).not.toContain('#');

    await page.getByRole('button', { name: '5-minute' }).click();

    await expect.poll(() => page.url()).toContain('ttl=5m');
  });

  test('copy summary puts a Markdown block on the clipboard', async ({ page }) => {
    await open(page);

    await page.getByRole('button', { name: 'Copy summary' }).click();
    await expect(page.getByText('Summary copied.')).toBeVisible();
    const summary = await page.evaluate(() => navigator.clipboard.readText());

    expect(summary).toContain('- From: Opus 5 at high effort');
    expect(summary).toContain('- Cost to make the change: $2.00');
    expect(summary).toContain('- Net: +$0.25 (ahead)');
    expect(summary).toContain('**Sonnet 5** already pays for itself, by **$0.25**');
    expect(summary).not.toContain('custom');
  });

  test('a summary mentions custom prices', async ({ page }) => {
    await open(page);
    await page.getByText('Prices and assumptions', { exact: true }).first().click();
    await page.getByLabel('Model 4 output price').fill('11');

    await page.getByRole('button', { name: 'Copy summary' }).click();

    await expect(page.getByText('Summary copied.')).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('custom');
  });
});

test.describe('clipboard fallback', () => {
  test('selects the text and tells the person to copy it themselves when the clipboard rejects', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: () => Promise.reject(new Error('blocked')) },
      });
    });
    await open(page);

    await page.getByRole('button', { name: 'Copy link' }).click();

    await expect(page.getByText('press Command-C or Control-C')).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Link to copy' })).toBeFocused();
    await expect(page.getByRole('textbox', { name: 'Link to copy' })).toHaveValue(/#from=opus-5/);
  });
});

test.describe('saved scenarios', () => {
  const save = async (page: Page, name: string): Promise<void> => {
    await page.getByLabel('Scenario name').fill(name);
    await page.getByRole('button', { name: 'Save scenario' }).click();
    await expect(page.getByRole('button', { name, exact: true })).toBeVisible();
  };

  test('saves scenarios, compares up to three, and keeps them across a reload', async ({
    page,
  }) => {
    await open(page);
    await expect(page.getByLabel('Scenario name')).toBeVisible();

    await save(page, 'Defaults');
    await page.getByRole('button', { name: '5-minute' }).click();
    await save(page, 'Short cache');
    await toModel(page).selectOption('haiku-4-5');
    await save(page, 'Haiku');
    await toModel(page).selectOption('fable-5-1');
    await save(page, 'Fable');

    await page.getByRole('button', { name: 'Defaults', exact: true }).click();
    await page.getByRole('button', { name: 'Short cache', exact: true }).click();

    const comparison = page.locator('[data-scenario-comparison]');
    await expect(comparison.locator('tbody tr')).toHaveCount(2);
    await expect(comparison.locator('tbody tr').first()).toContainText('$2.00');
    await expect(comparison.locator('tbody tr').first()).toContainText('+$0.25');
    await expect(comparison.locator('tbody tr').nth(1)).toContainText('$1.25');
    await expect(comparison.locator('tbody tr').nth(1)).toContainText('+$1.00');

    await page.getByRole('button', { name: 'Haiku', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Fable', exact: true })).toBeDisabled();
    await expect(comparison.locator('tbody tr')).toHaveCount(3);

    await page.reload();
    await openExperiment(page, path);
    await expect(page.getByRole('button', { name: 'Defaults', exact: true })).toBeVisible();
  });

  test('loading a scenario restores its setup, and deleting removes it', async ({ page }) => {
    await open(page);
    await toModel(page).selectOption('haiku-4-5');
    await toEffort(page).selectOption('low');
    await contextField(page).fill('250k');
    await save(page, 'Cheap');

    await page.getByRole('button', { name: 'Swap from and to' }).click();
    await contextField(page).fill('1m');
    await page.getByRole('button', { name: 'Load Cheap' }).click();

    await expect(toModel(page)).toHaveValue('haiku-4-5');
    await expect(toEffort(page)).toHaveValue('low');
    await expect(contextField(page)).toHaveValue('250,000');

    await page.getByRole('button', { name: 'Delete Cheap' }).click();
    await expect(page.getByRole('button', { name: 'Cheap', exact: true })).toHaveCount(0);
  });

  test('works without browser storage', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        get() {
          throw new Error('blocked');
        },
      });
    });
    await open(page);

    await page.getByLabel('Scenario name').fill('Temporary');
    await page.getByRole('button', { name: 'Save scenario' }).click();

    await expect(page.getByText('wouldn’t store the scenarios')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Temporary', exact: true })).toBeVisible();
  });
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('still shows the headline, the defaults, and the explanation', async ({ page }) => {
    await page.goto(path);

    await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toContainText(
      'Breaking the cache',
    );
    await expect(stat(page, 'cost')).toHaveText('$2.00');
    await expect(page.getByText('The two levers')).toBeVisible();
  });
});

test.describe('a populated page at 360 pixels wide', () => {
  for (const colorScheme of ['light', 'dark'] as const) {
    test(`never scrolls sideways in ${colorScheme} mode`, async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 800 });
      await page.emulateMedia({ colorScheme });
      await open(page);

      await page
        .locator('input[type="file"]')
        .first()
        .setInputFiles(fixture('session-opus-5.jsonl'));
      await expect(contextField(page)).toHaveValue('312,000');
      await page.getByLabel('Turns you expect remaining').fill('100');
      await toEffort(page).selectOption('medium');
      await contextField(page).fill('50M');
      await page.getByLabel('Or paste a context readout').fill('312k/1000k tokens');
      await page.getByText('Prices and assumptions', { exact: true }).first().click();
      await expect(page.getByRole('button', { name: 'Add a model' })).toBeVisible();
      await page.getByRole('button', { name: 'Add a model' }).click();
      await page
        .getByLabel('Scenario name')
        .fill('A very long scenario name that keeps going and going');
      await page.getByRole('button', { name: 'Save scenario' }).click();
      await page
        .getByRole('button', { name: /^A very long scenario name/ })
        .first()
        .click();

      await expect(chart(page)).toBeVisible();
      await expect(page.locator('[data-sensitivity-map]')).toBeVisible();
      await expect(page.locator('[data-scenario-comparison]')).toBeVisible();
      expect(await horizontalOverflow(page)).toBe(0);

      // The chart and the map are drawn at the width they're shown at.
      const chartBox = await chart(page).boundingBox();
      expect(chartBox?.width).toBeLessThanOrEqual(360);
      // The tables scroll inside their own regions, which are keyboard reachable.
      for (const name of ['Destinations', 'Model prices', 'Scenario comparison']) {
        const region = page.getByRole('region', { name, exact: true });
        await expect(region).toHaveAttribute('tabindex', '0');
        const box = await region.boundingBox();
        expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(360);
      }
    });
  }

  for (const colorScheme of ['light', 'dark'] as const) {
    test(`tooltips stay inside the page in ${colorScheme} mode`, async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 800 });
      await page.emulateMedia({ colorScheme });
      await open(page);

      // On a phone both plots leave 56 px on the left for the axis and 14 px on the right. The
      // tooltip stays between them, so it never covers the tick labels or the axis title.
      const LEFT_INSET = 56;
      const RIGHT_INSET = 14;

      const insideViewport = async (tooltip: Locator, container: Locator): Promise<void> => {
        await expect(tooltip).toBeVisible();
        const tooltipBox = await tooltip.boundingBox();
        const containerBox = await container.boundingBox();

        expect(tooltipBox!.x).toBeGreaterThanOrEqual(containerBox!.x + LEFT_INSET - 0.5);
        expect(tooltipBox!.x + tooltipBox!.width).toBeLessThanOrEqual(
          containerBox!.x + containerBox!.width - RIGHT_INSET + 0.5,
        );
        expect(await horizontalOverflow(page)).toBe(0);
      };

      const plot = chart(page);
      await plot.scrollIntoViewIfNeeded();
      const plotBox = (await plot.boundingBox())!;

      for (const share of [0.02, 0.1, 0.2, 0.4, 0.5, 0.58, 0.7, 0.9, 0.98]) {
        await page.mouse.move(plotBox.x + plotBox.width * share, plotBox.y + plotBox.height * 0.4);
        await insideViewport(page.locator('[data-chart-tooltip]'), plot);
      }
      await page.mouse.move(0, 0);

      // The keyboard cursor too, from the middle of the plot outwards.
      await plot.focus();
      for (const key of ['ArrowLeft', 'ArrowLeft', 'Home', 'ArrowRight', 'End']) {
        await page.keyboard.press(key);
        await insideViewport(page.locator('[data-chart-tooltip]'), plot);
      }
      await plot.evaluate((element) => (element as HTMLElement).blur());

      const map = page.locator('[data-sensitivity-map]');
      await map.scrollIntoViewIfNeeded();
      const mapBox = (await map.boundingBox())!;

      // On a phone the map's plot starts 56 px from the left and 12 px from the top, and leaves
      // 14 px on the right and 58 px at the bottom for the axes.
      const plotWidth = mapBox.width - 56 - 14;
      const plotHeight = mapBox.height - 12 - 58;

      for (const share of [0.02, 0.2, 0.4, 0.5, 0.6, 0.8, 0.98]) {
        for (const height of [0.1, 0.5, 0.9]) {
          await page.mouse.move(
            mapBox.x + 56 + plotWidth * share,
            mapBox.y + 12 + plotHeight * height,
          );
          await insideViewport(page.locator('[data-map-tooltip]'), map);
        }
      }
      await page.mouse.move(0, 0);

      await map.focus();
      for (const key of ['ArrowLeft', 'ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowRight']) {
        await page.keyboard.press(key);
        await insideViewport(page.locator('[data-map-tooltip]'), map);
      }
      await page.keyboard.press('Shift+ArrowLeft');
      await insideViewport(page.locator('[data-map-tooltip]'), map);
    });
  }

  test('the chart text stays legible and the you-are-here dot is in view', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await open(page);

    const dot = page.locator('[data-chart-mark="you-are-here"]');
    await expect(dot).toBeVisible();
    const box = await dot.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(360);
  });
});
