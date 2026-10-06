import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { openExperiment } from './helpers/open-experiment';

// Synthetic skills: a Codex skill folder with an agents/openai.yaml and a
// reference file, a Claude Code skill that uses the undocumented
// disallowedTools alias and a key neither tool reads, and a SKILL.md whose
// frontmatter doesn't parse.
const fixtures = fileURLToPath(new URL('./fixtures/skill-editor/', import.meta.url));

const path = '/experiments/skill-editor';

const dropZone = (page: Page): Locator =>
  page.getByRole('group', { name: 'Drop a SKILL.md or a skill folder here' });

const chooseFile = (page: Page, file: string): Promise<void> =>
  dropZone(page).locator('input[type="file"]:not([webkitdirectory])').setInputFiles(file);

const chooseFolder = (page: Page, folder: string): Promise<void> =>
  dropZone(page).locator('input[webkitdirectory]').setInputFiles(folder);

const verdict = (page: Page): Locator => page.getByTestId('verdict');

const preview = (page: Page, filePath: string): Locator =>
  page.getByRole('region', { name: `${filePath} preview` });

const chooseTarget = async (page: Page, target: 'claude' | 'codex'): Promise<void> => {
  await page.locator(`label:has(input[name="skill-target"][value="${target}"])`).click();
  await expect(page.locator(`input[name="skill-target"][value="${target}"]`)).toBeChecked();
};

const horizontalOverflow = (page: Page): Promise<number> =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('shows the sample’s verdict and exported file before anything runs', async ({ page }) => {
    const response = await page.goto(path);

    expect(response?.status()).toBe(200);
    await expect(verdict(page)).toHaveText('Ready for Claude Code');
    await expect(preview(page, 'release-notes/SKILL.md')).toContainText('name: release-notes');
  });
});

test('opens on a sample that passes for Claude Code', async ({ page }) => {
  await openExperiment(page, path);

  await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toHaveText(
    'Skill Editor',
  );
  await expect(verdict(page)).toHaveText('Ready for Claude Code');
  await expect(page.locator('#skill-name')).toHaveValue('release-notes');
  await expect(preview(page, 'release-notes/SKILL.md')).toContainText(
    'allowed-tools:\n  - Bash(git describe *)',
  );
  await expect(page.getByTestId('line-count')).toContainText('SKILL.md is 32 lines.');
});

test('updates the preview, the verdict, and the field as a field changes', async ({ page }) => {
  await openExperiment(page, path);

  await page.locator('#skill-name').fill('Release Notes');

  await expect(verdict(page)).toHaveText('1 error to fix');
  await expect(page.getByTestId('verdict-issues')).toContainText('must be lowercase alphanumeric');
  await expect(page.locator('#skill-name-issues')).toContainText('Use lowercase letters');
  await expect(preview(page, 'Release Notes/SKILL.md')).toContainText('name: Release Notes');

  await page.locator('#skill-name').fill('changelog-entry');
  await expect(verdict(page)).toHaveText('Ready for Claude Code');
  await expect(preview(page, 'changelog-entry/SKILL.md')).toContainText('name: changelog-entry');
});

test('keeps Claude-only fields through a switch to Codex and back', async ({ page }) => {
  await openExperiment(page, path);

  await page.locator('#skill-when_to_use').fill('Also when a pull request is labeled release.');
  await expect(preview(page, 'release-notes/SKILL.md')).toContainText('when_to_use: Also when');

  await chooseTarget(page, 'codex');
  await expect(verdict(page)).toHaveText('Ready for Codex');
  await expect(page.locator('#skill-when_to_use')).toHaveCount(0);
  await expect(page.getByTestId('not-written')).toContainText('when_to_use, argument-hint');
  await expect(preview(page, 'release-notes/SKILL.md')).not.toContainText('when_to_use');
  await expect(preview(page, 'release-notes/SKILL.md')).not.toContainText('argument-hint');
  await expect(page.getByRole('heading', { name: 'Export for Codex' })).toBeVisible();

  await chooseTarget(page, 'claude');
  await expect(page.locator('#skill-when_to_use')).toHaveValue(
    'Also when a pull request is labeled release.',
  );
  await expect(preview(page, 'release-notes/SKILL.md')).toContainText('when_to_use: Also when');
});

