import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { openExperiment } from './helpers/open-experiment';

const visualizerPath = '/experiments/workflow-visualizer';

// Made-up workflows: one with options Codex can't honor and a model id with no
// spaces, and one whose body holds a static import a function can't.
const oddOptionsFixture = fileURLToPath(
  new URL('./fixtures/workflow-visualizer-export/odd-options.workflow.js', import.meta.url),
);
const staticImportFixture = fileURLToPath(
  new URL('./fixtures/workflow-visualizer-export/static-import.workflow.js', import.meta.url),
);

const panel = (page: Page) => page.getByRole('region', { name: 'Run it on Codex', exact: true });
const preview = (page: Page) => page.getByTestId('codex-export-preview');
const notes = (page: Page) => page.getByTestId('codex-export-notes');
const fileInput = (page: Page) =>
  page.locator('[data-file-drop-zone] input[type="file"]:not([webkitdirectory])');

const horizontalOverflow = (page: Page): Promise<number> =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('shows the section and says the converter is loading', async ({ page }) => {
    await page.goto(visualizerPath);

    const section = panel(page);
    await expect(section.getByRole('heading', { level: 2, name: 'Run it on Codex' })).toBeVisible();
    await expect(section.getByText('Loading the converter…')).toBeVisible();
  });
});

test('converts the sample and lists its models', async ({ page }) => {
  await openExperiment(page, visualizerPath);

  await expect(preview(page)).toContainText('// review-changed-files.codex.mjs');
  await expect(preview(page)).toContainText("import { Codex } from '@openai/codex-sdk';");
  await expect(preview(page)).toContainText('async function workflowBody(args) {');

  for (const model of ['haiku', 'sonnet', 'opus'])
    await expect(page.getByRole('combobox', { name: new RegExp(`^${model}\\b`) })).toBeEnabled();
  await expect(page.getByRole('combobox', { name: /^No model set/ })).toBeEnabled();

  await expect(notes(page)).toContainText('optional base is sent as nullable');
  await expect(notes(page)).not.toContainText('Works differently');
});

test('writes the chosen models and sandbox into CONFIG', async ({ page }) => {
  await openExperiment(page, visualizerPath);
  await expect(preview(page)).toContainText('const CONFIG = {');

  await page.getByRole('combobox', { name: /^sonnet\b/ }).fill('gpt-test-model');
  await expect(preview(page)).toContainText("sonnet: 'gpt-test-model',");
  await expect(notes(page)).toContainText(
    "1 agent() call with model: 'sonnet' runs on gpt-test-model.",
  );

  await page.getByLabel('Let agents’ commands reach the network').check();
  await expect(preview(page)).toContainText('networkAccessEnabled: true,');

  await page.locator('#codex-sandbox-mode').selectOption('read-only');
  await expect(preview(page)).toContainText("sandboxMode: 'read-only',");
  await expect(page.getByLabel('Let agents’ commands reach the network')).toBeDisabled();
  await expect(notes(page)).toContainText('Works differently (1)');
});

test('downloads and copies the generated file', async ({ page, context, browserName }) => {
  await openExperiment(page, visualizerPath);
  await expect(preview(page)).toContainText('const CONFIG = {');

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download review-changed-files.codex.mjs' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('review-changed-files.codex.mjs');
  const text = await readFile(await download.path(), 'utf8');
  expect(text).toMatch(/^\/\/ review-changed-files\.codex\.mjs\n/);
  expect(text).toContain("export const meta = {\n  name: 'review-changed-files',");

  test.skip(browserName !== 'chromium', 'Clipboard permissions are Chromium-only');
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await panel(page).getByRole('button', { name: 'Copy', exact: true }).click();
  await expect(panel(page).getByText('Copied review-changed-files.codex.mjs.')).toBeVisible();
});

test('warns about what a loaded workflow does differently on Codex', async ({ page }) => {
  await openExperiment(page, visualizerPath);
  await fileInput(page).setInputFiles(oddOptionsFixture);

  await expect(preview(page)).toContainText('// rename-in-isolation.codex.mjs');
  await expect(notes(page)).toContainText('Works differently');
  for (const feature of ['Worktrees.', 'Unsupported options.', 'Nested workflows.'])
    await expect(notes(page)).toContainText(feature);
  await expect(notes(page)).toContainText('can’t take minLength at note');
  await expect(
    page.getByRole('combobox', { name: /^claude-sonnet-with-an-unusually-long/ }),
  ).toBeVisible();

  await expect(page.getByRole('button', { name: 'Show line 29 of the script' })).toBeEnabled();
  await page.getByRole('button', { name: 'Show line 18 of the script' }).first().click();
});

test('explains a script whose body cannot run inside a function', async ({ page }) => {
  await openExperiment(page, visualizerPath);
  await fileInput(page).setInputFiles(staticImportFixture);

  await expect(page.getByTestId('codex-export-error')).toContainText(
    'can’t run inside a function (line 6)',
  );
  await expect(panel(page).getByRole('button', { name: /^Download/ })).toBeDisabled();
});

for (const colorScheme of ['light', 'dark'] as const) {
  test(`keeps the export inside 360 pixels in ${colorScheme} mode`, async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.emulateMedia({ colorScheme });
    await openExperiment(page, visualizerPath);
    await fileInput(page).setInputFiles(oddOptionsFixture);
    await expect(preview(page)).toContainText('// rename-in-isolation.codex.mjs');

    expect(await horizontalOverflow(page)).toBe(0);
  });
}
