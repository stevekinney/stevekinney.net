import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

import { openExperiment } from './helpers/open-experiment';

const path = '/experiments/workflow-fan-out';

// Synthetic workflow scripts, written here rather than read from disk: a
// script with top-level `return` isn't a module the repository's linter can
// parse. The first has exactly two problems, Math.random() on line 9 and an
// unmatched phase('Fix') on line 10.
const flakyFixes = `export const meta = {
  name: 'flaky-fixes',
  description: 'Find flaky tests and propose fixes',
  phases: [{ title: 'Scan', detail: 'grep test logs' }],
};

phase('Scan');
const flaky = await agent('Find flaky tests', { model: 'haiku', schema: FLAKY });
const pick = flaky.tests[Math.floor(Math.random() * flaky.tests.length)];
phase('Fix');
return agent(\`Fix \${pick.name}\`, { model: 'sonnet' });
`;

const open = async (page: Page): Promise<void> => {
  await openExperiment(page, path);
};

const preset = (page: Page, name: string): Locator =>
  page.getByRole('group', { name: 'Presets' }).getByRole('button', { name, exact: true });
const makespan = (page: Page, strategy: 'pipeline' | 'parallel'): Locator =>
  page.getByTestId(`makespan-${strategy}`);
const chart = (page: Page, strategy: 'pipeline' | 'parallel'): Locator =>
  page.getByTestId(`gantt-${strategy}`);
const headline = (page: Page): Locator => page.getByTestId('results-headline');

