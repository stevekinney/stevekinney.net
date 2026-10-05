import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { startGame } from '../src/routes/experiments/mechanism-picker/deal';
import { outlineScenarios } from '../src/routes/experiments/mechanism-picker/scenarios';
import { openExperiment } from './helpers/open-experiment';

// The fixtures are a made-up instructions file and a made-up team deck.
const fixture = (name: string): string =>
  fileURLToPath(new URL(`./fixtures/mechanism-picker/${name}`, import.meta.url));

const pickerPath = '/experiments/mechanism-picker';

const openPicker = (page: Page, hash = ''): Promise<void> =>
  openExperiment(page, `${pickerPath}${hash}`);

const horizontalOverflow = (page: Page): Promise<number> =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

const tab = (page: Page, name: 'Map' | 'Sort' | 'Lint') =>
  page.getByRole('tab', { name, exact: true });

const rung = (page: Page, id: string) =>
  page.locator(`[data-testid="ladder-strip"] [data-rung="${id}"]`);

const node = (page: Page, name: string) =>
  page.getByRole('button', { name, exact: true }).and(page.locator('[data-mechanism]'));

const lintItem = (page: Page, line: number) => page.locator(`[data-line="${line}"]`);

const sampleLines = [
  '- Maintain high quality code.',
  '- Never read .env files.',
  '- Run `pnpm test:billing` from `apps/api` after billing changes.',
  '- Format files with Prettier after every edit.',
  '- Current branch is feature/invoices-2.',
];

const expectSampleClassifications = async (page: Page, lines: number[]): Promise<void> => {
  const expected = [
    'Doesn’t change a decision',
    'Must hold every time',
    'Good operational fact',
    'Deterministic',
    'Stale-prone',
  ];
  for (const [index, line] of lines.entries()) {
    await expect(lintItem(page, line).getByTestId('classification')).toHaveText(expected[index]);
  }
};

