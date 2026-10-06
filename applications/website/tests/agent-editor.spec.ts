import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { openExperiment } from './helpers/open-experiment';

const editorPath = '/experiments/agent-editor';

// Made-up agents: a Claude Code subagent with a key Claude Code doesn't read,
// and a Codex agent with a config.toml key the editor keeps as-is.
const claudeFixture = fileURLToPath(
  new URL('./fixtures/agent-editor/test-writer.md', import.meta.url),
);
const codexFixture = fileURLToPath(
  new URL('./fixtures/agent-editor/docs-writer.toml', import.meta.url),
);

const verdict = (page: Page) => page.getByTestId('verdict');
const preview = (page: Page) => page.getByTestId('export-preview');
const fileInput = (page: Page) => page.locator('input[type="file"]:not([webkitdirectory])');

const chooseTarget = async (page: Page, label: 'Claude Code' | 'Codex'): Promise<void> => {
  await page
    .locator('fieldset', { hasText: 'Export for' })
    .getByText(label, { exact: true })
    .click();
  await expect(page.getByRole('radio', { name: label })).toBeChecked();
};

/** Opens every collapsed group of settings, so their fields count toward the page width. */
const openEveryGroup = (page: Page): Promise<void> =>
  page
    .getByRole('main')
    .locator('details')
    .evaluateAll((groups) =>
      groups.forEach((group) => {
        if (group instanceof HTMLDetailsElement) group.open = true;
      }),
    );

const horizontalOverflow = (page: Page): Promise<number> =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('shows the sample’s verdict and exported file before anything runs', async ({ page }) => {
    const response = await page.goto(editorPath);

    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1, name: 'Agent Editor' })).toBeVisible();
    await expect(verdict(page)).toHaveText('Ready for Claude Code');
    await expect(preview(page)).toContainText('name: code-reviewer');
    await expect(preview(page)).toContainText('model: sonnet');
    await expect(page.locator('#agent-name')).toBeDisabled();
  });
});

test('passes the sample cleanly for both tools', async ({ page }) => {
  await openExperiment(page, editorPath);

  await expect(verdict(page)).toHaveText('Ready for Claude Code');
  await expect(page.getByTestId('verdict-issues')).toHaveCount(0);

  await chooseTarget(page, 'Codex');
  await expect(verdict(page)).toHaveText('Ready for Codex');
  await expect(preview(page)).not.toContainText('sandbox_mode');
  await expect(preview(page)).toContainText("developer_instructions = '''");
});

test('updates the verdict and preview as a field changes', async ({ page }) => {
  await openExperiment(page, editorPath);

  await page.locator('#agent-name').fill('Code Reviewer');
  await expect(verdict(page)).toHaveText('1 error to fix');
  await expect(page.getByTestId('verdict-issues')).toContainText('must be lowercase');
  await expect(preview(page)).toContainText('name: Code Reviewer');

  await page.locator('#agent-name').fill('code-reviewer');
  await expect(verdict(page)).toHaveText('Ready for Claude Code');
});

test('keeps every setting when switching tools and back', async ({ page }) => {
  await openExperiment(page, editorPath);

  await page.locator('#agent-claude-permissionMode').selectOption('plan');
  await expect(preview(page)).toContainText('permissionMode: plan');

  await chooseTarget(page, 'Codex');
  await expect(page.getByTestId('not-written')).toContainText('tools, permissionMode');
  await expect(preview(page)).not.toContainText('permissionMode');
  await page.locator('#agent-codex-sandbox_mode').selectOption('read-only');
  await expect(preview(page)).toContainText('sandbox_mode = "read-only"');

  await chooseTarget(page, 'Claude Code');
  await expect(preview(page)).toContainText('permissionMode: plan');
  await expect(preview(page)).toContainText('tools:\n  - Read\n  - Grep\n  - Glob');
  await expect(page.getByTestId('not-written')).toContainText('sandbox_mode');
});

