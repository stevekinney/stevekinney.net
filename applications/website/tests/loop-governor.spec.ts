import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { fileURLToPath } from 'node:url';

import { openExperiment } from './helpers/open-experiment';

// The loop logs are synthetic. `flat-from-15.jsonl` improves its score on every
// iteration through 14 and is flat from 15; `renamed-fields.jsonl` uses other
// field names, a nested running-total cost, and has a line cut off mid-write;
// `no-score.jsonl` has only `kept`. The transcript is the model calculator's
// synthetic Claude Code session.
const fixture = (path: string): string =>
  fileURLToPath(new URL(`./fixtures/${path}`, import.meta.url));

const path = '/experiments/loop-governor';

const open = async (page: Page, hash = ''): Promise<void> => {
  await openExperiment(page, `${path}${hash}`);
};

const reveal = async (page: Page): Promise<void> => {
  await page.getByRole('button', { name: 'Lock in my guess and show the answer' }).click();
  await expect(page.getByTestId('prediction-result')).toBeVisible();
};

const showResults = async (page: Page): Promise<void> => {
  await page.getByRole('button', { name: 'Skip the prediction and show the results' }).click();
  await expect(outcomes(page)).toBeVisible();
};

const outcomes = (page: Page, id = 'b'): Locator => page.getByTestId(`outcomes-${id}`);

const share = (page: Page, outcome: string, id = 'b'): Locator =>
  outcomes(page, id).locator(`[data-outcome-row="${outcome}"] td`).nth(1);

const runs = (page: Page, outcome: string, id = 'b'): Locator =>
  outcomes(page, id).locator(`[data-outcome-row="${outcome}"] td`).nth(0);

const settled = async (page: Page, count = '1,000'): Promise<void> => {
  await expect(page.getByTestId('simulation-status')).toHaveText(new RegExp(`^${count} runs`));
};

const analytic = (page: Page, id: string): Locator => page.locator(`[data-analytic="${id}"] td`);

const preset = (page: Page, name: string): Locator =>
  page.getByRole('group', { name: 'Presets' }).getByRole('button', { name, exact: true });

const percent = (text: string | null): number => Number(text?.replace('%', ''));

const horizontalOverflow = (page: Page): Promise<number> =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

const chooseLog = (page: Page, file: string): Promise<void> =>
  page
    .getByRole('group', { name: 'Drop a loop log here' })
    .locator('input[type="file"]')
    .first()
    .setInputFiles(fixture(file));

test.describe('predict first', () => {
  test('hides the results until the guess is locked in, then shows both side by side', async ({
    page,
  }) => {
    await open(page);

    await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toHaveText(
      'Will your agent loop stop honestly?',
    );
    await expect(page.getByRole('heading', { name: 'How the runs ended' })).toHaveCount(0);
    await expect(page.getByTestId('cost-chart')).toHaveCount(0);
    await expect(page.getByTestId('timeline')).toHaveCount(0);

    await page.locator('#prediction').fill('5');
    await expect(page.getByText('Your guess: 5%')).toBeVisible();
    await reveal(page);

    const result = page.getByTestId('prediction-result');
    await expect(result).toContainText('5%');
    await expect(result).toContainText('Exactly, it’s 21.8%.');
    await expect(result).toContainText('You guessed low');
    await expect(page.locator('#prediction')).toBeDisabled();
    await expect(page.getByRole('heading', { name: 'How the runs ended' })).toBeVisible();
    await expect(page.getByTestId('cost-chart')).toBeVisible();
  });

  test('can be skipped', async ({ page }) => {
    await open(page);
    await showResults(page);

    await expect(page.getByTestId('prediction-result')).toHaveCount(0);
    await expect(page.getByTestId('timeline')).toBeVisible();
  });
});

