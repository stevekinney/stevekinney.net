import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { fileURLToPath } from 'node:url';

import { openExperiment } from './helpers/open-experiment';

const path = '/experiments/workflow-visualizer';

// Made-up workflows: one shaped unlike the sample (a helper called twice, a
// loop, a nested workflow), and one with a mistake for every check, plus a long
// unbroken label and model ID for the narrow-screen test.
const triageFixture = fileURLToPath(
  new URL('./fixtures/workflow-visualizer/triage-issues.workflow.js', import.meta.url),
);
const brokenFixture = fileURLToPath(
  new URL('./fixtures/workflow-visualizer/broken-checks.workflow.js', import.meta.url),
);

const diagram = (page: Page) => page.getByTestId('diagram');
const verdict = (page: Page) => page.getByTestId('verdict');
const agentNode = (page: Page, text: string) =>
  page.getByTestId('agent-node').filter({ hasText: text });
const fileInput = (page: Page) =>
  page.locator('[data-file-drop-zone] input[type="file"]:not([webkitdirectory])');

/** Waits for the full editor, which replaces the plain text area once it loads. */
const scriptEditor = async (page: Page) => {
  const content = page.locator('.cm-content');
  await expect(content).toBeVisible();

  return content;
};

const replaceScript = async (page: Page, text: string): Promise<void> => {
  const editor = await scriptEditor(page);
  await editor.click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.insertText(text);
};

const horizontalOverflow = (page: Page): Promise<number> =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

const smallWorkflow = `export const meta = { name: 'count-todos', description: 'Count the TODO comments' };

const count = await agent('Count the TODO comments in src/.', { label: 'Count TODOs', model: 'haiku' });
return count;
`;

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('shows the sample’s diagram, counts, and verdict from the HTML', async ({ page }) => {
    const response = await page.goto(path);

    expect(response?.status()).toBe(200);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Workflow Visualizer' }),
    ).toBeVisible();
    await expect(verdict(page)).toHaveText('Ready to run');
    await expect(page.getByTestId('summary-agents')).toHaveText('4');
    await expect(page.getByTestId('summary-fan-outs')).toHaveText('2');

    await expect(page.getByTestId('workflow-start')).toContainText('review-changed-files');
    await expect(diagram(page).getByRole('heading', { level: 3 })).toHaveText([
      'Collect',
      'Review',
      'Summarize',
    ]);
    await expect(agentNode(page, 'List changed files')).toBeVisible();
    await expect(agentNode(page, 'Review ${file}')).toBeVisible();
    await expect(page.getByTestId('pipeline')).toContainText(
      'Each item in changed.files, no barrier between stages',
    );
    await expect(page.getByTestId('fan-out')).toContainText(
      '× each item in review?.findings ?? []',
    );
  });
});

test('draws the sample once the page is interactive', async ({ page }) => {
  await openExperiment(page, path);

  await expect(agentNode(page, 'Write the summary')).toContainText('opus');
  await expect(agentNode(page, 'List changed files')).toContainText('{ files, base? }');
  await expect(diagram(page)).toHaveAttribute('data-stale', 'false');
  await expect(page.locator('section[aria-labelledby="codex-export-heading"]')).toBeVisible();
});

test('follows edits to the script, and keeps the last diagram while it doesn’t parse', async ({
  page,
}) => {
  await openExperiment(page, path);

  await replaceScript(page, smallWorkflow);
  await expect(agentNode(page, 'Count TODOs')).toBeVisible();
  await expect(agentNode(page, 'List changed files')).toHaveCount(0);
  await expect(page.getByTestId('summary-agents')).toHaveText('1');
  await expect(page.getByTestId('workflow-start')).toContainText('count-todos');

  // The small workflow ends with a newline, so the broken statement is line 5.
  await replaceScript(page, `${smallWorkflow}const broken = ;\n`);
  await expect(page.getByTestId('parse-error')).toContainText('Line 5:');
  await expect(diagram(page)).toHaveAttribute('data-stale', 'true');
  await expect(agentNode(page, 'Count TODOs')).toBeVisible();
  await expect(verdict(page)).toHaveText('1 error to fix');

  await replaceScript(page, smallWorkflow);
  await expect(page.getByTestId('parse-error')).toHaveCount(0);
  await expect(diagram(page)).toHaveAttribute('data-stale', 'false');
  await expect(verdict(page)).toHaveText('Ready to run');
});

test('selects an agent’s line in the script when its node is clicked', async ({ page }) => {
  await openExperiment(page, path);
  const editor = await scriptEditor(page);

  const reviewer = agentNode(page, 'Review ${file}');
  await reviewer.click();

  await expect(reviewer).toHaveAttribute('aria-current', 'true');
  await expect(editor).toBeFocused();
  await expect
    .poll(() => page.evaluate(() => document.getSelection()?.toString() ?? ''))
    .toContain('agent(`Review ${file} for correctness bugs.');
});

