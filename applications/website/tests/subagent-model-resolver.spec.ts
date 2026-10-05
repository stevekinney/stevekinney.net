import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { openExperiment } from './helpers/open-experiment';

// The fixtures are synthetic agent folders and a settings file with a comment
// and a trailing comma, laid out like ~/.claude, a repository's .claude, and a
// managed-settings directory.
const fixture = (name: string): string =>
  fileURLToPath(new URL(`./fixtures/subagent-model-resolver/${name}`, import.meta.url));

const resolverPath = '/experiments/subagent-model-resolver';

const openResolver = (page: Page): Promise<void> => openExperiment(page, resolverPath);

const preset = (page: Page, name: string) => page.getByRole('button', { name, exact: true });

const answerModel = (page: Page) => page.getByTestId('answer-model');

const chooseOption = (page: Page, label: string, value: string) =>
  page.getByLabel(label, { exact: true }).selectOption(value);

const setVersion = (page: Page, version: string) =>
  page.getByLabel('Claude Code version', { exact: true }).fill(version);

const segment = (page: Page, model: string, first: number, last: number) =>
  page.getByRole('button', {
    name: new RegExp(`^${model}, 2\\.1\\.${first}( to 2\\.1\\.${last}, \\d+ versions)?\\.`),
  });

const row = (page: Page, name: string) => page.locator(`tr[data-agent="${name}"]`);

const horizontalOverflow = (page: Page): Promise<number> =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

const folderInput = (page: Page) => page.locator('input[webkitdirectory]');

test('responds with 200 and a descriptive title', async ({ page }) => {
  const response = await page.goto(resolverPath);

  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle(/Which Model Actually Runs/);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Which model actually runs your subagent.' }),
  ).toBeVisible();
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('still shows the answer but disables the controls', async ({ page }) => {
    await page.goto(resolverPath);

    await expect(answerModel(page)).toHaveText('opus');
    await expect(preset(page, 'The classic trap')).toBeDisabled();
    await expect(page.getByLabel('Subagent kind', { exact: true })).toBeDisabled();
  });
});

test.describe('acceptance 1: the classic trap', () => {
  test('resolves to opus on 2.1.278, decided by the definition', async ({ page }) => {
    await openResolver(page);

    await expect(preset(page, 'The classic trap')).toHaveAttribute('aria-pressed', 'true');
    await expect(answerModel(page)).toHaveText('opus');
    await expect(page.getByTestId('answer-why')).toContainText('definition’s model: field wins');
    await expect(page.getByText('On 2.1.278, this subagent runs on')).toBeVisible();

    const ladder = page.getByTestId('resolution-ladder');
    await expect(ladder.locator('[data-step="win"]')).toContainText('model: opus wins');
    await expect(ladder.locator('[data-step="dead"]')).toContainText('haiku');
  });

  test('resolves to haiku on 2.1.250 through the env override', async ({ page }) => {
    await openResolver(page);
    await setVersion(page, '2.1.250');

    await expect(answerModel(page)).toHaveText('haiku');
    await expect(page.getByTestId('resolution-ladder').locator('[data-step="dead"]')).toHaveCount(
      1,
    );
    await expect(page.getByTestId('resolution-ladder')).toContainText('overridden');
  });

  test('flags the flip at 2.1.251 and draws the strip', async ({ page }) => {
    await openResolver(page);

    const flag = page.locator('[data-flag="flips-at-reversal"]');
    await expect(flag).toContainText('Flips at 2.1.251');
    await expect(flag).toContainText('haiku before that release and opus from it on');
    await expect(flag).toContainText('up to a more expensive tier');

    await expect(segment(page, 'haiku', 190, 250)).toBeVisible();
    await expect(segment(page, 'opus', 251, 289)).toBeVisible();
    await expect(page.locator('[data-segment]')).toHaveCount(2);
    await expect(page.getByTestId('flips').getByRole('listitem')).toHaveCount(1);
    await expect(page.getByTestId('flips')).toContainText('more expensive');
  });
});

