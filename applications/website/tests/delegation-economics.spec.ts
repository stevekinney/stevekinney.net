import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { openExperiment } from './helpers/open-experiment';

// The fixtures are a synthetic Claude Code session: a main thread and three
// subagents whose first responses had 12,002, 24,000, and 41,000 tokens in
// context. One subagent's first response streams across two lines, and one
// file ends with a line cut off mid-write.
const fixture = (name: string): string =>
  fileURLToPath(new URL(`./fixtures/delegation-economics/${name}`, import.meta.url));

const subagentFiles = ['alpha', 'beta', 'gamma'].map((name) =>
  fixture(`session/subagents/agent-${name}.jsonl`),
);

const path = '/experiments/delegation-economics';

const open = async (page: Page, hash = ''): Promise<void> => {
  await openExperiment(page, `${path}${hash}`);
};

const results = (page: Page): Locator => page.getByTestId('results');
const wallClock = (page: Page): Locator => page.getByTestId('wall-clock-tile');
const tokens = (page: Page): Locator => page.getByTestId('tokens-tile');
const cost = (page: Page): Locator => page.getByTestId('cost-tile');
const chart = (page: Page): Locator => page.getByTestId('speedup-chart');
const verdict = (page: Page): Locator => page.getByTestId('verdict');
const field = (page: Page, id: string): Locator => page.locator(`#${id}`);
const calibrationZone = (page: Page): Locator =>
  page.getByRole('group', { name: 'Calibrate from real sessions' });

const horizontalOverflow = (page: Page): Promise<number> =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

const skipPrediction = async (page: Page): Promise<void> => {
  await page.getByRole('button', { name: 'Just show me' }).click();
  await expect(results(page)).toBeVisible();
};

const choosePreset = async (page: Page, name: string): Promise<void> => {
  await page.getByRole('group', { name: 'Presets' }).getByRole('button', { name }).click();
};

test.describe('predict first', () => {
  test('describes the scenario and hides every result until the guess', async ({ page }) => {
    await open(page);

    await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toHaveText(
      'Should I fan out?',
    );
    await expect(page.getByTestId('scenario-words')).toHaveText(
      '60 minutes of work, 40% of it serial, 4 workers.',
    );
    await expect(page.getByTestId('predict-card')).toContainText('Predict first');
    await expect(results(page)).toHaveCount(0);
    await expect(chart(page)).toHaveCount(0);
    await expect(verdict(page)).toHaveCount(0);
  });

  test('reveals the answer beside the guess, with the gap', async ({ page }) => {
    await open(page);
    await page.getByLabel('Your guess for the speedup').fill('3x');
    await page.getByRole('button', { name: 'Reveal the answer' }).click();

    await expect(page.getByTestId('prediction-result')).toHaveText(
      'You guessed 3×. The answer is 1.33×, so your guess was 1.67 too high.',
    );
    await expect(wallClock(page)).toContainText('45 min vs 60 solo (1.33× faster)');
  });

  test('asks again for a guess it can’t read', async ({ page }) => {
    await open(page);
    await page.getByLabel('Your guess for the speedup').fill('pretty fast');
    await page.getByRole('button', { name: 'Reveal the answer' }).click();

    await expect(page.getByText('Enter a speedup such as 2 or 1.5×.')).toBeVisible();
    await expect(results(page)).toHaveCount(0);
  });

  test('skips the guess with Just show me, and Predict again hides the results', async ({
    page,
  }) => {
    await open(page);
    await skipPrediction(page);

    await expect(page.getByTestId('prediction-result')).toHaveText(
      'You skipped the guess. The results are below.',
    );
    await page.getByRole('button', { name: 'Predict again' }).click();
    await expect(results(page)).toHaveCount(0);
  });
});