test('loads a workflow file and draws it', async ({ page }) => {
  await openExperiment(page, path);
  await scriptEditor(page);

  await fileInput(page).setInputFiles(triageFixture);
  await expect(page.getByText('Loaded triage-issues.workflow.js.')).toBeVisible();

  await expect(page.locator('.cm-content')).toContainText("name: 'triage-issues'");
  await expect(page.getByTestId('workflow-start')).toContainText('triage-issues');
  await expect(agentNode(page, 'List open issues')).toBeVisible();
  await expect(agentNode(page, 'List stale issues')).toBeVisible();
  // The helper is drawn at both of its call sites.
  await expect(page.getByTestId('helper')).toHaveCount(2);
  await expect(agentNode(page, 'Classify ${issue}')).toHaveCount(2);
  await expect(diagram(page)).toContainText('Repeat for (const issue of open?.issues ?? [])');
  await expect(diagram(page)).toContainText('Runs the workflow draft-replies');
  await expect(page.getByTestId('summary-agents')).toHaveText('4');
  await expect(verdict(page)).toHaveText('Ready to run');

  await page.getByRole('button', { name: 'Load the sample' }).click();
  await expect(agentNode(page, 'List changed files')).toBeVisible();
  await expect(page.getByTestId('helper')).toHaveCount(0);
});

test('asks which workflow to load when several arrive together', async ({ page }) => {
  await openExperiment(page, path);
  await scriptEditor(page);

  await fileInput(page).setInputFiles([triageFixture, brokenFixture]);
  await expect(page.getByText('Found 2 workflow scripts. Pick one below.')).toBeVisible();

  await page.getByRole('button', { name: 'triage-issues.workflow.js' }).click();
  await expect(agentNode(page, 'List open issues')).toBeVisible();
});

test('lists what’s wrong with a broken workflow', async ({ page }) => {
  await openExperiment(page, path);
  const editor = await scriptEditor(page);

  await fileInput(page).setInputFiles(brokenFixture);
  await expect(verdict(page)).toHaveText('2 errors to fix');

  const checks = page.getByTestId('checks');
  await expect(checks).toContainText('Date.now() throws in a workflow');
  await expect(checks).toContainText('effort must be low, medium, high, xhigh, or max');
  await expect(checks).toContainText("phase('Reveiw') on line 9 matches no meta.phases title");
  await expect(checks).toContainText('modle isn’t an agent() option');
  await expect(checks).toContainText('.filter(Boolean) on line 20 drops the null');

  await checks.getByRole('button', { name: 'Show line 7' }).click();
  await expect(editor).toBeFocused();
  await expect
    .poll(() => page.evaluate(() => document.getSelection()?.toString() ?? ''))
    .toContain('const started = Date.now();');
});

test('refuses a file too large for Claude Code to load', async ({ page }) => {
  await openExperiment(page, path);
  await scriptEditor(page);

  await fileInput(page).setInputFiles({
    name: 'huge.workflow.js',
    mimeType: 'text/javascript',
    buffer: Buffer.alloc(600 * 1024, 'a'),
  });
  await expect(
    page.getByRole('alert').filter({ hasText: 'won’t load a workflow over 512 KB' }),
  ).toContainText('huge.workflow.js is 600 KB');
  await expect(agentNode(page, 'List changed files')).toBeVisible();
});

for (const colorScheme of ['light', 'dark'] as const) {
  test(`shows every section without scrolling sideways at 360 pixels in ${colorScheme} mode`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.emulateMedia({ colorScheme });
    await openExperiment(page, path);
    await scriptEditor(page);

    const sections = [
      page.getByTestId('summary'),
      verdict(page),
      page.getByRole('heading', { name: 'Diagram', exact: true }),
      page.getByRole('heading', { name: 'Script', exact: true }),
      page.locator('section[aria-labelledby="codex-export-heading"]'),
      page.getByRole('heading', { name: 'Load a workflow', exact: true }),
      page.getByRole('heading', { name: 'Notes', exact: true }),
    ];
    for (const section of sections) {
      await section.scrollIntoViewIfNeeded();
      await expect(section).toBeVisible();
    }

    // Stacked, the diagram comes before the script.
    const diagramBox = await diagram(page).boundingBox();
    const editorBox = await page.locator('.cm-editor').boundingBox();
    expect(diagramBox?.y ?? Infinity).toBeLessThan(editorBox?.y ?? 0);
    expect(await horizontalOverflow(page)).toBe(0);

    // A long unbroken label and model ID wrap instead of widening the page.
    await fileInput(page).setInputFiles(brokenFixture);
    await expect(verdict(page)).toHaveText('2 errors to fix');
    await expect(page.getByTestId('agent-node')).toContainText('a-review-label-that-keeps-going');
    expect(await horizontalOverflow(page)).toBe(0);

    await page.getByTestId('agent-node').click();
    expect(await horizontalOverflow(page)).toBe(0);
  });
}