test.describe('acceptance 2: FORCE set too early', () => {
  test('resolves to opus on 2.1.254 and warns that FORCE is ignored', async ({ page }) => {
    await openResolver(page);
    await preset(page, 'FORCE set too early').click();

    await expect(answerModel(page)).toHaveText('opus');
    await expect(page.locator('[data-flag="force-inert"]')).toContainText(
      'FORCE is set but does nothing here',
    );
    await expect(page.getByTestId('preset-notice')).toContainText('six-version window');
  });

  test('draws haiku, then opus, then haiku, with two flips', async ({ page }) => {
    await openResolver(page);
    await preset(page, 'FORCE set too early').click();

    await expect(segment(page, 'haiku', 190, 250)).toBeVisible();
    await expect(segment(page, 'opus', 251, 256)).toBeVisible();
    await expect(segment(page, 'haiku', 257, 289)).toBeVisible();

    const flips = page.getByTestId('flips').getByRole('listitem');
    await expect(flips).toHaveCount(2);
    await expect(flips.nth(0)).toContainText('2.1.251');
    await expect(flips.nth(0)).toContainText('more expensive');
    await expect(flips.nth(1)).toContainText('2.1.257');
    await expect(flips.nth(1)).toContainText('cheaper');
  });
});

test.describe('acceptance 3: Explore', () => {
  test('resolves to opus and says the env var does not move it', async ({ page }) => {
    await openResolver(page);
    await preset(page, 'Explore’s Opus cap').click();

    await expect(answerModel(page)).toHaveText('opus');
    await expect(page.locator('[data-flag="environment-ignored"]')).toContainText(
      'The env var does not move this subagent',
    );
    await expect(page.locator('[data-flag="explore-cap"]')).toBeVisible();
    await expect(segment(page, 'haiku', 190, 197)).toBeVisible();
    await expect(segment(page, 'opus', 198, 289)).toBeVisible();
  });

  test('resolves to fable from 198 in the uncapped provider group', async ({ page }) => {
    await openResolver(page);
    await preset(page, 'Explore’s Opus cap').click();
    await page.getByRole('button', { name: 'Uncapped', exact: true }).click();

    await expect(answerModel(page)).toHaveText('fable');
    await expect(segment(page, 'haiku', 190, 197)).toBeVisible();
    await expect(segment(page, 'fable', 198, 289)).toBeVisible();
    await expect(page.locator('[data-flag="explore-cap"]')).toHaveCount(0);
  });

  test('inherits an unrecognized model from 284 on in the capped group', async ({ page }) => {
    await openResolver(page);
    await preset(page, 'Explore’s Opus cap').click();
    await chooseOption(page, 'Main conversation model', 'unrecognized');

    await expect(segment(page, 'haiku', 190, 197)).toBeVisible();
    await expect(segment(page, 'opus', 198, 283)).toBeVisible();
    await expect(segment(page, 'unrecognized model ID', 284, 289)).toBeVisible();
    // No tier means the flip can't be called cheaper or pricier.
    await expect(page.getByTestId('flips')).toContainText('tier unknown');
  });

  test('keeps Explore on opus under FORCE with no env var', async ({ page }) => {
    await openResolver(page);
    await preset(page, 'Explore’s Opus cap').click();
    await chooseOption(page, 'CLAUDE_CODE_SUBAGENT_MODEL', 'unset');
    await page.getByRole('button', { name: '=1', exact: true }).click();
    await setVersion(page, '2.1.260');

    await expect(answerModel(page)).toHaveText('opus');
  });
});

test('acceptance 4: inherit resolves to sonnet on 2.1.194 and flips once, at 196', async ({
  page,
}) => {
  await openResolver(page);
  await preset(page, 'When inherit meant something else').click();

  await expect(answerModel(page)).toHaveText('sonnet');
  await expect(page.getByTestId('answer-why')).toContainText('inherit');

  const flips = page.getByTestId('flips').getByRole('listitem');
  await expect(flips).toHaveCount(1);
  await expect(flips).toContainText('2.1.196');
  await expect(flips).toContainText('sonnet');
  await expect(flips).toContainText('opus');
});

test('acceptance 5: a setup with no surprises resolves to sonnet on every version', async ({
  page,
}) => {
  await openResolver(page);
  await preset(page, 'A setup with no surprises').click();

  await expect(answerModel(page)).toHaveText('sonnet');
  await expect(page.locator('[data-segment]')).toHaveCount(1);
  await expect(page.getByTestId('no-flips')).toContainText('No change across this range');
  await expect(page.locator('[data-flag]')).toHaveCount(0);
});