test.describe('the defaults', () => {
  test('show the specification’s three results and the best worker count', async ({ page }) => {
    await open(page);
    await skipPrediction(page);

    await expect(wallClock(page)).toContainText('45 min vs 60 solo (1.33× faster)');
    await expect(wallClock(page)).toContainText(
      '40% of the work is serial, so 4 workers top out at 1.82×. Integrating 4 reports adds 12 min.',
    );
    await expect(tokens(page)).toContainText('608K vs 370K (1.64×)');
    await expect(cost(page)).toContainText('$1.38 vs $0.90');
    await expect(cost(page)).not.toHaveAttribute('data-warning');
    await expect(page.getByTestId('best-workers')).toContainText(
      'Fastest at 3 or 4 workers (45 min): the fourth worker buys nothing. Treating workers as continuous, the optimum is 3.46.',
    );
    await expect(page.getByTestId('best-workers')).toContainText('never faster than 2.5×');
    await expect(page.getByTestId('ceiling-label')).toHaveText('never faster than 2.5×');
  });

  test('costs $1.28 when the workers share a cached prefix', async ({ page }) => {
    await open(page);
    await skipPrediction(page);
    await page.getByRole('checkbox', { name: 'Workers share a cached prefix' }).check();

    // The first worker writes 20K at the $2.50 cache-write price; the other three read 60K at $0.20.
    await expect(cost(page)).toContainText('$1.28 vs $0.90');
    await expect(cost(page)).toContainText('3 workers read their spawn overhead from the cache.');
  });

  test('draws the shared context once per worker', async ({ page }) => {
    await open(page);
    await skipPrediction(page);

    await expect(page.getByTestId('fan-bar').locator('[data-part="shared"]')).toHaveCount(4);
    await expect(page.getByTestId('solo-bar').locator('[data-part="shared"]')).toHaveCount(1);
    await expect(page.getByTestId('fan-bar')).toContainText(
      'Spawn overhead 80K, Shared context 200K (4 × 50K), Unique work 300K, Reports 8K, Output 20K',
    );
  });

  test('has a labeled control for every input', async ({ page }) => {
    await open(page);

    for (const name of [
      'Solo duration (minutes)',
      'Serial fraction',
      'Workers',
      'Integration per worker (minutes)',
      'Spawn overhead per worker',
      'Shared context every worker reads',
      'Unique work input',
      'Output per worker',
      'Report each worker returns',
    ]) {
      await expect(page.getByRole('slider', { name, exact: true })).toBeVisible();
      await expect(page.getByRole('textbox', { name, exact: true })).toBeVisible();
    }
    await expect(page.getByRole('combobox', { name: 'Worker model' })).toHaveValue(
      'claude-sonnet-5-5',
    );
    await expect(page.locator('#mode-subagents')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#spawn-tokens-hint')).toContainText('somewhere around 7.5k–44k');
  });
});

test.describe('presets', () => {
  test('Four reviewers, one monorepo asks for a new guess, then shows 3.6× the tokens', async ({
    page,
  }) => {
    await open(page);
    await page.getByLabel('Your guess for the speedup').fill('2');
    await page.getByRole('button', { name: 'Reveal the answer' }).click();
    await expect(results(page)).toBeVisible();

    await choosePreset(page, 'Four reviewers, one monorepo');
    await expect(results(page)).toHaveCount(0);
    await expect(page.getByTestId('scenario-words')).toHaveText(
      '60 minutes of work, 10% of it serial, 4 workers.',
    );

    await page.getByLabel('Your guess for the speedup').fill('3.5');
    await page.getByRole('button', { name: 'Reveal the answer' }).click();
    await expect(page.getByTestId('prediction-result')).toHaveText(
      'You guessed 3.5×. The answer is 1.52×, so your guess was 1.98 too high.',
    );
    await expect(wallClock(page)).toContainText('39.5 min vs 60 solo (1.52× faster)');
    await expect(tokens(page)).toContainText('948K vs 260K (3.65×)');
  });

  test('Fan out the serial thing tops out at 1.21× and warns that it’s slower', async ({
    page,
  }) => {
    await open(page);
    await skipPrediction(page);
    await choosePreset(page, 'Fan out the serial thing');

    // Having skipped once, presets don't ask again.
    await expect(results(page)).toBeVisible();
    await expect(wallClock(page)).toContainText('8 workers top out at 1.21×');
    await expect(wallClock(page)).toContainText('73.5 min vs 60 solo (1.23× slower)');
    await expect(cost(page)).toHaveAttribute('data-warning', 'true');
    await expect(cost(page)).toContainText('Warning: slower than one session');
    // The tile itself turns amber, not just its text.
    const [warningBorder, plainBorder] = await Promise.all(
      [cost(page), tokens(page)].map((tile) =>
        tile.evaluate((element) => getComputedStyle(element).borderTopColor),
      ),
    );
    expect(warningBorder).not.toBe(plainBorder);
    await expect(
      page.getByRole('checkbox', { name: /Integration costs exceed parallel savings/ }),
    ).toBeChecked();
    await expect(verdict(page)).toContainText(
      'Don’t fan out: integration eats the parallel savings. 8 workers take 73.5 min against 60 min solo.',
    );
  });

  test('Ten independent files is a good fit', async ({ page }) => {
    await open(page);
    await skipPrediction(page);
    await choosePreset(page, 'Ten independent files');

    await expect(wallClock(page)).toContainText('31.8 min vs 60 solo (1.89× faster)');
    await expect(tokens(page)).toContainText('560K vs 430K (1.3×)');
    await expect(cost(page)).not.toHaveAttribute('data-warning');
    await expect(verdict(page)).toContainText('Nothing on the checklist rules it out.');
  });

  test('Incident triage team shows the field report as cited, not computed', async ({ page }) => {
    await open(page);
    await skipPrediction(page);
    await choosePreset(page, 'Incident triage team');

    const anecdote = page.getByTestId('preset-anecdote');
    await expect(anecdote).toContainText('Cited, not computed');
    await expect(anecdote).toContainText('about 10 minutes instead of 30–45 working solo');
    await expect(anecdote).toContainText('$8–10 instead of $2–3');
    await expect(page.locator('#mode-team')).toHaveAttribute('aria-pressed', 'true');
    await expect(wallClock(page)).toContainText('Wall-clock (assumed similar)');
    await expect(tokens(page)).toContainText('(3.5×)');
  });
});

test.describe('the checklist and team warnings', () => {
  test('an unresolved shared interface says don’t fan out yet, whatever the numbers say', async ({
    page,
  }) => {
    await open(page);
    await skipPrediction(page);
    await choosePreset(page, 'Ten independent files');
    await page.getByRole('checkbox', { name: 'The shared interface is unresolved.' }).check();

    await expect(verdict(page)).toContainText(
      'Don’t fan out yet: resolve the shared interface first. Otherwise workers implement against an imagined contract and the coordinator rewrites everything.',
    );
  });

  test('warns when a team has more than 16 teammates', async ({ page }) => {
    await open(page);
    await skipPrediction(page);
    await page.locator('#mode-plan').click();
    await field(page, 'workers').fill('17');

    await expect(page.getByText(/agent teams are recommended at three to five/)).toBeVisible();
    await expect(tokens(page)).toContainText('(7×)');
  });

  test('treats one worker as the solo session', async ({ page }) => {
    await open(page);
    await skipPrediction(page);
    await field(page, 'workers').fill('1');

    await expect(wallClock(page)).toContainText('60 min vs 60 solo (no faster)');
    await expect(tokens(page)).toContainText('355K vs 355K (1×)');
    await expect(verdict(page)).toContainText('One worker is the solo session');
  });

  test('doesn’t promise extra workers help when all the work is serial', async ({ page }) => {
    await open(page);
    await skipPrediction(page);
    await field(page, 'serial-fraction').fill('100%');
    await field(page, 'integration-minutes').fill('0');

    await expect(page.getByTestId('best-workers')).toContainText(
      'Every worker count from 1 to 32 takes the same time',
    );
    await expect(page.getByTestId('best-workers')).not.toContainText('every added worker helps');
  });

  test('copes with every input at zero', async ({ page }) => {
    await open(page);
    await skipPrediction(page);
    for (const id of [
      'solo-minutes',
      'serial-fraction',
      'integration-minutes',
      'spawn-tokens',
      'shared-tokens',
      'unique-tokens',
      'output-tokens',
      'report-tokens',
    ]) {
      await field(page, id).fill('');
    }

    await expect(wallClock(page)).toContainText('0 min vs 0 solo (no work to speed up)');
    await expect(cost(page)).toContainText('$0.00 vs $0.00');
    await expect(page.getByTestId('ceiling-label')).toHaveText('No serial work, so no ceiling');
  });
});

test.describe('the speedup chart', () => {
  test('shows time, speedup, tokens, and cost on keyboard focus, and Enter sets n', async ({
    page,
  }) => {
    await open(page);
    await skipPrediction(page);

    await chart(page).focus();
    const tooltip = page.getByTestId('chart-tooltip');
    await expect(tooltip).toContainText('4 workers');
    await expect(tooltip).toContainText('45 min');
    await expect(tooltip).toContainText('1.33×');
    await expect(tooltip).toContainText('608K');
    await expect(tooltip).toContainText('$1.38');

    await page.keyboard.press('ArrowLeft');
    await expect(tooltip).toContainText('3 workers');
    await page.keyboard.press('Enter');
    await expect(field(page, 'workers')).toHaveValue('3');
    await expect(wallClock(page)).toContainText('45 min vs 60 solo (1.33× faster)');
  });

  test('sets n where it’s clicked', async ({ page }) => {
    await open(page);
    await skipPrediction(page);
    await chart(page).scrollIntoViewIfNeeded();
    const box = (await chart(page).boundingBox())!;

    // The plot's margins narrow below 520 pixels.
    const [left, right] = box.width < 520 ? [40, 12] : [48, 20];
    await page.mouse.click(box.x + left + (box.width - left - right) * (7 / 31), box.y + 120);
    await expect(field(page, 'workers')).toHaveValue('8');
    await expect(page.getByTestId('chart-tooltip')).toContainText('8 workers');
  });

  test('has the same numbers as a table', async ({ page }) => {
    await open(page);
    await skipPrediction(page);
    await page.getByText('The curve as a table').click();

    const table = page.getByRole('region', { name: 'Speedup curve table' });
    await expect(table.getByRole('row')).toHaveCount(33);
    await expect(table.getByRole('row', { name: /^4 \(current\)/ })).toContainText('1.82×');
  });
});

test.describe('calibrating from real sessions', () => {
  test('measures each subagent’s first response from chosen files', async ({ page }) => {
    const requests: string[] = [];
    page.on('request', (request) => requests.push(request.url()));
    await open(page);
    await expect(calibrationZone(page)).toBeVisible();
    const before = requests.length;

    await calibrationZone(page)
      .locator('input[type="file"]')
      .first()
      .setInputFiles([fixture('session/main.jsonl'), ...subagentFiles]);

    const summary = page.getByTestId('calibration-summary');
    await expect(summary).toBeVisible();
    await expect(page.getByTestId('spawn-median')).toHaveText('24K');
    await expect(page.getByTestId('spawn-range')).toHaveText('12K to 41K');
    await expect(page.getByTestId('skipped-lines')).toHaveText('1');

    await summary.getByRole('button', { name: 'Use 24K as the spawn overhead' }).click();
    await expect(field(page, 'spawn-tokens')).toHaveValue('24K');
    await expect(page.locator('label[for="spawn-tokens"]')).toContainText(
      'measured from your sessions',
    );
    expect(requests.slice(before).filter((url) => !url.includes('127.0.0.1'))).toEqual([]);
  });

  test('measures pasted lines too', async ({ page }) => {
    await open(page);
    const pasted = [
      readFileSync(subagentFiles[0], 'utf8'),
      readFileSync(subagentFiles[2], 'utf8'),
    ].join('\n');

    await page.getByLabel('Or paste transcript lines').fill(pasted);
    await page.getByRole('button', { name: 'Measure pasted lines' }).click();

    await expect(page.getByTestId('spawn-median')).toHaveText('26.5K');
    await expect(page.getByTestId('spawn-range')).toHaveText('12K to 41K');
  });

  test('says where subagent transcripts live when given only the main session', async ({
    page,
  }) => {
    await open(page);
    await expect(calibrationZone(page)).toBeVisible();
    await calibrationZone(page)
      .locator('input[type="file"]')
      .first()
      .setInputFiles(fixture('session/main.jsonl'));

    await expect(page.getByRole('alert')).toContainText('That has no subagent responses.');
    await expect(page.getByTestId('calibration-summary')).toHaveCount(0);
  });

  test('says beside every upload and paste that nothing leaves the page', async ({ page }) => {
    await open(page);

    await expect(calibrationZone(page)).toContainText('nothing is sent anywhere');
    await expect(
      page.getByText('Pasted text is read in this tab and never sent anywhere.'),
    ).toBeVisible();
  });
});

test.describe('compare, share, and prices', () => {
  test('pins plan A and shows the change to plan B', async ({ page }) => {
    await open(page);
    await skipPrediction(page);
    await page.getByRole('button', { name: 'Pin as plan A' }).click();
    await field(page, 'workers').fill('8');

    const comparison = page.getByTestId('plan-comparison');
    await expect(comparison.getByRole('row', { name: /Wall-clock/ })).toContainText(
      '45 min52.5 min+7.5 min (worse)',
    );
    await expect(comparison.getByRole('row', { name: /Tokens/ })).toContainText('608K');
  });

  test('copies a Markdown summary with the inputs, results, and verdict', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await open(page);
    await skipPrediction(page);
    await page.getByRole('button', { name: 'Copy summary' }).click();

    await expect(page.getByText('Summary copied as Markdown.')).toBeVisible();
    const text = await page.evaluate(() => navigator.clipboard.readText());
    expect(text).toContain('# Should I fan out?');
    expect(text).toContain('- Workers: 4');
    expect(text).toContain('- Wall-clock: 45 min vs 60 solo (1.33× faster)');
    expect(text).toContain('- Tokens: 608K vs 370K (1.64×)');
    expect(text).toContain('- Cost: $1.38 vs $0.90');
    expect(text).toContain('## Verdict');
  });

  test('copies a link that reopens the same scenario', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await open(page);
    await skipPrediction(page);
    await choosePreset(page, 'Four reviewers, one monorepo');
    await page.getByRole('button', { name: 'Copy link' }).click();

    const link = await page.evaluate(() => navigator.clipboard.readText());
    expect(new URL(link).hash).toContain('shared=200000');

    const fresh = await context.newPage();
    await openExperiment(fresh, link);
    await expect(fresh.getByTestId('tokens-tile')).toContainText('948K vs 260K (3.65×)');
  });

  test('prices from the shared table, and edits change the cost', async ({ page }) => {
    await open(page);
    await skipPrediction(page);
    await page.getByTestId('price-table').locator('summary').click();
    await expect(page.getByTestId('price-table')).toContainText('Claude Sonnet 5.5');

    const sonnetInput = page.getByRole('textbox', {
      name: 'Input price of Claude Sonnet 5.5',
      exact: true,
    });
    await expect(sonnetInput).toHaveValue('2');
    await sonnetInput.fill('4');
    await expect(cost(page)).toContainText('$2.55 vs $1.60');

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Export JSON' }).click(),
    ]);
    expect(download.suggestedFilename()).toBe('delegation-economics-prices.json');
    const exported = JSON.parse(readFileSync((await download.path())!, 'utf8'));
    expect(exported.models).toContainEqual({
      id: 'claude-sonnet-5-5',
      name: 'Claude Sonnet 5.5',
      input: 4,
      cachedInput: 0.2,
      cacheWrite5m: 2.5,
      output: 10,
    });
  });

  test('counts 84 workers for 4 children across 3 layers', async ({ page }) => {
    await open(page);

    await expect(page.getByTestId('nesting-total')).toHaveText('4 + 16 + 64 = 84 workers');
    await expect(page.getByText('64 of them wait their turn')).toBeVisible();
    await page.getByLabel('Layers').fill('2');
    await expect(page.getByTestId('nesting-total')).toHaveText('4 + 16 = 20 workers');
  });
});