test.describe('the defaults', () => {
  test('start on the promise-string preset with about 22% falsely done', async ({ page }) => {
    await open(page);
    await showResults(page);
    await settled(page);

    await expect(preset(page, 'Promise string, no governors')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(Math.abs(percent(await share(page, 'done-false').textContent()) - 21.8)).toBeLessThan(3);
    await expect(analytic(page, 'false-done').nth(1)).toHaveText('21.8%');
    await expect(page.getByTestId('job-governor')).toHaveText(/Nothing: this is on you\./);
  });

  test('state the crossover and the specification’s cumulative costs', async ({ page }) => {
    await open(page);
    await showResults(page);

    await expect(page.getByTestId('crossover')).toHaveText(
      'From iteration 4 on, fresh context is cheaper in total, because n > 2r/g + 1 = 3.5.',
    );
    const table = page.getByTestId('cost-comparison');
    for (const [n, fresh, accumulating] of [
      [3, '$1.20', '$1.14'],
      [4, '$1.60', '$1.68'],
      [5, '$2.00', '$2.30'],
    ] as const) {
      const row = table.locator(`[data-iterations="${n}"] td`);
      await expect(row.nth(0)).toHaveText(fresh);
      await expect(row.nth(1)).toHaveText(accumulating);
    }
  });

  test('marks the median, 95th percentile, and maximum on the cost histogram', async ({ page }) => {
    await open(page);
    await showResults(page);

    const chart = page.getByTestId('cost-chart');
    await expect(chart.locator('svg text', { hasText: /^median \$/ })).toHaveCount(1);
    await expect(chart.locator('svg text', { hasText: /^95th \$/ })).toHaveCount(1);
    await expect(chart.locator('svg text', { hasText: /^max \$/ })).toHaveCount(1);
  });
});

test.describe('the presets', () => {
  test('count the type errors with the compiler missing, then fail closed', async ({ page }) => {
    await open(page);
    await showResults(page);
    await preset(page, 'Count the type errors, compiler missing').click();
    await settled(page);

    await expect(page.getByTestId('preset-notice')).toContainText('A missing compiler');
    await expect(analytic(page, 'first-iteration-throw').nth(1)).toHaveText('20.0%');
    const thrown = percent(await analytic(page, 'first-iteration-throw').nth(2).textContent());
    expect(Math.abs(thrown - 20)).toBeLessThan(4);
    await expect(runs(page, 'broken')).toHaveText('0');

    await page.locator('#failure-mode-closed').click();
    await settled(page);

    // Fail-closed turns the first-iteration throws into broken runs. Later throws add more.
    await expect(share(page, 'done-false')).toHaveText('0.0%');
    await expect(page.locator('[data-analytic="first-iteration-throw"] th')).toHaveText(
      'Broken on iteration 1 because the measurement threw',
    );
    expect(
      Math.abs(percent(await analytic(page, 'first-iteration-throw').nth(2).textContent()) - 20),
    ).toBeLessThan(4);
    expect(percent(await share(page, 'broken').textContent())).toBeGreaterThan(20);
    await expect(preset(page, 'Count the type errors, compiler missing')).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  test('an impossible task cheats less with an honest way out', async ({ page }) => {
    await open(page);
    await showResults(page);
    await preset(page, 'Impossible task').click();
    await settled(page);

    await expect(page.locator('#progress-p')).toBeDisabled();
    await expect(runs(page, 'done-honest')).toHaveText('0');
    expect(Math.abs(percent(await share(page, 'done-false').textContent()) - 54)).toBeLessThan(5);
    await expect(page.getByText(/cut cheating from 54% to 9%/)).toBeVisible();

    await page.getByLabel('Give the agent an honest way out (BLOCKED)').check();
    await settled(page);

    expect(Math.abs(percent(await share(page, 'done-false').textContent()) - 9)).toBeLessThan(4);
    expect(percent(await share(page, 'blocked').textContent())).toBeGreaterThan(85);
  });

  test('the overnight loop grows its context with no budget', async ({ page }) => {
    await open(page);
    await showResults(page);
    await preset(page, 'Overnight in-session loop').click();
    await settled(page);

    await expect(page.locator('#context-accumulating')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#governor-budget')).not.toBeChecked();
    await expect(page.getByTestId('preset-notice')).toContainText('A schedule is not a budget.');
  });

  test('the well-governed loop never ends falsely done and counts the claims it caught', async ({
    page,
  }) => {
    await open(page);
    await showResults(page);
    await preset(page, 'Well-governed external loop').click();
    await settled(page);

    await expect(share(page, 'done-false')).toHaveText('0.0%');
    await expect(page.getByTestId('premature-claims')).toContainText(
      /The dual condition caught [\d,]+ premature claims/,
    );
    await expect(page.locator('#dual-condition')).toBeChecked();
    await expect(page.locator('#governor-stall')).toBeChecked();
    await expect(page.locator('#governor-budget')).toBeChecked();
    await expect(page.locator('#context-fresh')).toHaveAttribute('aria-pressed', 'true');
  });
});

test.describe('the controls', () => {
  test('turning on the dual condition makes false done 0%', async ({ page }) => {
    await open(page);
    await showResults(page);
    await page.getByLabel('Dual condition').check();
    await settled(page);

    await expect(share(page, 'done-false')).toHaveText('0.0%');
    await expect(share(page, 'done-honest')).toHaveText('100.0%');
    await expect(page.getByTestId('premature-claims')).toBeVisible();
  });

  test('an impossible task with a stall detector of 3 stops every run at 3', async ({ page }) => {
    await open(page);
    await showResults(page);
    await page.locator('#progress-p').fill('0');
    await page.locator('#ladder-q-promise-string').fill('0');
    await page.getByLabel('Stall detector').check();
    await settled(page);

    await expect(share(page, 'stopped')).toHaveText('100.0%');
    await expect(outcomes(page)).toContainText('Stopped by: stall detector 1,000.');

    await page.getByLabel('Stall detector').uncheck();
    await settled(page);
    await expect(share(page, 'runaway')).toHaveText('100.0%');
  });

  test('clicking a rung of the marker ladder makes it the oracle', async ({ page }) => {
    await open(page);
    await page
      .getByRole('button', { name: /Files on disk plus tests the agent can’t edit/ })
      .click();

    await expect(page.locator('#marker')).toHaveValue('locked-tests');
    await expect(page.getByTestId('job-oracle')).toContainText('Files on disk');
  });

  test('warns when the budget is smaller than one iteration', async ({ page }) => {
    await open(page);
    await page.getByLabel('Budget', { exact: true }).check();
    await page.locator('#budget').fill('0.25');

    await expect(
      page.getByText('The budget is less than one iteration’s $0.40, so every run stops'),
    ).toBeVisible();
  });

  test('runs 10,000 runs and says so', async ({ page }) => {
    await open(page);
    await showResults(page);
    await page.locator('#runs').fill('10000');

    await settled(page, '10,000');
  });

  test('prices an iteration from the shared model table', async ({ page }) => {
    await open(page);
    await page.getByText('Price an iteration from a model').click();

    await expect(page.locator('#pricing-model')).toHaveValue('claude-opus-5-5');
    await expect(page.getByTestId('priced-iteration')).toHaveText(
      'c₀ = $0.30, r = $0.10, g = $0.08',
    );
    await page.locator('#pricing-model').selectOption('claude-sonnet-5-5');
    await page.getByRole('button', { name: 'Use these costs' }).click();
    await expect(page.locator('#cost-c0')).toHaveValue('0.15');
  });
});

test.describe('the animated run', () => {
  test('a touched stop file stops the run only when the loop checks it', async ({ page }) => {
    await open(page);
    await showResults(page);
    await page.locator('#progress-p').fill('0');
    await page.locator('#ladder-q-promise-string').fill('0');
    // A configuration change restarts the sample run, so wait for it to settle before stepping.
    const settled = async (): Promise<void> => {
      await expect(page.getByTestId('simulation-status')).not.toContainText('Simulating');
      await expect(page.getByTestId('timeline').locator('li')).toHaveCount(0);
    };
    await settled();

    await page.getByRole('button', { name: 'Step', exact: true }).click();
    await page.getByRole('button', { name: 'Step', exact: true }).click();
    await expect(page.getByTestId('timeline').locator('li')).toHaveCount(2);
    await page.getByRole('button', { name: 'Touch STOP' }).click();
    await expect(page.getByTestId('stop-ignored')).toBeVisible();

    await page.getByLabel('Stop file').check();
    await settled();
    await page.getByRole('button', { name: 'Step', exact: true }).click();
    await expect(page.getByTestId('timeline').locator('li')).toHaveCount(1);
    await page.getByRole('button', { name: 'Touch STOP' }).click();

    await expect(page.getByTestId('timeline-status')).toHaveText(
      'This run ended stopped by the stop file after 1 iteration, costing $0.40.',
    );
  });

  test('plays and pauses', async ({ page }) => {
    await open(page);
    await showResults(page);
    await page.locator('#progress-p').fill('0.05');
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
    await expect(page.getByTestId('timeline').locator('li').first()).toBeVisible();
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
  });

  test('draws the whole run at once with reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page);
    await showResults(page);

    await expect(page.getByTestId('timeline-status')).toHaveText(/^This run ended /);
    await expect(page.getByTestId('timeline').locator('li').last()).toHaveAttribute(
      'data-event',
      /done|false-claim/,
    );
    await expect(page.getByRole('button', { name: 'Replay', exact: true })).toBeDisabled();
  });
});

test.describe('replaying a loop log', () => {
  test('a stall detector of 3 stops a log flat from iteration 15 at iteration 17', async ({
    page,
  }) => {
    await open(page);
    await chooseLog(page, 'loop-governor/flat-from-15.jsonl');

    const counterfactuals = page.getByTestId('counterfactuals');
    await expect(counterfactuals).toContainText(
      'A stall detector of 3 stops this at iteration 17 and saves $17.85.',
    );
    await expect(counterfactuals).toContainText(
      'A repeated-failure check stops this at iteration 19',
    );
    await expect(page.getByText('24 iterations, $53.95 in total, 14 with progress.')).toBeVisible();
    await expect(
      page.getByText('Your log is read in your browser and never sent anywhere.'),
    ).toBeVisible();
  });

  test('maps renamed fields from pasted lines and reads a running total', async ({ page }) => {
    await open(page);
    const { readFileSync } = await import('node:fs');
    await page
      .getByLabel('Or paste the lines')
      .fill(readFileSync(fixture('loop-governor/renamed-fields.jsonl'), 'utf8'));
    await page.getByRole('button', { name: 'Replay the pasted lines' }).click();

    await expect(page.locator('#map-cost')).toHaveValue('usage.total_cost_usd');
    await expect(page.locator('#map-score')).toHaveValue('errors_remaining');
    await expect(page.getByLabel('A lower score is better')).toBeChecked();
    await expect(page.getByText('Skipped 1 line that wasn’t a JSON object.')).toBeVisible();

    const scope = page.getByRole('group', { name: 'The running total counts' });
    await expect(scope).toBeHidden();
    await page.getByLabel('The cost is a running total').check();
    await expect(scope.getByRole('button', { name: 'Across the whole log' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page.getByText('10 iterations, $5.00 in total, 4 with progress.')).toBeVisible();

    // Each iteration has its own session, so a per-session total reads each value whole.
    await scope.getByRole('button', { name: 'Per session' }).click();
    await expect(page.getByText('10 iterations, $27.50 in total, 4 with progress.')).toBeVisible();
  });

  test('gives only a lower bound per session when a cost row has no session ID', async ({
    page,
  }) => {
    await open(page);
    const lines = [
      { session_id: 'a', cost_usd: 1, kept: true },
      { session_id: 'b', cost_usd: 5, kept: true },
      { cost_usd: 2, kept: false },
      { session_id: 'a', cost_usd: 3, kept: false },
      { session_id: 'b', cost_usd: 6, kept: true },
      { session_id: 'a', cost_usd: 4, kept: true },
    ].map((line) => JSON.stringify(line));
    await page.getByLabel('Or paste the lines').fill(lines.join('\n'));
    await page.getByRole('button', { name: 'Replay the pasted lines' }).click();
    await page.getByLabel('The cost is a running total').check();
    await page
      .getByRole('group', { name: 'The running total counts' })
      .getByRole('button', { name: 'Per session' })
      .click();

    await expect(
      page.getByText('6 iterations, at least $10.00 in total, 4 with progress.'),
    ).toBeVisible();
    await expect(page.getByText(/Choose “Across the whole log” to read one/)).toBeVisible();
    const counterfactuals = page.getByTestId('counterfactuals');
    await expect(counterfactuals).toContainText(
      'A stall detector of 2 stops this at iteration 4, but 1 iteration with a cost has no session ID, so what it saves can’t be told, and it cuts off 2 later progress iterations.',
    );
    await expect(counterfactuals).toContainText('budget can’t be checked on this log');
    await expect(counterfactuals).not.toContainText('saves $');
  });

  test('shows rows without a score as unknown and a stall stop as only possible', async ({
    page,
  }) => {
    await open(page);
    const lines = [1, 2, 3, null, null, null, 3, 3].map((score) =>
      JSON.stringify({ cost_usd: 1, score }),
    );
    await page.getByLabel('Or paste the lines').fill(lines.join('\n'));
    await page.getByRole('button', { name: 'Replay the pasted lines' }).click();

    await expect(
      page.getByText('8 iterations, $8.00 in total, 3 with progress, 3 unknown.'),
    ).toBeVisible();
    await expect(page.getByText('Unknown: no readable score')).toBeVisible();
    await expect(page.getByTestId('counterfactuals')).toContainText(
      'A stall detector of 3 might stop this as early as iteration 6, but 3 iterations have no readable score, so it can’t tell.',
    );
  });

  test('says progress lost is uncertain when an unknown row follows the stop', async ({ page }) => {
    await open(page);
    const lines = [1, 2, 2, 2, null, 5].map((score) => JSON.stringify({ cost_usd: 1, score }));
    await page.getByLabel('Or paste the lines').fill(lines.join('\n'));
    await page.getByRole('button', { name: 'Replay the pasted lines' }).click();

    await expect(page.getByTestId('counterfactuals')).toContainText(
      'A stall detector of 2 stops this at iteration 4 and saves $2.00, and it might cut off up to 2 later progress iterations, but their progress is unknown, so it can’t tell exactly.',
    );
    await expect(
      page.getByText('Unknown: no readable score, or an improvement after one'),
    ).toBeVisible();
  });

  test('infers stalls from kept alone when the log has no score, and says so', async ({ page }) => {
    await open(page);
    await chooseLog(page, 'loop-governor/no-score.jsonl');

    await expect(page.getByText(/no score, so progress is inferred from kept alone/)).toBeVisible();
    await expect(page.getByTestId('counterfactuals')).toContainText(
      'A stall detector of 3 stops this at iteration 8',
    );
  });

  test('wraps a long file name at phone width, whether or not it reads', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await open(page);
    const name = `${'a'.repeat(150)}.jsonl`;
    const input = page
      .getByRole('group', { name: 'Drop a loop log here' })
      .locator('input[type="file"]')
      .first();

    await input.setInputFiles({ name, mimeType: 'text/plain', buffer: Buffer.from('not json\n') });
    await expect(page.getByRole('alert')).toContainText('has no lines that are JSON objects');
    expect(await horizontalOverflow(page)).toBe(0);

    const { readFileSync } = await import('node:fs');
    await input.setInputFiles({
      name,
      mimeType: 'text/plain',
      buffer: readFileSync(fixture('loop-governor/flat-from-15.jsonl')),
    });
    await expect(page.getByTestId('counterfactuals')).toBeVisible();
    expect(await horizontalOverflow(page)).toBe(0);
  });

  test('names a Claude Code transcript instead of replaying it', async ({ page }) => {
    await open(page);
    await chooseLog(page, 'model-calculator/claude-code-session.jsonl');

    await expect(page.getByTestId('transcript-note')).toContainText(
      'This looks like a Claude Code session transcript',
    );
  });
});

test.describe('sharing and comparing', () => {
  test('copies a link that restores the configuration and seed', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await open(page);
    await showResults(page);
    await page.getByLabel('Dual condition').check();
    await page.locator('#seed').fill('7');
    await settled(page);
    await page.getByRole('button', { name: 'Copy link' }).click();
    await expect(page.getByText(/^Link copied\./)).toBeVisible();

    const link = await page.evaluate(() => navigator.clipboard.readText());
    expect(link).toContain('/experiments/loop-governor#');

    await page.goto('about:blank');
    await openExperiment(page, link.slice(link.indexOf('/experiments/')));
    await expect(page.getByLabel('Dual condition')).toBeChecked();
    await expect(page.locator('#seed')).toHaveValue('7');
    await expect(outcomes(page)).toBeVisible();
  });

  test('copies a Markdown summary', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await open(page);
    await showResults(page);
    await settled(page);
    await page.getByRole('button', { name: 'Copy summary' }).click();
    await expect(page.getByText('Summary copied as Markdown.')).toBeVisible();

    const summary = await page.evaluate(() => navigator.clipboard.readText());
    expect(summary).toContain('# Loop Governor simulation');
    expect(summary).toContain('| Done (false) |');
    expect(summary).toContain('- False done before true done: 21.8% exact');
  });

  test('opens a shared runaway A at 10,000 runs without freezing the page', async ({
    page,
    browserName,
  }) => {
    // The Long Tasks API is Chromium-only, so other browsers would record nothing.
    test.skip(browserName !== 'chromium', 'The Long Tasks API is Chromium-only.');
    await page.addInitScript(() => {
      const durations: number[] = [];
      (window as unknown as { longTasks: number[] }).longTasks = durations;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) durations.push(entry.duration);
      }).observe({ type: 'longtask', buffered: true });
    });
    const runaway = 'p=0&n=10000&m=external&gv=';
    await open(page, `#${runaway}&a=${encodeURIComponent(runaway)}`);

    await expect(page.getByRole('heading', { name: 'A (pinned)' })).toHaveCount(2, {
      timeout: 60_000,
    });
    await settled(page, '10,000');
    await expect(share(page, 'runaway', 'a')).toHaveText('100.0%');

    const longest = await page.evaluate(() =>
      Math.max(0, ...(window as unknown as { longTasks: number[] }).longTasks),
    );
    // Loose enough for a slow machine. Before slicing, this link blocked the page for 1.3 seconds.
    expect(longest).toBeLessThan(1_000);
  });

  test('pins A and compares it with the current configuration', async ({ page }) => {
    await open(page);
    await showResults(page);
    await settled(page);
    await page.getByRole('button', { name: 'Pin this as A to compare' }).click();
    await page.getByLabel('Dual condition').check();
    await settled(page);

    await expect(page.getByRole('heading', { name: 'A (pinned)' })).toHaveCount(2);
    await expect(share(page, 'done-false', 'b')).toHaveText('0.0%');
    expect(percent(await share(page, 'done-false', 'a').textContent())).toBeGreaterThan(15);
    await expect(page.getByTestId('histogram-a')).toBeVisible();
  });
});