test('acceptance 6: a fork under FORCE runs on the main model and is exempt', async ({ page }) => {
  await openResolver(page);
  await chooseOption(page, 'Subagent kind', 'fork');
  await chooseOption(page, 'Main conversation model', 'fable');
  await page.getByRole('button', { name: '=1', exact: true }).click();
  await setVersion(page, '2.1.260');

  await expect(answerModel(page)).toHaveText('fable');
  await expect(page.locator('[data-flag="force-exempt"]')).toContainText('Exempt from FORCE');
  await expect(page.getByTestId('resolution-ladder')).toContainText('Fork exception under FORCE');
});

test('acceptance 7: a resume drops the per-invocation model before 2.1.211', async ({ page }) => {
  await openResolver(page);
  await chooseOption(page, 'Definition model: field', 'sonnet');
  await chooseOption(page, 'Per-invocation model', 'opus');
  await chooseOption(page, 'CLAUDE_CODE_SUBAGENT_MODEL', 'unset');
  await page.getByRole('button', { name: 'Yes', exact: true }).click();

  await setVersion(page, '2.1.205');
  await expect(answerModel(page)).toHaveText('sonnet');
  await expect(page.getByTestId('resolution-ladder')).toContainText(
    'A resume before 2.1.211 drops the per-invocation model.',
  );

  await setVersion(page, '2.1.215');
  await expect(answerModel(page)).toHaveText('opus');
});

test.describe('the controls', () => {
  test('any edit deselects the preset and a preset restores it', async ({ page }) => {
    await openResolver(page);
    await expect(page.getByTestId('preset-notice')).toContainText('Until 2.1.251');

    await chooseOption(page, 'Main conversation model', 'opus');

    await expect(preset(page, 'The classic trap')).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByTestId('preset-notice')).toHaveText(
      'Custom scenario—pick a preset to get back to a worked example.',
    );

    await preset(page, 'The classic trap').click();
    await expect(page.getByLabel('Main conversation model', { exact: true })).toHaveValue('sonnet');
    await expect(page.getByTestId('preset-notice')).toContainText('Until 2.1.251');
  });

  test('locks the definition control for a skill and for general-purpose', async ({ page }) => {
    await openResolver(page);
    const definition = page.getByLabel('Definition model: field', { exact: true });

    await chooseOption(page, 'Subagent kind', 'skill-inherit');
    await expect(definition).toBeDisabled();
    await expect(definition).toHaveValue('inherit');

    await chooseOption(page, 'Subagent kind', 'general-purpose');
    await expect(definition).toBeDisabled();
    await expect(definition).toHaveValue('unset');
  });

  test('exposes toggles as pressed buttons and lists the providers in a tooltip', async ({
    page,
  }) => {
    await openResolver(page);

    const capped = page.getByRole('button', { name: 'Capped', exact: true });
    await expect(capped).toHaveAttribute('aria-pressed', 'true');

    await capped.focus();
    await expect(page.getByRole('tooltip').filter({ hasText: 'Anthropic Console' })).toBeVisible();

    await page.getByRole('button', { name: 'Uncapped', exact: true }).focus();
    await expect(page.getByRole('tooltip').filter({ hasText: 'Amazon Bedrock' })).toBeVisible();
  });

  test('moves the version when a strip segment or a flip is chosen', async ({ page }) => {
    await openResolver(page);
    const version = page.getByLabel('Claude Code version', { exact: true });

    await segment(page, 'haiku', 190, 250).click();
    await expect(version).toHaveValue('2.1.190');
    await expect(answerModel(page)).toHaveText('haiku');

    await page.getByTestId('flips').getByRole('button').click();
    await expect(version).toHaveValue('2.1.251');
    await expect(answerModel(page)).toHaveText('opus');
  });

  test('follows the slider', async ({ page }) => {
    await openResolver(page);

    await page.getByRole('slider').fill('200');

    await expect(page.getByLabel('Claude Code version', { exact: true })).toHaveValue('2.1.200');
    await expect(answerModel(page)).toHaveText('haiku');
  });

  test('flags a version it cannot read and clamps one outside the range', async ({ page }) => {
    await openResolver(page);
    const version = page.getByLabel('Claude Code version', { exact: true });

    await version.fill('soon');
    await expect(version).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByText('Enter a version like 2.1.278.')).toBeVisible();
    await expect(answerModel(page)).toHaveText('opus');

    await version.fill('2.1.400');
    await expect(
      page.getByText('2.1.400 is outside the range, so this page shows 2.1.289.'),
    ).toBeVisible();
    await expect(page.getByText('On 2.1.289, this subagent runs on')).toBeVisible();
  });

  test('lets the version range change', async ({ page }) => {
    await openResolver(page);
    await page.getByText('Change the version range').click();

    await page.getByLabel('Last version', { exact: true }).fill('2.1.300');

    await expect(segment(page, 'opus', 251, 300)).toBeVisible();
    await page.getByLabel('First version', { exact: true }).fill('2.1.300');
    await expect(page.getByText('Both versions need to be in the same 2.x line')).toBeVisible();
  });
});