test('responds with 200 and its title', async ({ page }) => {
  const response = await page.goto(pickerPath);

  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle(/Mechanism Picker/);
  await expect(page.getByRole('heading', { level: 1, name: 'Which primitive?' })).toBeVisible();
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('shows the predict card and the map but disables the controls', async ({ page }) => {
    await page.goto(pickerPath);

    await expect(page.getByText('“Ensure all contributors obey this check”')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Check my answer' })).toBeDisabled();
    await expect(tab(page, 'Sort')).toBeDisabled();
    await expect(node(page, 'Hook')).toBeDisabled();
  });
});

test.describe('acceptance 1: predict first', () => {
  test('choosing Hook explains that a local hook is not the shared boundary', async ({ page }) => {
    await openPicker(page);

    await expect(page.getByTestId('predict-feedback')).toHaveCount(0);
    await page.getByRole('radio', { name: 'Hook', exact: true }).check();
    await expect(page.getByTestId('predict-feedback')).toHaveCount(0);
    await page.getByRole('button', { name: 'Check my answer' }).click();

    const feedback = page.getByTestId('predict-feedback');
    await expect(feedback).toHaveAttribute('data-grade', 'miss');
    await expect(feedback).toContainText('The answer is Required CI check.');
    await expect(page.getByTestId('predict-reason')).toHaveText(
      'A local agent hook is not the shared integration boundary.',
    );
    await expect(feedback).toContainText('From the course outline');
    await expect(rung(page, 'hook')).toHaveAttribute('data-lit', 'true');
  });

  test('choosing Required CI check is right, and the card can be tried again', async ({ page }) => {
    await openPicker(page);

    await page.getByRole('radio', { name: 'Required CI check', exact: true }).check();
    await page.getByRole('button', { name: 'Check my answer' }).click();
    await expect(page.getByTestId('predict-feedback')).toHaveAttribute('data-grade', 'match');
    await expect(page.getByTestId('predict-feedback')).toContainText('Right: Required CI check.');
    await expect(rung(page, 'ci')).toHaveAttribute('data-lit', 'true');

    await page.getByRole('button', { name: 'Try it again' }).click();
    await expect(page.getByTestId('predict-feedback')).toHaveCount(0);
    await expect(page.getByRole('radio', { name: 'Hook', exact: true })).not.toBeChecked();
  });
});

test.describe('the map', () => {
  test('acceptance 3: a permission rule and project instructions light their rungs', async ({
    page,
  }) => {
    await openPicker(page);

    await node(page, 'Permission rule').click();
    await expect(rung(page, 'permission')).toHaveAttribute('data-lit', 'true');
    await expect(page.locator('[data-testid="ladder-strip"] [data-lit="true"]')).toHaveCount(1);
    await expect(page.getByTestId('ladder-strip')).toContainText(
      'Permission rule sits on “Permission rule”: refuses at the tool boundary.',
    );

    await node(page, 'Project instructions').click();
    await expect(rung(page, 'instructions')).toHaveAttribute('data-lit', 'true');
    await expect(rung(page, 'permission')).toHaveAttribute('data-lit', 'false');
    await expect(page.getByTestId('ladder-strip')).toContainText('asks, if it loads');
  });

  test('a mechanism with no rung lights nothing and says why', async ({ page }) => {
    await openPicker(page);

    await node(page, 'Dynamic workflow').click();
    await expect(page.locator('[data-testid="ladder-strip"] [data-lit="true"]')).toHaveCount(0);
    await expect(page.getByTestId('ladder-strip')).toContainText(
      'Dynamic workflow isn’t on the ladder.',
    );
  });

  test('acceptance 5: the Context chip highlights instructions, skills, and subagents', async ({
    page,
  }) => {
    await openPicker(page);

    await page.getByRole('button', { name: 'Context', exact: true }).click();
    for (const id of ['instructions', 'skill', 'subagent']) {
      await expect(page.locator(`table [data-mechanism="${id}"]`)).toHaveAttribute(
        'data-highlighted',
        'true',
      );
    }
    await expect(page.locator('table [data-mechanism="ci"]')).toHaveAttribute(
      'data-highlighted',
      'false',
    );
    await expect(page.getByTestId('concern-note')).toContainText(
      'Project instructions, Skill, Subagent',
    );

    await page.getByRole('button', { name: 'Context', exact: true }).click();
    await expect(page.locator('table [data-highlighted="true"]')).toHaveCount(0);
  });

  test('the hook card lists the outline’s anti-patterns and links to CI', async ({ page }) => {
    await openPicker(page);
    await node(page, 'Hook').click();

    const card = page.getByTestId('mechanism-card');
    await expect(card.getByRole('heading', { name: 'Hook', exact: true })).toBeVisible();
    await expect(card.getByTestId('anti-patterns').getByRole('listitem')).toHaveCount(7);
    await expect(card).toContainText('Run a dependency audit every Monday.');
    await expect(card).toContainText('Monday is a scheduling event, not an agent lifecycle event.');
    await expect(card).toContainText('From the course outline');

    await card
      .getByTestId('anti-patterns')
      .getByRole('listitem')
      .filter({ hasText: 'Ensure all contributors obey this check.' })
      .getByRole('button', { name: 'Required CI check' })
      .click();
    await expect(page.getByTestId('mechanism-card')).toHaveAttribute('data-mechanism', 'ci');
    await expect(
      page.getByRole('heading', { name: 'Required CI check', exact: true }),
    ).toBeFocused();
    await expect(rung(page, 'ci')).toHaveAttribute('data-lit', 'true');
  });

  test('shows a definition on hover and on focus', async ({ page }) => {
    await openPicker(page);

    await node(page, 'Routine or scheduled task').hover();
    await expect(page.getByRole('tooltip')).toContainText('runs on a schedule');

    await node(page, 'Skill').focus();
    await expect(page.getByRole('tooltip')).toContainText('Reusable instructions');
    await expect(node(page, 'Skill')).toHaveAttribute('aria-describedby', 'map-tooltip');

    await page.keyboard.press('Escape');
    await expect(page.getByRole('tooltip')).toHaveCount(0);
  });

  test('switches modes from the keyboard', async ({ page }) => {
    await openPicker(page);

    await tab(page, 'Map').focus();
    await page.keyboard.press('ArrowRight');
    await expect(tab(page, 'Sort')).toHaveAttribute('aria-selected', 'true');
    await expect(tab(page, 'Sort')).toBeFocused();
    await page.keyboard.press('End');
    await expect(tab(page, 'Lint')).toHaveAttribute('aria-selected', 'true');
    await expect(page).toHaveURL(/#mode=lint$/);
  });
});

test.describe('acceptance 4: the sorting game', () => {
  const expectedOrder = startGame(outlineScenarios, 1234).order;

  const card = (page: Page) => page.getByTestId('scenario-card');
  const place = (page: Page, name: string) =>
    page
      .locator('[data-target]')
      .and(page.getByRole('button', { name, exact: true }))
      .click();
  const next = (page: Page) =>
    page.getByRole('button', { name: /^(Next card|See the review)$/ }).click();

  test('deals the same order for the same seed', async ({ page }) => {
    await openPicker(page, '#mode=sort&seed=1234');

    await expect(page.getByTestId('game-seed')).toHaveText('1234');
    for (const id of expectedOrder.slice(0, 4)) {
      await expect(card(page)).toHaveAttribute('data-scenario', id);
      await place(page, 'Prompt');
      await next(page);
    }

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-hydrated', 'true');
    await expect(card(page)).toHaveAttribute('data-scenario', expectedOrder[0]);
  });

  test('explains a tempting miss and accepts a defensible alternative', async ({ page }) => {
    await openPicker(page, '#mode=sort&seed=1234');

    for (const id of expectedOrder) {
      await expect(card(page)).toHaveAttribute('data-scenario', id);
      if (id === 'monday-audit') {
        await place(page, 'Hook');
        await expect(page.getByTestId('game-feedback')).toHaveAttribute('data-grade', 'miss');
        await expect(page.getByTestId('tempting')).toContainText(
          'Monday is a scheduling event, not an agent lifecycle event.',
        );
        await expect(page.getByTestId('game-feedback')).toContainText(
          'The outline’s answer: Routine or scheduled task',
        );
        break;
      }
      if (id === 'never-read-env') {
        await place(page, 'OS, sandbox, or network');
        await expect(page.getByTestId('game-feedback')).toHaveAttribute(
          'data-grade',
          'alternative',
        );
        await expect(page.getByTestId('game-feedback')).toContainText('A defensible alternative');
        await expect(page.getByTestId('alternatives')).toContainText('OS, sandbox, or network');
        await next(page);
        continue;
      }
      await place(page, 'Prompt');
      await next(page);
    }
  });

  test('ends with a review and retries only the missed cards', async ({ page }) => {
    await openPicker(page, '#mode=sort&seed=1234');

    // Prompt is right only for "One edit you're watching", so every other card is a miss.
    for (let index = 0; index < expectedOrder.length; index += 1) {
      await place(page, 'Prompt');
      await next(page);
    }

    await expect(page.getByTestId('review-summary')).toHaveText(
      '1 of 18 matched the outline, and 17 were misses.',
    );
    await expect(page.getByTestId('review-misses').getByRole('listitem')).toHaveCount(17);
    await expect(page.getByTestId('review-misses')).toContainText('You said Prompt.');

    await page.getByRole('button', { name: 'Retry the 17 missed cards' }).click();
    const missed = expectedOrder.filter((id) => id !== 'one-edit');
    await expect(page.getByTestId('game-progress')).toContainText('Retrying misses');
    await expect(page.getByTestId('game-progress')).toContainText('Card 1 of 17');

    for (const id of missed) {
      await expect(card(page)).toHaveAttribute('data-scenario', id);
      const answer = outlineScenarios.find((scenario) => scenario.id === id)!.answer;
      await page.locator(`[data-target="${answer}"]`).click();
      await expect(page.getByTestId('game-feedback')).toHaveAttribute('data-grade', 'match');
      await next(page);
    }
    await expect(page.getByTestId('review-summary')).toHaveText(
      '17 of 17 matched the outline, and 0 were misses.',
    );
  });

  test('copies a link with the mode and seed', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await openPicker(page, '#mode=sort&seed=77');

    await page.getByRole('button', { name: 'Copy link' }).click();
    await expect(
      page.getByText('Link copied. It deals this game’s order with seed 77'),
    ).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(
      /\/experiments\/mechanism-picker#mode=sort&seed=77$/,
    );
  });

  test('a new shuffle changes the seed in the address', async ({ page }) => {
    await openPicker(page, '#mode=sort&seed=77');

    await page.getByRole('button', { name: 'New shuffle' }).click();
    await expect(page.getByTestId('game-seed')).not.toHaveText('77');
    const seed = await page.getByTestId('game-seed').textContent();
    await expect(page).toHaveURL(new RegExp(`#mode=sort&seed=${seed}$`));
  });
});

test.describe('custom scenarios', () => {
  test('adds a card that joins the deck and survives a reload', async ({ page }) => {
    await openPicker(page, '#mode=sort&seed=5');

    await page.getByLabel('Scenario', { exact: true }).fill('Block pushes that skip the changelog');
    await page.getByLabel('Expected answer', { exact: true }).selectOption('ci');
    await page.getByRole('button', { name: 'Add card' }).click();

    await expect(page.getByTestId('custom-cards')).toContainText(
      'Block pushes that skip the changelog → Required CI check',
    );
    await expect(page.getByTestId('game-progress')).toContainText('of 19');

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-hydrated', 'true');
    await expect(page.getByTestId('custom-cards')).toContainText('Block pushes that skip');
    await expect(page.getByTestId('game-progress')).toContainText('of 19');
  });

  test('imports a shared deck, skips bad cards, and exports it again', async ({ page }) => {
    await openPicker(page, '#mode=sort&seed=5');

    await page.locator('input[type="file"]').setInputFiles(fixture('team-deck.json'));
    await expect(page.getByText('Imported 2 of 3 cards from team-deck.json.')).toBeVisible();
    await expect(page.getByText('Card 3 names a mechanism this guide doesn’t know.')).toBeVisible();
    await expect(page.getByTestId('custom-cards').getByRole('listitem')).toHaveCount(2);

    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export deck as JSON' }).click();
    const file = await download;
    expect(file.suggestedFilename()).toBe('which-primitive-deck.json');
    const exported = JSON.parse(readFileSync(await file.path(), 'utf8'));
    expect(exported.scenarios.map((card: { answer: string }) => card.answer)).toEqual([
      'ci',
      'skill',
    ]);
  });
});

test.describe('the linter', () => {
  test('acceptance 2: classifies the sample and counts one of each', async ({ page }) => {
    await openPicker(page, '#mode=lint');

    await expect(page.getByRole('button', { name: 'The five-line sample' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expectSampleClassifications(page, [1, 2, 3, 4, 5]);
    await expect(lintItem(page, 2).getByTestId('suggestion')).toContainText('deny Read(**/.env*)');
    await expect(lintItem(page, 4).getByTestId('suggestion')).toContainText('formatter or a hook');
    await expect(lintItem(page, 1).getByTestId('rule')).toContainText('“high quality”');
    await expect(page.getByTestId('lint-summary')).toHaveText(
      '5 lines: 1 must-hold rule written as a request, 1 that doesn’t change a decision, 0 skill candidates, 1 good fact, 1 stale-prone, 1 deterministic.',
    );
    await expect(
      page.getByText('A giant living wiki hides the few rules that matter.'),
    ).toBeVisible();
  });

  test('reads an uploaded file and skips its headings and code block', async ({ page }) => {
    await openPicker(page, '#mode=lint');

    await page.locator('input[type="file"]').setInputFiles(fixture('sample-claude.md'));
    await expect(page.getByText('Read sample-claude.md.')).toBeVisible();

    await expect(page.locator('[data-line]')).toHaveCount(6);
    await expect(lintItem(page, 3)).toHaveAttribute('data-classification', 'no-match');
    await expectSampleClassifications(page, [7, 8, 9, 10, 11]);
    await expect(page.getByText('never run this')).toHaveCount(0);
  });

  test('selecting a line lights its rung and opens the rewrite helper', async ({ page }) => {
    await openPicker(page, '#mode=lint');

    await lintItem(page, 2)
      .getByRole('button', { name: /Select line 2/ })
      .click();
    await expect(rung(page, 'permission')).toHaveAttribute('data-lit', 'true');

    await lintItem(page, 1)
      .getByRole('button', { name: /Select line 1/ })
      .click();
    await expect(page.locator('[data-testid="ladder-strip"] [data-lit="true"]')).toHaveCount(0);
    await expect(page.getByTestId('rewrite-preview')).toHaveText(
      'When ____, maintain high quality code, then verify ____.',
    );
    await page.getByLabel('When', { exact: true }).fill('you change billing code');
    await page.getByLabel('Then verify', { exact: true }).fill('that `pnpm test:billing` passes');
    await expect(page.getByTestId('rewrite-preview')).toHaveText(
      'When you change billing code, maintain high quality code, then verify that pnpm test:billing passes.',
    );
  });

  test('downloads the report as Markdown for a pull request', async ({ page }) => {
    await openPicker(page, '#mode=lint');

    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download report' }).click();
    const file = await download;
    expect(file.suggestedFilename()).toBe('instructions-lint.md');

    const report = readFileSync(await file.path(), 'utf8');
    expect(report).toContain('## Instructions lint: CLAUDE.md');
    expect(report).toContain('| Line | Text | Classification | Suggestion | Rule that fired |');
    expect(report).toContain('| 2 | Never read .env files. | **Must hold every time** |');
    expect(report).toContain('deny `Read(**/.env*)`');
  });

  test('copies the report, or selects it when the clipboard refuses', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: () => Promise.reject(new Error('denied')) },
      });
    });
    await openPicker(page, '#mode=lint');

    await page.getByRole('button', { name: 'Copy report as Markdown' }).click();
    await expect(page.getByText('Couldn’t reach the clipboard.')).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Report to copy' })).toHaveValue(
      /\| 4 \| Format files with Prettier after every edit\. \| \*\*Deterministic\*\*/,
    );
  });

  test('handles an empty file and one that is all headings and code', async ({ page }) => {
    await openPicker(page, '#mode=lint');

    await page.getByRole('button', { name: 'Clear', exact: true }).click();
    await expect(page.getByTestId('lint-summary')).toContainText('0 lines:');

    await page
      .getByLabel('Paste your CLAUDE.md or AGENTS.md', { exact: true })
      .fill('# Only a heading\n\n```\nNever read .env files.\n```\n');
    await expect(page.getByTestId('lint-empty')).toBeVisible();
  });

  test('classifies non-English lines as unknown', async ({ page }) => {
    await openPicker(page, '#mode=lint');

    await page
      .getByLabel('Paste your CLAUDE.md or AGENTS.md', { exact: true })
      .fill('- Nunca leas los archivos .env.');
    await expect(lintItem(page, 1).getByTestId('classification')).toHaveText('Unknown');
  });

  test('follows an edited rule', async ({ page }) => {
    await openPicker(page, '#mode=lint');

    await page.getByText('Edit the rules').click();
    await page
      .getByRole('group', { name: 'Doesn’t change a decision' })
      .getByRole('checkbox')
      .uncheck();
    await expect(lintItem(page, 1).getByTestId('classification')).toHaveText('No rule matched');

    await page.getByRole('button', { name: 'Reset the rules' }).click();
    await expect(lintItem(page, 1).getByTestId('classification')).toHaveText(
      'Doesn’t change a decision',
    );
  });

  test('finds the skill candidate and the pointers in the longer example', async ({ page }) => {
    await openPicker(page, '#mode=lint');

    await page.getByRole('button', { name: 'A growing wiki' }).click();
    await expect(page.locator('[data-classification="skill-candidate"]')).toHaveCount(6);
    await expect(page.locator('[data-classification="pointer"]')).toHaveCount(2);
    await expect(page.locator('[data-classification="unknown"]')).toHaveCount(1);
  });

  test('never puts pasted text in a shared link', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await openPicker(page, '#mode=lint');

    await page
      .getByLabel('Paste your CLAUDE.md or AGENTS.md', { exact: true })
      .fill('- Never read sentinel-secret-file.txt');
    await page.getByRole('button', { name: 'Copy link' }).click();
    await expect(page.getByText('Link copied.')).toBeVisible();

    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toMatch(/#mode=lint$/);
    expect(copied).not.toContain('sentinel');
    expect(page.url()).not.toContain('sentinel');
  });
});