test.describe('tools', () => {
  test('pre-approves a rule built in the rule editor', async ({ page }) => {
    await openExperiment(page, path);

    await expect(page.locator('details[data-group="tools"]')).toHaveAttribute('open', '');
    await page.locator('#skill-allowed-tools-tool').selectOption('WebFetch');
    await page.locator('#skill-allowed-tools-specifier').fill('domain:docs.example.com');
    await page.getByRole('button', { name: 'Add rule' }).click();

    await expect(page.getByRole('list', { name: 'Pre-approved rules' })).toContainText(
      'WebFetch(domain:docs.example.com)',
    );
    await expect(preview(page, 'release-notes/SKILL.md')).toContainText(
      '  - Read\n  - WebFetch(domain:docs.example.com)\n',
    );
    await expect(verdict(page)).toHaveText('Ready for Claude Code');

    await page.getByRole('button', { name: 'Remove Read' }).click();
    await expect(preview(page, 'release-notes/SKILL.md')).not.toContainText('  - Read\n');
  });

  test('removes a tool while the skill runs by unchecking it', async ({ page }) => {
    await openExperiment(page, path);

    const removal = page.getByRole('group', {
      name: 'Checked tools stay available while the skill runs.',
    });
    const write = removal.getByRole('checkbox', { name: /^Write\b/ });
    await expect(write).toBeChecked();
    await expect(preview(page, 'release-notes/SKILL.md')).not.toContainText('disallowed-tools');

    await write.uncheck();
    await expect(preview(page, 'release-notes/SKILL.md')).toContainText(
      'disallowed-tools:\n  - Write\n',
    );

    await write.check();
    await expect(preview(page, 'release-notes/SKILL.md')).not.toContainText('disallowed-tools');
  });

  test('keeps EndConversation, which disallowed-tools can’t remove', async ({ page }) => {
    await openExperiment(page, path);

    const removal = page.getByRole('group', {
      name: 'Checked tools stay available while the skill runs.',
    });
    await removal.getByText('More tools').click();

    const end = removal.getByRole('checkbox', { name: /^EndConversation\b/ });
    await expect(end).toBeChecked();
    await expect(end).toBeDisabled();
    await expect(removal).toContainText('can’t remove');
  });

  test('says Codex ignores allowed-tools and edits tool dependencies as rows', async ({ page }) => {
    await openExperiment(page, path);
    await chooseTarget(page, 'codex');

    const tools = page.locator('details[data-group="tools"]');
    await expect(tools).toContainText(
      'Codex reads only name, description, and metadata.short-description from SKILL.md',
    );
    await expect(preview(page, 'release-notes/SKILL.md')).toContainText('allowed-tools:');

    await page.getByRole('button', { name: 'Add a tool dependency' }).click();
    await page.locator('#skill-dependencies-tools-0-type').fill('mcp');
    await expect(tools).toContainText('Tool 1 needs a value.');
    await expect(page.locator('#skill-dependencies-tools-0-value')).toHaveAttribute(
      'aria-invalid',
      'true',
    );

    await page.locator('#skill-dependencies-tools-0-value').fill('docs');
    await page.locator('#skill-dependencies-tools-0-url').fill('https://example.com/mcp');
    await expect(preview(page, 'release-notes/agents/openai.yaml')).toHaveText(
      'dependencies:\n  tools:\n    - type: mcp\n      value: docs\n      url: https://example.com/mcp\n',
    );
    await expect(verdict(page)).toHaveText('Ready for Codex');

    await page.getByRole('button', { name: 'Remove tool 1' }).click();
    await expect(page.getByTestId('export-file')).toHaveCount(1);
  });
});

test('writes agents/openai.yaml for Codex once one of its options is set', async ({ page }) => {
  await openExperiment(page, path);
  await chooseTarget(page, 'codex');

  await expect(page.getByTestId('export-file')).toHaveCount(1);
  await page.locator('#skill-policy-allow_implicit_invocation').selectOption('false');

  await expect(preview(page, 'release-notes/agents/openai.yaml')).toHaveText(
    'policy:\n  allow_implicit_invocation: false\n',
  );

  await chooseTarget(page, 'claude');
  await expect(page.getByTestId('export-file')).toHaveCount(1);
  await expect(page.getByTestId('not-written')).toContainText('agents/openai.yaml');
});