test.describe('sharing', () => {
  test('writes the controls to the address’s hash and restores them on load', async ({ page }) => {
    await openResolver(page);
    await chooseOption(page, 'Main conversation model', 'opus');
    await setVersion(page, '2.1.250');

    await expect(page).toHaveURL(/main=opus/);
    await expect(page).toHaveURL(/version=2\.1\.250/);

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-hydrated', 'true');
    await expect(page.getByLabel('Main conversation model', { exact: true })).toHaveValue('opus');
    await expect(answerModel(page)).toHaveText('haiku');
    await expect(preset(page, 'The classic trap')).toHaveAttribute('aria-pressed', 'false');
  });

  test('restores a preset from a link', async ({ page }) => {
    await openResolver(page);
    await preset(page, 'Explore’s Opus cap').click();

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-hydrated', 'true');
    await expect(preset(page, 'Explore’s Opus cap')).toHaveAttribute('aria-pressed', 'true');
  });

  test('copies a link that holds the controls and nothing uploaded', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await openResolver(page);
    await page
      .locator('input[type="file"]')
      .first()
      .setInputFiles({
        name: 'secret-agent.md',
        mimeType: 'text/markdown',
        buffer: Buffer.from('---\nname: secret-agent\nmodel: opus\n---\nsecret prompt text'),
      });
    await expect(row(page, 'secret-agent')).toBeVisible();

    await page.getByRole('button', { name: 'Copy link to this scenario' }).click();
    await expect(page.getByText('Link copied.')).toBeVisible();

    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toContain('kind=custom');
    expect(copied).not.toContain('secret');
  });

  test('falls back to selecting the link when the clipboard refuses', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: () => Promise.reject(new Error('denied')) },
      });
    });
    await openResolver(page);

    await page.getByRole('button', { name: 'Copy link to this scenario' }).click();

    await expect(page.getByText('Press ⌘/Ctrl+C to copy the link.')).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Link to this scenario' })).toHaveValue(
      /kind=custom/,
    );
  });
});

test.describe('the reference tables', () => {
  test('lists every boundary with its source', async ({ page }) => {
    await openResolver(page);

    const table = page.getByRole('region', { name: 'Releases that change the answer' });
    await expect(table.locator('tbody tr')).toHaveCount(10);
    await expect(table.getByRole('row').filter({ hasText: '2.1.196' })).toContainText('docs only');
    await expect(table.getByRole('row').filter({ hasText: '2.1.223' })).toContainText('changelog');
    await expect(table.getByRole('row').filter({ hasText: '2.1.251' })).toContainText(
      'changelog + docs',
    );
  });

  test('says what is not modelled and when the rules were verified', async ({ page }) => {
    await openResolver(page);

    const notes = page.locator('footer[aria-labelledby="notes-heading"]');
    await expect(notes).toContainText('forks, and skills running with model: inherit');
    await expect(notes).toContainText('organization’s model allowlist');
    await expect(notes).toContainText('exact version');
    await expect(notes).toContainText('2.1.242');
    await expect(notes).toContainText('2026-10-04');
    await expect(notes).toContainText('/tasks');
  });
});