const horizontalOverflow = (page: Page): Promise<number> =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test.describe('predict first', () => {
  test('asks for a guess before revealing that pipeline() wins by 9 minutes', async ({ page }) => {
    await open(page);

    await expect(page.getByTestId('predict-grid')).toContainText('10');
    await expect(page.getByTestId('predict-reveal')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Reveal' })).toBeDisabled();

    await page.getByRole('radio', { name: 'They tie' }).check();
    await page.getByRole('button', { name: 'Reveal' }).click();

    const reveal = page.getByTestId('predict-reveal');
    await expect(reveal).toContainText('Most people guess a tie');
    await expect(reveal).toContainText(
      'pipeline() finishes first, 9 min sooner: 11 min against 20 min.',
    );
  });

  test('confirms a right guess, and loads the grid into the charts', async ({ page }) => {
    await open(page);
    await page.getByRole('radio', { name: 'pipeline() finishes first' }).check();
    await page.getByLabel('By how many minutes').fill('9');
    await page.getByRole('button', { name: 'Reveal' }).click();

    await expect(page.getByTestId('predict-reveal')).toContainText('You called it.');
    await page.getByRole('button', { name: 'Load it into the charts' }).click();
    await expect(makespan(page, 'pipeline')).toHaveText('11 min');
    await expect(makespan(page, 'parallel')).toHaveText('20 min');
  });
});

test.describe('presets', () => {
  test('slow first, slow last: pipeline() 11, parallel() 20, with a barrier at 10', async ({
    page,
  }) => {
    await open(page);
    await preset(page, 'Slow first, slow last').click();

    await expect(preset(page, 'Slow first, slow last')).toHaveAttribute('aria-pressed', 'true');
    await expect(makespan(page, 'pipeline')).toHaveText('11 min');
    await expect(makespan(page, 'parallel')).toHaveText('20 min');
    await expect(page.getByTestId('makespan-comparison')).toHaveText(
      'pipeline() finishes 9 min sooner than parallel().',
    );
    await expect(chart(page, 'parallel').locator('[data-barrier="10"]')).toHaveCount(1);
    await expect(chart(page, 'parallel').locator('[data-kind="idle"]')).toHaveCount(3);
    await expect(chart(page, 'pipeline').locator('[data-barrier]')).toHaveCount(0);
  });

  test('concurrency 1: both take 26 minutes, with queued time hatched', async ({ page }) => {
    await open(page);
    await preset(page, 'Concurrency 1').click();

    await expect(makespan(page, 'pipeline')).toHaveText('26 min');
    await expect(makespan(page, 'parallel')).toHaveText('26 min');
    await expect(chart(page, 'pipeline').locator('[data-kind="queued"]').first()).toBeVisible();
  });

  test('big fan-out on Opus: 101 agents, 3.03M tokens, $12.12, and the warnings', async ({
    page,
  }) => {
    await open(page);
    await preset(page, 'Big fan-out on Opus').click();

    await expect(page.getByTestId('total-agents')).toHaveText('101');
    await expect(page.getByTestId('total-tokens')).toHaveText('3.03M');
    await expect(page.getByTestId('total-cost')).toHaveText('$12.12');
    await expect(page.getByTestId('badge-agents')).toHaveAttribute('data-tone', 'warning');
    await expect(page.getByTestId('badge-tokens')).toHaveAttribute('data-tone', 'warning');
    await expect(page.getByText('Large workflow: 101 agents is more than 25.')).toBeVisible();
    await expect(
      page.getByText('Large workflow: 3.03M projected tokens is more than 1.5M.'),
    ).toBeVisible();
    await expect(page.getByTestId('inherit-warning')).toContainText(
      'Every agent runs on your session model.',
    );

    await page
      .getByRole('combobox', { name: 'Stage 1 model on the agent() call' })
      .selectOption({ label: 'Haiku 4.5 ($1/$5)' });
    await expect(page.getByTestId('total-cost')).toHaveText('$7.62');
    await expect(page.getByTestId('model-callout')).toHaveText(
      'Setting stage 1 to Haiku 4.5 saves $4.50 (37%).',
    );
    await expect(page.getByTestId('inherit-warning')).toHaveCount(0);
  });

  test('silent drops: 47 of 50 items, and the run still says it completed', async ({ page }) => {
    await open(page);
    await preset(page, 'Silent drops').click();

    await expect(headline(page)).toHaveText('47 of 50 items (3 dropped silently)');
    await expect(page.getByTestId('results-reported')).toContainText('Run completed — 47 results');
    await expect(page.getByTestId('results-length-filter')).toHaveText('length 47');
    await expect(page.getByTestId('results-length-keep')).toHaveText('length 50');

    await page.locator('#results-handling-keep').click();
    await expect(headline(page)).toHaveText('Run completed — 50 results (3 are null)');
    await expect(
      page
        .getByRole('list', { name: 'Results with nulls kept' })
        .getByText('null', { exact: true }),
    ).toHaveCount(3);
  });

  test('a barrier that’s needed explains why parallel() is right', async ({ page }) => {
    await open(page);
    await preset(page, 'A barrier that’s needed').click();

    await expect(page.getByTestId('preset-notice')).toContainText(
      'This is the case parallel() is for.',
    );
  });
});

test.describe('the run', () => {
  test('says the strategies are identical with one stage', async ({ page }) => {
    await open(page);
    await page.getByRole('button', { name: 'Remove the last stage' }).click();

    await expect(page.getByTestId('makespan-comparison')).toHaveText(
      'With one stage there’s no barrier, so both strategies are identical.',
    );
  });

  test('shows the runtime’s rejection above 4,096 items and refusal above 1,000 agents', async ({
    page,
  }) => {
    await open(page);
    await page.locator('#items').fill('600');
    await expect(page.getByTestId('runtime-refusal')).toContainText(
      'Refused: a run can have at most 1,000 agents',
    );
    await expect(chart(page, 'pipeline')).toHaveCount(0);

    await page.locator('#items').fill('5000');
    await expect(page.getByTestId('runtime-refusal').first()).toContainText(
      'Rejected: pipeline() and parallel() take at most 4,096 items per call',
    );
  });

  test('a schema failure on every attempt errors, and uncaught it fails the run', async ({
    page,
  }) => {
    await open(page);
    await page.locator('#validation-probability').fill('100%');

    await expect(page.getByText('Logged by the runtime (8)')).toBeVisible();
    await expect(
      page.getByText('pipeline[0] failed: schema validation failed after 5 attempts'),
    ).toBeVisible();

    await page.locator('#error-handling-uncaught').click();
    await expect(headline(page)).toContainText('Run failed at');
    await expect(headline(page)).toContainText('never received a results array');
    await expect(page.getByTestId('makespan-label').first()).toContainText('failed at');
  });

  test('a failure rate of 1 makes every item null', async ({ page }) => {
    await open(page);
    await page.locator('#failure-probability').fill('100%');

    await expect(headline(page)).toHaveText('Run completed — 8 results (8 are null)');
  });

  test('pressing + on a focused bar switches to the manual grid and recomputes both charts', async ({
    page,
  }) => {
    await open(page);
    await preset(page, 'Slow first, slow last').click();
    await chart(page, 'pipeline').focus();
    // The first agent is item 1's stage 1 (1 minute). Two presses make it 2.
    await page.keyboard.press('+');
    await page.keyboard.press('+');

    await expect(page.locator('#cell-0-0')).toHaveValue('2');
    await expect(makespan(page, 'pipeline')).toHaveText('12 min');
    await expect(makespan(page, 'parallel')).toHaveText('20 min');
  });

  test('drags a bar’s right edge to lengthen it', async ({ page }) => {
    await open(page);
    await preset(page, 'Slow first, slow last').click();

    const handle = chart(page, 'pipeline').locator('[data-handle="3-1"]');
    // Mouse coordinates are relative to the viewport, so the handle has to be on screen.
    await handle.scrollIntoViewIfNeeded();
    const box = (await handle.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 120, box.y + box.height / 2, { steps: 5 });
    await page.mouse.up();

    await expect(makespan(page, 'pipeline')).not.toHaveText('11 min');
    await expect(page.locator('#cell-3-1')).not.toHaveValue('1');
  });

  test('plays the schedule and ends on the finished state', async ({ page }) => {
    await open(page);
    await page.getByRole('button', { name: 'Play' }).click();

    await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Play' })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('makespan-label').first()).toBeVisible();
  });

  test('renders the final state at once with reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page);
    await page.getByRole('button', { name: 'Play' }).click();

    await expect(page.getByRole('button', { name: 'Show the finished schedule' })).toHaveCount(0);
    await expect(page.getByTestId('makespan-label')).toHaveCount(2);
  });

  test('has a table with every agent’s start and end', async ({ page }) => {
    await open(page);
    await preset(page, 'Slow first, slow last').click();
    await page.getByText('The schedule as a table').click();

    const table = page.getByRole('region', { name: 'Schedule table' });
    await expect(table.getByRole('row')).toHaveCount(9);
    await expect(table.getByRole('row').nth(2)).toContainText('Fix');
  });
});