test.describe('at phone width', () => {
  for (const colorScheme of ['light', 'dark'] as const) {
    test(`a populated page never scrolls sideways in ${colorScheme} mode`, async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 800 });
      await page.emulateMedia({ colorScheme });
      await openPicker(page);

      await page.getByRole('radio', { name: 'Hook', exact: true }).check();
      await page.getByRole('button', { name: 'Check my answer' }).click();
      await expect(page.getByTestId('predict-feedback')).toBeVisible();

      // The map is a grouped list here, and its tooltips stay inside the page.
      await expect(page.getByTestId('map-list')).toBeVisible();
      await page.getByRole('button', { name: 'Context', exact: true }).click();
      for (const name of ['Routine or scheduled task', 'OS, sandbox, or network', 'Prompt']) {
        const target = page.getByTestId('map-list').locator('[data-mechanism]').filter({
          hasText: name,
        });
        await target.hover();
        await expect(page.getByRole('tooltip')).toBeVisible();
        const box = (await page.getByRole('tooltip').boundingBox())!;
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(360);
        expect(await horizontalOverflow(page)).toBe(0);
      }
      await page.getByTestId('map-list').locator('[data-mechanism="hook"]').focus();
      await expect(page.getByRole('tooltip')).toContainText('Deterministic code');
      expect(await horizontalOverflow(page)).toBe(0);
      await page.getByTestId('map-list').locator('[data-mechanism="hook"]').click();
      await expect(page.getByTestId('mechanism-card')).toBeVisible();
      expect(await horizontalOverflow(page)).toBe(0);

      // The game uses a select instead of dragging.
      await tab(page, 'Sort').click();
      await expect(page.locator('[data-target]').first()).toBeHidden();
      await page.getByLabel('Your answer', { exact: true }).selectOption('hook');
      await page.getByRole('button', { name: 'Place card' }).click();
      await expect(page.getByTestId('game-feedback')).toBeVisible();
      await page
        .getByLabel('Scenario', { exact: true })
        .fill(`A-scenario-with-no-spaces-${'x'.repeat(120)}`);
      await page.getByLabel('Expected answer', { exact: true }).selectOption('hook');
      await page.getByRole('button', { name: 'Add card' }).click();
      await expect(page.getByTestId('custom-cards')).toBeVisible();
      expect(await horizontalOverflow(page)).toBe(0);

      await tab(page, 'Lint').click();
      await page.getByRole('button', { name: 'A growing wiki' }).click();
      await page
        .getByLabel('Paste your CLAUDE.md or AGENTS.md', { exact: true })
        .fill(
          [...sampleLines, `- Never read ${'very-long-path-segment/'.repeat(40)}.env`].join('\n'),
        );
      await lintItem(page, 6)
        .getByRole('button', { name: /Select line 6/ })
        .click();
      await expect(page.getByTestId('rewrite-helper')).toBeVisible();
      await page.getByText('Edit the rules').click();
      expect(await horizontalOverflow(page)).toBe(0);
    });
  }

  test('keeps the map’s tooltip inside the page on a wide screen too', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 800 });
    await openPicker(page);

    for (const name of ['Routine or scheduled task', '/loop', 'Agent team']) {
      await node(page, name).hover();
      const box = (await page.getByRole('tooltip').boundingBox())!;
      expect(box.x + box.width).toBeLessThanOrEqual(1024);
    }
    expect(await horizontalOverflow(page)).toBe(0);
  });
});