test.describe('check your own setup', () => {
  test('shows the right commands for the visitor’s operating system', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'platform', { get: () => 'Win32' });
    });
    await openResolver(page);

    await expect(page.getByRole('button', { name: 'Windows PowerShell' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page.getByTestId('commands')).toContainText('Select-String');

    await page.getByRole('button', { name: 'macOS / Linux' }).click();
    await expect(page.getByTestId('commands')).toContainText("grep -sH '^model:'");
  });

  test('falls back to selecting the commands when the clipboard refuses', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: () => Promise.reject(new Error('denied')) },
      });
    });
    await openResolver(page);

    await page.getByRole('button', { name: 'Copy', exact: true }).click();

    await expect(page.getByText('Press ⌘/Ctrl+C to copy.')).toBeVisible();
    expect(await page.evaluate(() => window.getSelection()?.toString())).toContain(
      'claude --version',
    );
  });

  test('acceptance 8: reads pasted output', async ({ page }) => {
    await openResolver(page);

    await page
      .getByLabel('Paste the output here', { exact: true })
      .fill(
        [
          '2.1.240 (Claude Code)',
          'CLAUDE_CODE_SUBAGENT_MODEL=haiku',
          'C:\\Users\\x\\.claude\\agents\\reviewer.md:3:model: opus',
        ].join('\n'),
      );

    await expect(page.getByText('Read 3 lines.')).toBeVisible();
    await expect(row(page, 'reviewer')).toContainText('opus');
    await expect(row(page, 'reviewer')).toContainText('User');
    await expect(page.getByTestId('assumptions')).toContainText('Version 2.1.240');
    await expect(page.getByTestId('fleet-verdict')).toContainText(
      /1 of \d+ agents will change when you pass 2\.1\.251/,
    );
  });

  test('acceptance 8: reads FORCE as FORCE and not as the env model', async ({ page }) => {
    await openResolver(page);

    await page
      .getByLabel('Paste the output here', { exact: true })
      .fill('CLAUDE_CODE_SUBAGENT_MODEL_FORCE=1');

    const assumptions = page.getByTestId('assumptions');
    await expect(assumptions).toContainText('FORCE is on');
    await expect(assumptions).toContainText(
      'wasn’t found in what you gave me, so I’m treating it as unset',
    );
    await expect(page.getByTestId('fleet-verdict')).toContainText(
      'FORCE is on—every model: field is being ignored',
    );
  });

  test('shows the lines it expects when nothing parses', async ({ page }) => {
    await openResolver(page);

    await page.getByLabel('Paste the output here', { exact: true }).fill('hello there');

    await expect(page.getByText('None of those lines could be read.')).toBeVisible();
    await expect(page.getByText('CLAUDE_CODE_SUBAGENT_MODEL=haiku').first()).toBeVisible();
  });

  test('uses a version from the version field', async ({ page }) => {
    await openResolver(page);
    await page
      .getByLabel('Paste the output here', { exact: true })
      .fill('/x/.claude/agents/a.md:1:model: opus');
    await page.getByLabel('Your Claude Code version (optional)').fill('2.1.250 (Claude Code)');

    await expect(page.getByTestId('assumptions')).toContainText(
      'Version 2.1.250, from the version field.',
    );
  });
});