test.describe('the script checker', () => {
  test('finds exactly Math.random() and the unmatched phase in a pasted script', async ({
    page,
  }) => {
    await open(page);
    const source = page.getByLabel('Your orchestration script');
    await expect(source).toBeVisible();
    await expect(page.getByText('Your script never leaves your machine')).toBeVisible();

    await source.fill(flakyFixes);
    const findings = page.getByTestId('lint-findings');
    await expect(findings).toContainText('2 findings');
    await expect(findings.locator('[data-rule]')).toHaveCount(2);
    await expect(findings.locator('[data-rule="banned-call"]')).toContainText('Line 9');
    await expect(findings.locator('[data-rule="phase-not-in-meta"]')).toContainText('Line 10');
    await expect(findings.getByText('heuristic')).toHaveCount(2);
  });

  test('reads a dropped script file', async ({ page }) => {
    await open(page);
    await page
      .getByRole('group', { name: 'Or drop a workflow script' })
      .locator('input[type="file"]')
      .first()
      .setInputFiles({
        name: 'flaky-fixes.js',
        mimeType: 'text/javascript',
        buffer: Buffer.from(flakyFixes),
      });

    await expect(page.getByText('Read flaky-fixes.js.')).toBeVisible();
    await expect(page.getByTestId('lint-findings')).toContainText('2 findings');
  });

  test('links a finding to its concept', async ({ page }) => {
    await open(page);
    await page.getByRole('button', { name: 'Paste an example with problems' }).click();

    await expect(
      page.getByTestId('lint-findings').locator('[data-rule="filter-boolean"]'),
    ).toContainText('Was dropping failures intended?');
    await page.getByRole('link', { name: 'Nulls and .filter(Boolean)' }).click();
    await expect(page.locator('#concept-nulls')).toBeInViewport();
  });
});

