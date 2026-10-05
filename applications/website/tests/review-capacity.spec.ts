import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { openExperiment } from './helpers/open-experiment';

// The fixture is a synthetic `gh pr list --json` listing: nine pull requests
// from `app/example-agent` (one of 350 + 120 lines), three from
// `example-human`, and one entry with no deletions, which is skipped.
const fixture = (name: string): string =>
  fileURLToPath(new URL(`./fixtures/review-capacity/${name}`, import.meta.url));
const readFixture = (name: string): string => readFileSync(fixture(name), 'utf8');

const path = '/experiments/review-capacity';

const horizontalOverflow = (page: Page): Promise<number> =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

const field = (page: Page, label: string): Locator =>
  page.getByRole('textbox', { name: label, exact: true });
const preset = (page: Page, name: string): Locator =>
  page
    .getByRole('group', { name: 'Start from a preset' })
    .getByRole('button', { name, exact: true });

/** Opens the page and gets past the prediction by skipping it. */
const openRevealed = async (page: Page, hash = ''): Promise<void> => {
  await openExperiment(page, `${path}${hash}`);
  await page.getByRole('button', { name: 'Skip the guess' }).click();
  await expect(page.getByTestId('prediction-reveal')).toBeVisible();
};

test.describe('predict first', () => {
  test('asks the question and holds the rest of the page back until you answer', async ({
    page,
  }) => {
    await openExperiment(page, path);

    await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toHaveText(
      'How many agents can you actually review?',
    );
    await expect(page.getByTestId('predict-question')).toHaveText(
      'With 3 agents each opening 2 pull requests of 300 lines a day, how many agents can you keep fully reviewed?',
    );
    await expect(page.getByRole('heading', { name: 'Your daily balance' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Reveal' })).toBeDisabled();
  });

  test('shows the sustainable count beside your guess', async ({ page }) => {
    await openExperiment(page, path);

    await page.getByLabel('Your guess, in agents').fill('4');
    await page.getByRole('button', { name: 'Reveal' }).click();

    await expect(page.getByTestId('guess-value')).toHaveText('4');
    await expect(page.getByTestId('sustainable-value')).toHaveText('2');
    await expect(page.getByText('You guessed 2 more than you can keep reviewed.')).toBeVisible();
    await expect(page.getByText('1,200 ÷ 600 rounds down to 2 agents')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Your daily balance' })).toBeVisible();
  });

  test('says so when the guess is right', async ({ page }) => {
    await openExperiment(page, path);

    await page.getByLabel('Your guess, in agents').fill('2');
    await page.getByLabel('Your guess, in agents').press('Enter');

    await expect(page.getByText('Right on. Most people guess higher.')).toBeVisible();
  });
});

test.describe('the defaults', () => {
  test('match the specification’s daily numbers', async ({ page }) => {
    await openRevealed(page);

    await expect(page.getByTestId('generated')).toHaveText('1,800 lines');
    await expect(page.getByTestId('capacity')).toHaveText('1,200 lines');
    await expect(page.getByTestId('sustainable')).toHaveText('2');
    await expect(page.getByTestId('gap-label')).toHaveText('+600 lines/day you won’t review fresh');
    await expect(page.getByTestId('minutes-legend')).toContainText('Fresh review: 180 minutes');
    await expect(page.getByTestId('minutes-legend')).toContainText('Follow-up: 62.8 minutes');
  });

  test('queues 6,000 lines, or 20 pull requests, after 10 days', async ({ page }) => {
    await openRevealed(page);

    await expect(page.getByTestId('queue-headline')).toHaveText(
      'After 10 working days, 6,000 lines are waiting, which is 20 pull requests. The oldest was opened on day 7, 3 working days earlier.',
    );

    await page.getByText('The projection as a table').click();
    const rows = page.getByTestId('projection-table').locator('tbody tr');
    await expect(rows).toHaveCount(10);
    await expect(rows.nth(3)).toContainText('opened on day 3, 1 working day earlier');
    await expect(rows.nth(9)).toContainText('6,000');
  });

  test('swaps the chart for escaped defects when you review it tired', async ({ page }) => {
    await openRevealed(page);

    await page.locator('#projection-policy-tired').click();
    await expect(page.getByTestId('tired-headline')).toContainText(
      'lets 11.25 defects a day escape, against 8.10 if every line had been reviewed fresh',
    );
    await expect(page.getByTestId('queue-headline')).toHaveCount(0);
    // The inputs' policy toggle follows the one above the chart.
    await expect(page.locator('#policy-tired')).toHaveAttribute('aria-pressed', 'true');
    // The small multiple shows both policies whatever the toggle says.
    await expect(page.getByTestId('small-multiples').getByRole('img')).toHaveCount(2);
  });

  test('marks the sustainable count on the sweep', async ({ page }) => {
    await openRevealed(page);

    const chart = page.getByTestId('sweep-backlog-chart');
    await expect(chart.locator('svg text', { hasText: 'Sustainable: 2' })).toHaveCount(1);
    await chart.focus();
    await chart.press('End');
    await expect(chart).toHaveAttribute('aria-valuetext', /Agents 10, Lines waiting 48,000 lines/);
  });
});

test.describe('presets', () => {
  test('two agents keep the backlog at zero and the policies match', async ({ page }) => {
    await openRevealed(page);
    await preset(page, 'Two agents').click();

    await expect(preset(page, 'Two agents')).toHaveAttribute('aria-pressed', 'true');
    await expect(field(page, 'Parallel agents')).toHaveValue('2');
    await expect(page.getByTestId('generated')).toHaveText('1,200 lines');
    await expect(page.getByTestId('queue-headline')).toHaveText(
      'The backlog stays at zero. Everything opened is reviewed fresh the same day.',
    );
    await expect(page.getByText('both policies give the same result')).toBeVisible();
  });

  test('one huge pull request is flagged and queues across days', async ({ page }) => {
    await openRevealed(page);
    await preset(page, 'One huge pull request').click();

    await expect(page.getByTestId('oversized-warning')).toContainText(
      'One 1,500-line pull request is more than a whole day of good sittings',
    );
    await expect(page.getByTestId('queue-headline')).toContainText('3,000 lines are waiting');
  });

  test('an oversized pull request still waits when capacity covers the average', async ({
    page,
  }) => {
    // One 2,000-line pull request every other day: 1,000 lines a day on average, against 1,200.
    await openRevealed(page, '#agents=1&prs=0.5&lines=2000&days=9');

    await expect(page.getByTestId('gap-label')).toHaveText(
      'Capacity covers it, with 200 lines/day to spare',
    );
    await expect(page.getByTestId('oversized-warning')).toBeVisible();
    await expect(page.getByText('so it still waits or gets a tired review')).toBeVisible();
    await expect(page.getByText('both policies give the same result')).toHaveCount(0);
    await expect(page.getByTestId('queue-headline')).toContainText(
      'the backlog peaked at 800 lines on day 2',
    );
  });

  test('no fatigue makes both policies equal on quality', async ({ page }) => {
    await openRevealed(page);
    await preset(page, 'No fatigue').click();

    await expect(
      page.getByText(
        '4.50 when you queue, 4.50 when you review tired, the same, because a fatigued factor of 1 means no fatigue',
      ),
    ).toBeVisible();
  });

  test('no agents says the backlog stays at zero', async ({ page }) => {
    await openRevealed(page);
    await preset(page, 'No agents').click();

    await expect(page.getByTestId('gap-label')).toHaveText('No agents, so nothing to review');
    await expect(page.getByTestId('generated')).toHaveText('0 lines');
  });

  test('typing a value turns the preset off and updates the numbers', async ({ page }) => {
    await openRevealed(page);
    await field(page, 'Parallel agents').fill('5');

    await expect(page.getByTestId('preset-notice')).toHaveText(
      'The top of the recommended range opens 3,000 lines a day, two and a half times what you can review well.',
    );
    await field(page, 'Lines changed per pull request').fill('310');
    await expect(page.getByTestId('preset-notice')).toContainText('Your own scenario');
    await field(page, 'Parallel agents').fill('lots');
    await expect(field(page, 'Parallel agents')).toHaveAttribute('aria-invalid', 'true');
  });
});

test.describe('sharing', () => {
  test('a shared link restores the scenario', async ({ page }) => {
    await openRevealed(page, '#agents=4&policy=tired');

    await expect(field(page, 'Parallel agents')).toHaveValue('4');
    await expect(page.locator('#policy-tired')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('generated')).toHaveText('2,400 lines');
  });

  test('copy summary writes Markdown with the backlog and the defects', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await openRevealed(page);

    await page.getByRole('button', { name: 'Copy summary' }).click();
    await expect(page.getByText('Summary copied as Markdown.')).toBeVisible();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toContain('- Sustainable: 2 agents');
    expect(copied).toContain('6,000 lines waiting in 20 pull requests');
    expect(copied).toContain('11.25 escaped defects a day');

    await page.getByRole('button', { name: 'Copy link' }).click();
    const link = await page.evaluate(() => navigator.clipboard.readText());
    expect(link).toContain('/experiments/review-capacity#agents=3');
  });
});

test.describe('split the pull request', () => {
  test('cuts 470 lines into two units of 235', async ({ page }) => {
    await openExperiment(page, path);
    await page.getByLabel('Pull request size, in changed lines').fill('470');

    await expect(page.getByTestId('split-result')).toContainText(
      '470 lines need 2 effective sittings, about 120 minutes of good review. Split it into 2 reviewable units of 235, 235 lines.',
    );
  });
});

test.describe('measuring a listing', () => {
  test('pasting it counts 350 + 120 as 470 lines, over one sitting, and reports the skip', async ({
    page,
  }) => {
    await openExperiment(page, path);
    await page
      .getByLabel('Paste the listing’s JSON')
      .fill(readFixture('merged-pull-requests.json'));
    await page.getByRole('button', { name: 'Measure' }).click();

    await expect(page.getByTestId('listing-summary')).toContainText(
      '12 pull requests read, 1 skipped. 16.7% are more than one effective sitting (400 lines).',
    );
    await page.getByText('Skipped entries').click();
    await expect(page.getByTestId('skipped-entries')).toHaveText('Entry 13: no usable deletions');

    const histogram = page.getByTestId('histogram-chart');
    await histogram.focus();
    await histogram.press('ArrowRight');
    await histogram.press('ArrowRight');
    await histogram.press('ArrowRight');
    await expect(histogram).toHaveAttribute(
      'aria-valuetext',
      'Lines changed 401–800, Fits one sitting 0 pull requests, More than one effective sitting 2 pull requests',
    );

    await page.getByText('By login (2)').click();
    await expect(page.getByText('app/example-agent: 9, median 250 lines (agent)')).toBeVisible();
  });

  test('loads the measured numbers into the inputs', async ({ page }) => {
    await openExperiment(page, path);
    await page
      .getByLabel('Paste the listing’s JSON')
      .fill(readFixture('merged-pull-requests.json'));
    await page.getByRole('button', { name: 'Measure' }).click();

    await expect(page.getByTestId('load-offer')).toContainText(
      '250 lines per pull request and 0.3 pull requests per agent per day',
    );
    await page.getByRole('button', { name: 'Load these into the simulator' }).click();

    await expect(field(page, 'Lines changed per pull request')).toHaveValue('250');
    await expect(field(page, 'Pull requests per agent per day')).toHaveValue('0.3');
  });

  test('choosing the file works the same as pasting it', async ({ page }) => {
    await openExperiment(page, path);
    await page
      .getByRole('group', { name: 'Or drop a saved listing' })
      .locator('input[type="file"]')
      .first()
      .setInputFiles(fixture('merged-pull-requests.json'));

    await expect(page.getByTestId('listing-summary')).toContainText('12 pull requests read');
  });

  test('explains text that is not a listing', async ({ page }) => {
    await openExperiment(page, path);
    await page.getByLabel('Paste the listing’s JSON').fill('{"oops": true');
    await page.getByRole('button', { name: 'Measure' }).click();

    await expect(page.getByRole('alert')).toHaveText(
      'That isn’t valid JSON. Paste the whole output, from [ to ].',
    );
  });
});

test.describe('the approval-fatigue game', () => {
  /** Plays a round by keyboard, denying only the cards in `deny`. Returns the requests seen. */
  const play = async (page: Page, seed: string, deny: (request: string) => boolean) => {
    await page.getByLabel('Seed', { exact: true }).fill(seed);
    await page.getByRole('button', { name: 'Start the round' }).click();

    const requests: string[] = [];
    for (let index = 0; index < 20; index += 1) {
      await expect(page.getByTestId('approval-card')).toContainText(`Prompt ${index + 1} of 20`);
      const request = (await page.getByTestId('card-request').textContent()) ?? '';
      requests.push(request);
      await page.keyboard.press(deny(request) ? 'd' : 'a');
    }

    return requests;
  };

  const dangerous = /--force|\.\.\/\.env|rm -rf \.\.\/|public-sdk/;

  test('is playable by keyboard, and the same seed deals the same round', async ({ page }) => {
    await openExperiment(page, path);

    const first = await play(page, '20261004', (request) => dangerous.test(request));
    const position = first.findIndex((request) => dangerous.test(request)) + 1;
    expect(position).toBeGreaterThanOrEqual(10);
    expect(position).toBeLessThanOrEqual(20);
    await expect(page.getByTestId('game-verdict')).toHaveText(
      `You caught it. The dangerous prompt was number ${position}.`,
    );
    await expect(
      page.getByText('“After the tenth approval you’re clicking through rather than reviewing.”'),
    ).toBeVisible();
    await expect(
      page.getByTestId('game-chart').locator('svg text', { hasText: 'dangerous' }),
    ).toHaveCount(1);

    await page.getByRole('button', { name: 'Play seed 20261004 again' }).click();
    const second = await play(page, '20261004', () => false);
    expect(second).toEqual(first);
    await expect(page.getByTestId('game-verdict')).toHaveText(
      `You allowed it. The dangerous prompt was number ${position}.`,
    );
  });

  test('keeps the dangerous card within 10 to 20 for other seeds', async ({ page }) => {
    await openExperiment(page, path);

    for (const seed of ['1', '987654321']) {
      const requests = await play(page, seed, () => false);
      const position = requests.findIndex((request) => dangerous.test(request)) + 1;

      expect(position).toBeGreaterThanOrEqual(10);
      expect(position).toBeLessThanOrEqual(20);
      await page.getByRole('button', { name: /Play seed \d+ again/ }).click();
    }
  });
});

test.describe('at phone width', () => {
  for (const colorScheme of ['light', 'dark'] as const) {
    test(`never scrolls sideways with tooltips open in ${colorScheme} mode`, async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 800 });
      await page.emulateMedia({ colorScheme });
      await openRevealed(page);
      await page.getByText('The projection as a table').click();
      await page.getByText('The sweep as a table').click();

      for (const id of ['projection-chart', 'sweep-backlog-chart', 'sweep-defects-chart']) {
        const chart = page.getByTestId(id);
        await chart.scrollIntoViewIfNeeded();
        const box = (await chart.boundingBox())!;

        // Hover near each edge, where a tooltip is most likely to push the page wider.
        for (const x of [box.x + 50, box.x + box.width / 2, box.x + box.width - 4]) {
          await page.mouse.move(x, box.y + box.height / 2);
          await expect(chart.getByTestId('chart-tooltip')).toBeVisible();
          expect(await horizontalOverflow(page)).toBe(0);
        }
        await page.mouse.move(0, 0);

        // And by keyboard, at both ends.
        await chart.focus();
        await expect(chart.getByTestId('chart-tooltip')).toBeVisible();
        await chart.press('End');
        expect(await horizontalOverflow(page)).toBe(0);
        await chart.press('Home');
        expect(await horizontalOverflow(page)).toBe(0);
      }

      await page.locator('#projection-policy-tired').click();
      const tired = page.getByTestId('projection-chart');
      await tired.focus();
      await tired.press('End');
      await expect(tired.getByTestId('chart-tooltip')).toContainText('escaped in all');
      expect(await horizontalOverflow(page)).toBe(0);

      await page
        .getByLabel('Paste the listing’s JSON')
        .fill(readFixture('merged-pull-requests.json'));
      await page.getByRole('button', { name: 'Measure' }).click();
      await page.getByText('By login (2)').click();
      const histogram = page.getByTestId('histogram-chart');
      await histogram.focus();
      await histogram.press('End');
      await expect(histogram.getByTestId('chart-tooltip')).toBeVisible();
      expect(await horizontalOverflow(page)).toBe(0);
    });
  }
});