test.describe('acceptance 9: uploads', () => {
  test('resolves the project reviewer and marks the user one shadowed by it', async ({ page }) => {
    await openResolver(page);
    await folderInput(page).setInputFiles(fixture('home'));
    await expect(page.getByText('Read 2 agent files and 1 settings file.')).toBeVisible();
    await folderInput(page).setInputFiles(fixture('repository'));
    await expect(page.getByText('Read 3 agent files and 0 settings files.')).toBeVisible();

    const reviewers = row(page, 'reviewer');
    await expect(reviewers).toHaveCount(2);

    const running = reviewers.filter({
      has: page.locator('xpath=self::*[@data-status="effective"]'),
    });
    await expect(running).toHaveCount(1);
    await expect(running).toContainText('Project');

    const shadowed = page.locator('tr[data-agent="reviewer"][data-status="shadowed"]');
    await expect(shadowed).toHaveCount(1);
    await expect(shadowed).toContainText('Shadowed by the project definition');
    await expect(shadowed).toContainText('repository/.claude/agents/reviewer.md');
    await expect(shadowed).toContainText('User');
  });

  test('lets a managed agent with the same name shadow both', async ({ page }) => {
    await openResolver(page);
    await folderInput(page).setInputFiles(fixture('home'));
    await expect(page.getByText('Read 2 agent files and 1 settings file.')).toBeVisible();
    await folderInput(page).setInputFiles(fixture('repository'));
    await expect(page.getByText('Read 3 agent files')).toBeVisible();
    await folderInput(page).setInputFiles(fixture('managed'));
    await expect(page.getByText('Read 1 agent file')).toBeVisible();

    await expect(page.locator('tr[data-agent="reviewer"][data-status="shadowed"]')).toHaveCount(2);
    const winner = page.locator('tr[data-agent="reviewer"][data-status="effective"]');
    await expect(winner).toHaveCount(1);
    await expect(winner).toContainText('Managed');
    await expect(
      page.locator('tr[data-agent="reviewer"][data-status="shadowed"]').first(),
    ).toContainText('Shadowed by the managed definition');
  });

  test('lets the person correct a guessed scope', async ({ page }) => {
    await openResolver(page);
    await folderInput(page).setInputFiles(fixture('home'));
    await expect(page.getByText('Read 2 agent files and 1 settings file.')).toBeVisible();
    await folderInput(page).setInputFiles(fixture('repository'));
    await expect(page.getByText('Read 3 agent files')).toBeVisible();

    await page
      .getByLabel('home/.claude/agents (2 agents)', { exact: true })
      .selectOption('managed');

    await expect(page.locator('tr[data-agent="reviewer"][data-status="effective"]')).toContainText(
      'Managed',
    );
    await expect(page.locator('tr[data-agent="reviewer"][data-status="shadowed"]')).toContainText(
      'Project',
    );
  });

  test('replaces the synthetic Explore row with a project agent named Explore', async ({
    page,
  }) => {
    await openResolver(page);
    // An Opus session on 2.1.278 with no env override. The built-in Explore would inherit the
    // session's Opus here, so only the project agent's own `model: haiku` can produce haiku. With
    // the env var set to haiku, as the default controls have it, either path would read haiku.
    await chooseOption(page, 'Main conversation model', 'opus');
    await setVersion(page, '2.1.278');
    await chooseOption(page, 'CLAUDE_CODE_SUBAGENT_MODEL', 'unset');
    await folderInput(page).setInputFiles(fixture('repository'));
    await expect(page.getByText('Read 3 agent files')).toBeVisible();

    await expect(row(page, 'Explore')).toHaveCount(1);
    await expect(row(page, 'Explore')).toContainText('Overrides the built-in');
    await expect(row(page, 'Explore')).toContainText('Project');
    const after = row(page, 'Explore').getByRole('cell').nth(3);
    await expect(after).toContainText('haiku');
    await expect(after).not.toContainText('opus');
    await expect(row(page, 'Plan')).toHaveCount(1);
    await expect(row(page, 'general-purpose')).toHaveCount(1);
  });

  test('lists an agent with no model line as declaring not set', async ({ page }) => {
    await openResolver(page);
    await folderInput(page).setInputFiles(fixture('home'));
    await expect(page.getByText('Read 2 agent files')).toBeVisible();

    await expect(row(page, 'quiet-helper').getByRole('cell').nth(1)).toHaveText('not set');

    await page.getByRole('button', { name: /^No model: line/ }).click();
    await expect(page.locator('tbody tr[data-agent]')).toHaveCount(1);
    await expect(row(page, 'quiet-helper')).toBeVisible();
  });

  test('reads settings with comments and trailing commas, and says so', async ({ page }) => {
    await openResolver(page);
    await folderInput(page).setInputFiles(fixture('home'));
    await expect(page.getByText('Read 2 agent files and 1 settings file.')).toBeVisible();

    const assumptions = page.getByTestId('assumptions');
    await expect(assumptions).toContainText(
      'CLAUDE_CODE_SUBAGENT_MODEL is `haiku`'.replace(/`/g, ''),
    );
    await expect(assumptions).toContainText('home/.claude/settings.json');
    await expect(assumptions).toContainText('Main model is sonnet');
    await expect(page.getByTestId('warnings')).toContainText('comments or trailing commas');
  });

  test('warns about an unknown model and treats it as unrecognized', async ({ page }) => {
    await openResolver(page);
    await folderInput(page).setInputFiles(fixture('repository'));
    await expect(page.getByText('Read 3 agent files')).toBeVisible();

    await expect(row(page, 'planner-ish')).toContainText('my-proxy-model (unknown)');
    await expect(row(page, 'planner-ish')).toContainText('isn’t a model family');
  });

  test('counts changes, sorts them first, and filters', async ({ page }) => {
    await openResolver(page);
    await folderInput(page).setInputFiles(fixture('home'));
    await expect(page.getByText('Read 2 agent files and 1 settings file.')).toBeVisible();
    await folderInput(page).setInputFiles(fixture('repository'));
    await expect(page.getByText('Read 3 agent files')).toBeVisible();

    await expect(page.getByTestId('fleet-verdict')).toHaveText('2 of 6 agents changed at 2.1.251');
    await expect(page.getByTestId('fleet-summary')).toContainText('1 move up a tier');
    await expect(page.locator('tbody tr[data-agent]').first()).toHaveAttribute(
      'data-status',
      'effective',
    );
    await expect(row(page, 'planner-ish')).toContainText('unrecognized');

    await page.getByRole('button', { name: /^Changed only/ }).click();
    await expect(page.locator('tbody tr[data-agent]')).toHaveCount(2);

    await page.getByRole('button', { name: /^Shadowed/ }).click();
    await expect(page.locator('tbody tr[data-agent]')).toHaveCount(1);
    await expect(page.locator('tbody tr[data-agent]')).toHaveAttribute('data-status', 'shadowed');
  });

  test('loads a clicked row into the resolver', async ({ page }) => {
    await openResolver(page);
    await folderInput(page).setInputFiles(fixture('home'));
    await expect(page.getByText('Read 2 agent files and 1 settings file.')).toBeVisible();
    await folderInput(page).setInputFiles(fixture('repository'));
    await expect(page.getByText('Read 3 agent files')).toBeVisible();

    await page.getByRole('button', { name: 'Show reviewer in the resolver' }).click();

    await expect(page.getByLabel('Definition model: field', { exact: true })).toHaveValue('opus');
    await expect(page.getByLabel('Subagent kind', { exact: true })).toHaveValue('custom');
    await expect(page.getByLabel('CLAUDE_CODE_SUBAGENT_MODEL', { exact: true })).toHaveValue(
      'haiku',
    );
    await expect(answerModel(page)).toHaveText('opus');
    await expect(page.getByTestId('preset-notice')).toContainText('Custom scenario');
  });

  test('recomputes for the upgrade planner’s two versions', async ({ page }) => {
    await openResolver(page);
    await folderInput(page).setInputFiles(fixture('home'));
    await expect(page.getByText('Read 2 agent files and 1 settings file.')).toBeVisible();
    await folderInput(page).setInputFiles(fixture('repository'));
    await expect(page.getByText('Read 3 agent files')).toBeVisible();

    await page.getByRole('button', { name: 'Upgrade planner' }).click();
    await expect(page.getByLabel('From version', { exact: true })).toHaveValue('2.1.278');
    await expect(page.getByLabel('To version', { exact: true })).toHaveValue('2.1.289');
    await expect(page.getByTestId('fleet-summary')).toContainText('0 move up a tier');

    await page.getByLabel('From version', { exact: true }).fill('2.1.240');
    await page.getByLabel('To version', { exact: true }).fill('2.1.260');

    await expect(page.getByTestId('fleet-summary')).toContainText('1 move up a tier');
    await expect(page.getByRole('columnheader', { name: 'On 2.1.240' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'On 2.1.260' })).toBeVisible();
  });

  test('offers a patched copy with a diff, and never edits the original', async ({ page }) => {
    await openResolver(page);
    await folderInput(page).setInputFiles(fixture('home'));
    await expect(page.getByText('Read 2 agent files and 1 settings file.')).toBeVisible();
    await folderInput(page).setInputFiles(fixture('repository'));
    await expect(page.getByText('Read 3 agent files')).toBeVisible();

    const fix = page.locator('details[data-fix="reviewer"]');
    await fix.getByText('reviewer', { exact: false }).first().click();
    await expect(fix).toContainText(
      'Change model: opus to model: haiku in repository/.claude/agents/reviewer.md.',
    );
    await expect(fix).toContainText('- model: opus');
    await expect(fix).toContainText('+ model: haiku');
    await expect(fix).toContainText('CLAUDE_CODE_SUBAGENT_MODEL_FORCE=1');

    const downloading = page.waitForEvent('download');
    await fix.getByRole('button', { name: 'Download patched reviewer.md' }).click();
    const download = await downloading;
    expect(download.suggestedFilename()).toBe('reviewer.md');

    const path = await download.path();
    const patched = readFileSync(path, 'utf8');
    expect(patched).toContain('model: haiku');
    expect(patched).not.toContain('model: opus');
    expect(patched).toContain('You review changes for this project.');
    expect(readFileSync(fixture('repository/.claude/agents/reviewer.md'), 'utf8')).toContain(
      'model: opus',
    );
  });

  test('exports the audit as Markdown and CSV', async ({ page }) => {
    await openResolver(page);
    await folderInput(page).setInputFiles(fixture('repository'));
    await expect(page.getByText('Read 3 agent files')).toBeVisible();

    const markdown = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download audit report (Markdown)' }).click();
    const markdownFile = await markdown;
    expect(markdownFile.suggestedFilename()).toBe('subagent-model-audit.md');
    const report = readFileSync(await markdownFile.path(), 'utf8');
    expect(report).toContain('# Subagent model audit');
    expect(report).toContain('reviewer');

    const csv = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download table (CSV)' }).click();
    const csvFile = await csv;
    expect(csvFile.suggestedFilename()).toBe('subagent-model-audit.csv');
    const table = readFileSync(await csvFile.path(), 'utf8');
    expect(table.split('\r\n')[0]).toMatch(/^agent,scope,declares,/);
    expect(table).toContain('planner-ish');
  });

  test('escapes agent names and descriptions from files', async ({ page }) => {
    await openResolver(page);
    await page
      .locator('input[type="file"]')
      .first()
      .setInputFiles({
        name: 'hostile.md',
        mimeType: 'text/markdown',
        buffer: Buffer.from(
          '---\nname: <img src=x onerror="window.__pwned = true">\ndescription: <script>window.__pwned = true</script>\nmodel: opus\n---\nbody',
        ),
      });

    await expect(page.locator('tr[data-agent]').filter({ hasText: '<img src=x' })).toBeVisible();
    expect(
      await page.evaluate(() => (window as unknown as { __pwned?: boolean }).__pwned),
    ).toBeUndefined();
    await expect(page.locator('img[src="x"]')).toHaveCount(0);
  });

  test('keeps the page from scrolling sideways at phone width with a populated table', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await openResolver(page);
    await folderInput(page).setInputFiles(fixture('home'));
    await expect(page.getByText('Read 2 agent files and 1 settings file.')).toBeVisible();
    await folderInput(page).setInputFiles(fixture('repository'));
    await expect(page.getByText('Read 3 agent files')).toBeVisible();
    await page.getByRole('button', { name: /^Changed only/ }).click();
    await page.locator('details[data-fix="reviewer"] summary').click();

    expect(await horizontalOverflow(page)).toBe(0);
    await expect(page.getByRole('region', { name: 'Fleet table' })).toBeVisible();
  });

  test('stays responsive with 250 agents and scrolls the table inside its own container', async ({
    page,
  }) => {
    await openResolver(page);
    const files = Array.from({ length: 250 }, (_, index) => ({
      name: `agent-${index}.md`,
      mimeType: 'text/markdown',
      buffer: Buffer.from(`---\nname: agent-${index}\nmodel: opus\n---\nbody`),
    }));
    await page.locator('input[type="file"]').first().setInputFiles(files);

    await expect(row(page, 'agent-249')).toHaveCount(1);
    const region = page.getByRole('region', { name: 'Fleet table' });
    const { scrollHeight, clientHeight } = await region.evaluate((element) => ({
      scrollHeight: element.scrollHeight,
      clientHeight: element.clientHeight,
    }));
    expect(scrollHeight).toBeGreaterThan(clientHeight);
    expect(clientHeight).toBeLessThanOrEqual(460);
  });
});

test('shows the populated resolver without sideways scroll at phone width in both themes', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  for (const colorScheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme });
    await openResolver(page);
    await preset(page, 'FORCE set too early').click();

    expect(await horizontalOverflow(page)).toBe(0);
  }
});