test.describe('sharing', () => {
  test('copies a link that reopens to the same run, and a Markdown summary', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await open(page);
    await preset(page, 'Silent drops').click();
    await page.getByLabel('Your orchestration script').fill(flakyFixes);

    await page.getByRole('button', { name: 'Copy link' }).click();
    await expect(page.getByText('Link copied.')).toBeVisible();
    const link = await page.evaluate(() => navigator.clipboard.readText());
    expect(link).toContain(`${path}#`);
    expect(link).toContain('items=50');
    expect(link).toContain('results=filter');
    expect(link).not.toContain('flaky');

    await page.getByRole('button', { name: 'Copy summary' }).click();
    await expect(page.getByText('Summary copied as Markdown.')).toBeVisible();
    const summary = await page.evaluate(() => navigator.clipboard.readText());
    expect(summary).toContain('- Results: 47 of 50 items (3 dropped silently)');
    expect(summary).toContain('- Agents scheduled: 101');
    expect(summary).toContain('### Warnings');

    const other = await context.newPage();
    await openExperiment(other, link.replace(/^https?:\/\/[^/]+/, ''));
    await expect(other.getByTestId('results-headline')).toHaveText(
      '47 of 50 items (3 dropped silently)',
    );
  });
});

test.describe('at 360 pixels wide', () => {
  for (const colorScheme of ['light', 'dark'] as const) {
    test(`keeps the page from scrolling sideways with tooltips hovered and focused in ${colorScheme} mode`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 360, height: 800 });
      await page.emulateMedia({ colorScheme });
      await open(page);
      await preset(page, 'Big fan-out on Opus').click();

      // Hover a bar near the right edge of the parallel() chart's visible area.
      const bar = chart(page, 'parallel')
        .locator('[data-kind="run"][data-item="0"][data-stage="1"] rect')
        .first();
      await bar.scrollIntoViewIfNeeded();
      await bar.hover({ force: true });
      await expect(page.getByTestId('gantt-tooltip')).toBeVisible();
      expect(await horizontalOverflow(page)).toBe(0);

      // Focus the other chart and walk to its last agent with the keyboard.
      await chart(page, 'pipeline').focus();
      await page.keyboard.press('End');
      await expect(page.getByTestId('gantt-tooltip')).toContainText('Item');
      expect(await horizontalOverflow(page)).toBe(0);

      const tooltip = (await page.getByTestId('gantt-tooltip').boundingBox())!;
      expect(tooltip.x).toBeGreaterThanOrEqual(0);
      expect(tooltip.x + tooltip.width).toBeLessThanOrEqual(360);

      await page.getByText('The schedule as a table').click();
      await page.locator('[data-testid="price-table"] summary').click();
      expect(await horizontalOverflow(page)).toBe(0);
    });
  }

  test('scrolls the charts inside their own container', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await open(page);

    const scroller = chart(page, 'pipeline').locator('xpath=..');
    const sizes = await scroller.evaluate((element) => ({
      scroll: element.scrollWidth,
      client: element.clientWidth,
    }));
    expect(sizes.scroll).toBeGreaterThan(sizes.client);
  });
});