test.describe('at phone width', () => {
  for (const colorScheme of ['light', 'dark'] as const) {
    test(`never scrolls sideways with every chart's tooltip open in ${colorScheme} mode`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 360, height: 800 });
      await page.emulateMedia({ colorScheme });
      await open(page);
      await reveal(page);
      await settled(page);
      await page.getByRole('button', { name: 'Pin this as A to compare' }).click();
      await page.getByText('Price an iteration from a model').click();
      await chooseLog(page, 'loop-governor/flat-from-15.jsonl');
      await expect(page.getByTestId('counterfactuals')).toBeVisible();

      const checkTooltip = async (tooltip: Locator): Promise<void> => {
        await expect(tooltip).toBeVisible();
        const bounds = (await tooltip.boundingBox())!;
        expect(bounds.x).toBeGreaterThanOrEqual(0);
        expect(bounds.x + bounds.width).toBeLessThanOrEqual(360);
        expect(await horizontalOverflow(page)).toBe(0);
      };

      // The cost histogram, hovered near its right edge and then focused.
      const histogram = page.getByTestId('histogram-b').getByTestId('cost-chart');
      await histogram.scrollIntoViewIfNeeded();
      const histogramBounds = (await histogram.boundingBox())!;
      await page.mouse.move(
        histogramBounds.x + histogramBounds.width - 4,
        histogramBounds.y + histogramBounds.height / 2,
      );
      await checkTooltip(page.getByTestId('histogram-b').getByTestId('histogram-tooltip'));
      await histogram.focus();
      await page.keyboard.press('End');
      await checkTooltip(page.getByTestId('histogram-b').getByTestId('histogram-tooltip'));

      // The animated run, drawn out with Step, then hovered and focused.
      for (let index = 0; index < 4; index += 1) {
        await page.getByRole('button', { name: 'Step', exact: true }).click();
      }
      const timeline = page.getByTestId('timeline');
      await timeline.scrollIntoViewIfNeeded();
      const cell = timeline.locator('li').last();
      await cell.hover();
      await checkTooltip(page.getByTestId('timeline-tooltip'));
      await timeline.focus();
      await page.keyboard.press('End');
      await checkTooltip(page.getByTestId('timeline-tooltip'));

      // The replay chart, hovered at its right edge and then focused.
      const replay = page.getByTestId('replay-chart');
      await replay.scrollIntoViewIfNeeded();
      const replayBounds = (await replay.boundingBox())!;
      await page.mouse.move(replayBounds.x + replayBounds.width - 6, replayBounds.y + 60);
      await checkTooltip(page.getByTestId('replay-tooltip'));
      await replay.focus();
      await page.keyboard.press('End');
      await checkTooltip(page.getByTestId('replay-tooltip'));

      expect(await horizontalOverflow(page)).toBe(0);
    });
  }
});

test.describe('keyboard focus', () => {
  test('moves focus to the answer after a reveal', async ({ page }) => {
    await open(page);
    await reveal(page);
    await expect(page.getByRole('group', { name: 'Your guess and the answer' })).toBeFocused();
  });

  test('moves focus to the results after a skip', async ({ page }) => {
    await open(page);
    await showResults(page);
    await expect(page.getByRole('group', { name: 'Results', exact: true })).toBeFocused();
  });
});