test.describe('loading from disk', () => {
  test('reads a Codex skill folder and switches to Codex', async ({ page }) => {
    await openExperiment(page, path);
    await chooseFolder(page, `${fixtures}pdf-forms`);

    await expect(dropZone(page)).toContainText(
      'Loaded pdf-forms/SKILL.md and pdf-forms/agents/openai.yaml for Codex.',
    );
    await expect(page.getByText('1 other file in the folder isn’t edited here.')).toBeVisible();
    await expect(page.locator('input[name="skill-target"][value="codex"]')).toBeChecked();
    await expect(page.locator('#skill-name')).toHaveValue('pdf-forms');
    await expect(page.locator('#skill-directory')).toHaveValue('pdf-forms');
    await expect(page.locator('#skill-metadata-short-description')).toHaveValue('Fill PDF forms');
    await expect(page.locator('#skill-policy-allow_implicit_invocation')).toHaveValue('false');

    await page.locator('details[data-group="interface"] summary').click();
    await expect(page.locator('#skill-interface-display_name')).toHaveValue('PDF forms');

    // Unchanged files export exactly as they were read.
    await expect(preview(page, 'pdf-forms/agents/openai.yaml')).toHaveText(
      readFileSync(`${fixtures}pdf-forms/agents/openai.yaml`, 'utf8'),
    );
    await expect(preview(page, 'pdf-forms/SKILL.md')).toHaveText(
      readFileSync(`${fixtures}pdf-forms/SKILL.md`, 'utf8'),
    );
    await expect(verdict(page)).toHaveText('Ready for Codex');
  });

  test('reads a Claude Code SKILL.md and keeps a key neither tool reads', async ({ page }) => {
    await openExperiment(page, path);
    await chooseTarget(page, 'codex');
    await chooseFile(page, `${fixtures}format-sql/SKILL.md`);

    await expect(dropZone(page)).toContainText('Loaded SKILL.md for Claude Code.');
    await expect(page.locator('input[name="skill-target"][value="claude"]')).toBeChecked();
    await expect(page.locator('#skill-name')).toHaveValue('format-sql');
    await expect(page.getByText('Folded disallowedTools, an undocumented alias')).toBeVisible();
    await expect(page.getByTestId('kept-keys')).toContainText('x-owner');
    await expect(preview(page, 'format-sql/SKILL.md')).toContainText('x-owner: data-platform');
    await expect(preview(page, 'format-sql/SKILL.md')).toContainText('disallowed-tools: WebFetch');
    await expect(preview(page, 'format-sql/SKILL.md')).not.toContainText('disallowedTools');
    await expect(
      page
        .getByRole('group', { name: 'Checked tools stay available while the skill runs.' })
        .getByRole('checkbox', { name: /^WebFetch\b/ }),
    ).not.toBeChecked();
    await expect(verdict(page)).toHaveText('Ready for Claude Code');
    await expect(page.getByTestId('verdict-issues')).toContainText('x-owner');
  });

  test('reports a SKILL.md that doesn’t parse and keeps the current skill', async ({ page }) => {
    await openExperiment(page, path);
    await chooseFile(page, `${fixtures}broken/SKILL.md`);

    await expect(page.getByRole('alert')).toContainText('valid YAML');
    await expect(page.getByRole('alert')).toContainText('Nothing was changed.');
    await expect(page.locator('#skill-name')).toHaveValue('release-notes');
    await expect(verdict(page)).toHaveText('Ready for Claude Code');
  });
});

test('downloads SKILL.md with the previewed text', async ({ page }) => {
  await openExperiment(page, path);
  await page
    .locator('#skill-description')
    .fill('Drafts release notes from recent commits. Use when preparing a release.');
  const expected = 'description: Drafts release notes from recent commits. Use when preparing';
  await expect(preview(page, 'release-notes/SKILL.md')).toContainText(expected);

  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download SKILL.md' }).click();
  const download = await downloading;

  expect(download.suggestedFilename()).toBe('SKILL.md');
  const text = readFileSync(await download.path(), 'utf8');
  expect(text).toContain(expected);
  expect(text.startsWith('---\nname: release-notes\n')).toBe(true);
  await expect(preview(page, 'release-notes/SKILL.md')).toHaveText(text);
});

test.describe('at phone width', () => {
  for (const colorScheme of ['light', 'dark'] as const) {
    test(`never scrolls sideways, every group open, in ${colorScheme} mode`, async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 800 });
      await page.emulateMedia({ colorScheme });
      await openExperiment(page, path);

      for (const target of ['claude', 'codex'] as const) {
        await chooseTarget(page, target);
        // Each click opens a group and drops it from this list, so always take the first.
        const closed = page.locator('details:not([open]) > summary');
        while ((await closed.count()) > 0) await closed.first().click();
        await expect(page.locator('details:not([open])')).toHaveCount(0);

        expect(await horizontalOverflow(page)).toBe(0);
      }
    });
  }

  test('wraps a long name in the fields, the verdict, and the preview', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await openExperiment(page, path);

    const long = 'x'.repeat(150);
    await page.locator('#skill-name').fill(`release-${long}`);
    await page.locator('#skill-directory').fill(`folder-${long}`);

    await expect(verdict(page)).toContainText('to fix');
    await expect(page.getByTestId('verdict-issues')).toContainText(`folder-${long}`);
    await expect(preview(page, `folder-${long}/SKILL.md`)).toContainText(`name: release-${long}`);

    expect(await horizontalOverflow(page)).toBe(0);
  });
});