test('shows the sample’s tools as the read-only preset and writes a new preset', async ({
  page,
}) => {
  await openExperiment(page, editorPath);

  const tools = page.getByTestId('group-claude-tools');
  await expect(tools.getByRole('button', { name: 'Read-only', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  await tools.getByRole('button', { name: 'Read and edit', exact: true }).click();
  await expect(preview(page)).toContainText(
    'tools:\n  - Read\n  - Grep\n  - Glob\n  - Edit\n  - Write\n',
  );
  await expect(verdict(page)).toHaveText('Ready for Claude Code');
});

test('keeps the last tool on, since Claude Code won’t launch an agent with none', async ({
  page,
}) => {
  await openExperiment(page, editorPath);

  const tools = page.getByTestId('group-claude-tools');
  await tools.getByRole('checkbox', { name: /^Grep\b/ }).uncheck();
  await tools.getByRole('checkbox', { name: /^Glob\b/ }).uncheck();

  const read = tools.getByRole('checkbox', { name: /^Read\b/ });
  await expect(read).toBeChecked();
  await expect(read).toBeDisabled();
  await expect(tools).toContainText('The last tool stays on');
  await expect(preview(page)).toContainText('tools:\n  - Read\n');
});

test('writes disallowedTools when a tool is unchecked while inheriting', async ({ page }) => {
  await openExperiment(page, editorPath);

  const tools = page.getByTestId('group-claude-tools');
  await tools.getByRole('button', { name: 'Everything', exact: true }).click();
  await expect(preview(page)).not.toContainText('tools:');

  await tools.getByRole('checkbox', { name: /^Bash\b/ }).uncheck();
  await expect(preview(page)).toContainText('disallowedTools:\n  - Bash\n');
  await expect(preview(page)).not.toHaveText(/^tools:/m);
});

test('adds a Codex skill rule that turns a skill off', async ({ page }) => {
  await openExperiment(page, editorPath);
  await chooseTarget(page, 'Codex');

  const tools = page.getByTestId('group-codex-tools');
  await expect(tools).toContainText('A Codex agent file can’t limit which tools the agent has.');
  await expect(tools.getByTestId('no-effect').first()).toBeVisible();

  await tools.getByRole('button', { name: 'Add a rule' }).click();
  await page.locator('#agent-codex-skills-rule-0-target').fill('deploy');
  await expect(preview(page)).toContainText('[[skills.config]]\nname = "deploy"\nenabled = false');
  await expect(verdict(page)).toHaveText('Ready for Codex');
});

test('loads a Claude Code agent file into the form', async ({ page }) => {
  await openExperiment(page, editorPath);

  await fileInput(page).setInputFiles(claudeFixture);
  await expect(page.getByText('Loaded test-writer.md as a Claude Code agent.')).toBeVisible();

  await expect(page.locator('#agent-name')).toHaveValue('test-writer');
  await expect(page.locator('#agent-model')).toHaveValue('haiku');
  await expect(page.locator('#agent-claude-effort')).toHaveValue('high');
  await expect(page.getByTestId('kept-as-is')).toContainText('team');
  await expect(verdict(page)).toHaveText('Ready for Claude Code, with 1 warning');
  // An untouched file exports exactly as it was read, comments included.
  await expect(preview(page)).toHaveText(await readFile(claudeFixture, 'utf8'));
});

test('loads a Codex agent file and switches to Codex', async ({ page }) => {
  await openExperiment(page, editorPath);

  await fileInput(page).setInputFiles(codexFixture);
  await expect(page.getByText('Loaded docs-writer.toml as a Codex agent.')).toBeVisible();

  await expect(page.getByRole('radio', { name: 'Codex' })).toBeChecked();
  await expect(page.locator('#agent-name')).toHaveValue('docs-writer');
  await expect(page.locator('#agent-codex-sandbox_mode')).toHaveValue('workspace-write');
  await expect(page.getByTestId('kept-as-is')).toContainText('approval_policy');
  await expect(verdict(page)).toHaveText('Ready for Codex');
  await expect(preview(page)).toContainText('approval_policy = "on-request"');
});

test('asks which agent to load when several arrive together', async ({ page }) => {
  await openExperiment(page, editorPath);

  await fileInput(page).setInputFiles([claudeFixture, codexFixture]);
  await expect(page.getByText('Found 2 agent files. Pick one below.')).toBeVisible();

  await page.getByRole('button', { name: 'docs-writer.toml' }).click();
  await expect(page.locator('#agent-name')).toHaveValue('docs-writer');
});

test('leaves the document alone when a file doesn’t parse', async ({ page }) => {
  await openExperiment(page, editorPath);

  await fileInput(page).setInputFiles({
    name: 'broken.toml',
    mimeType: 'application/toml',
    buffer: Buffer.from('name = "unterminated'),
  });
  await expect(page.getByRole('alert')).toContainText('isn’t valid TOML');
  await expect(page.locator('#agent-name')).toHaveValue('code-reviewer');
});

test('downloads the file for the chosen tool', async ({ page }) => {
  await openExperiment(page, editorPath);

  const [markdown] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download code-reviewer.md' }).click(),
  ]);
  expect(markdown.suggestedFilename()).toBe('code-reviewer.md');
  expect(await readFile(await markdown.path(), 'utf8')).toMatch(/^---\nname: code-reviewer\n/);

  await chooseTarget(page, 'Codex');
  const [toml] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download code-reviewer.toml' }).click(),
  ]);
  expect(toml.suggestedFilename()).toBe('code-reviewer.toml');
  expect(await readFile(await toml.path(), 'utf8')).toContain("developer_instructions = '''");
});

test('starts blank and flags what’s missing', async ({ page }) => {
  await openExperiment(page, editorPath);

  await page.getByRole('button', { name: 'Start blank' }).click();
  await expect(page.locator('#agent-name')).toHaveValue('');
  await expect(verdict(page)).toHaveText(/errors? to fix/);

  await page.getByRole('button', { name: 'Use the sample' }).click();
  await expect(verdict(page)).toHaveText('Ready for Claude Code');
});

for (const colorScheme of ['light', 'dark'] as const) {
  test(`never scrolls sideways at 360 pixels wide in ${colorScheme} mode`, async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.emulateMedia({ colorScheme });
    await openExperiment(page, editorPath);

    const longName = 'a-very-long-agent-name-without-any-spaces-'.repeat(6).replace(/-$/, '');
    await page.locator('#agent-name').fill(longName);
    await page.locator('#agent-model').fill(`claude-${'x'.repeat(120)}`);
    await expect(preview(page)).toContainText(longName);
    await openEveryGroup(page);
    expect(await horizontalOverflow(page)).toBe(0);

    await chooseTarget(page, 'Codex');
    await expect(verdict(page)).toContainText(/Codex|to fix/);
    await page.getByRole('button', { name: 'Add a rule' }).click();
    await page.locator('#agent-codex-skills-rule-0-target').fill(longName);
    await expect(preview(page)).toContainText(longName);
    await openEveryGroup(page);
    expect(await horizontalOverflow(page)).toBe(0);
  });
}