for (const colorScheme of ['light', 'dark'] as const) {
  test(`fits 360 pixels in ${colorScheme} mode with the chart tooltip hovered and focused`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.emulateMedia({ colorScheme });
    await open(page);
    await skipPrediction(page);
    await page.getByText('The curve as a table').click();

    await chart(page).scrollIntoViewIfNeeded();
    const box = (await chart(page).boundingBox())!;
    const tooltip = page.getByTestId('chart-tooltip');

    for (const fraction of [0.02, 0.5, 0.98]) {
      await page.mouse.move(box.x + box.width * fraction, box.y + 120);
      await expect(tooltip).toBeVisible();
      const placed = (await tooltip.boundingBox())!;
      expect(placed.x).toBeGreaterThanOrEqual(0);
      expect(placed.x + placed.width).toBeLessThanOrEqual(360);
      expect(await horizontalOverflow(page)).toBe(0);
    }

    await page.mouse.move(0, 0);
    await chart(page).focus();
    await page.keyboard.press('End');
    await expect(tooltip).toContainText('32 workers');
    const focused = (await tooltip.boundingBox())!;
    expect(focused.x + focused.width).toBeLessThanOrEqual(360);
    expect(await horizontalOverflow(page)).toBe(0);
  });
}

for (const colorScheme of ['light', 'dark'] as const) {
  test(`fits 360 pixels in ${colorScheme} mode with a long model name from a shared link`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.emulateMedia({ colorScheme });
    const name = 'x'.repeat(60);
    await open(
      page,
      `#model=custom-model&name=${name}&inputPrice=2&cachedPrice=0.2&outputPrice=10`,
    );

    await expect(cost(page)).toContainText(name);
    expect(await horizontalOverflow(page)).toBe(0);
  });
}

test.describe('keyboard focus', () => {
  test('moves focus to the answer after a reveal or a skip, and back to the guess after', async ({
    page,
  }) => {
    await open(page);
    await page.getByLabel('Your guess for the speedup').fill('3x');
    await page.getByRole('button', { name: 'Reveal the answer' }).click();
    await expect(page.getByRole('region', { name: 'Your prediction' })).toBeFocused();

    await page.getByRole('button', { name: 'Predict again' }).click();
    await expect(page.getByLabel('Your guess for the speedup')).toBeFocused();

    await skipPrediction(page);
    await expect(page.getByRole('region', { name: 'Your prediction' })).toBeFocused();
  });
});
