import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import { openExperiment } from './helpers/open-experiment';

const explorerPath = '/experiments/hook-explorer';

const eventList = (page: Page) => page.getByTestId('event-list');
const detail = (page: Page) => page.getByTestId('event-detail');
const eventButton = (page: Page, name: string) =>
  eventList(page).getByRole('button', { name, exact: true });

const chooseTool = async (page: Page, label: 'Claude Code' | 'Codex'): Promise<void> => {
  await page.locator('fieldset', { hasText: 'Hooks in' }).getByText(label, { exact: true }).click();
  await expect(page.getByRole('radio', { name: label })).toBeChecked();
};

const openEveryDisclosure = (page: Page): Promise<void> =>
  page
    .getByRole('main')
    .locator('details')
    .evaluateAll((elements) =>
      elements.forEach((element) => {
        if (element instanceof HTMLDetailsElement) element.open = true;
      }),
    );

const horizontalOverflow = (page: Page): Promise<number> =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('shows the default event before anything runs', async ({ page }) => {
    const response = await page.goto(explorerPath);

    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1, name: 'Hook Explorer' })).toBeVisible();
    await expect(detail(page).getByRole('heading', { level: 2 })).toHaveText('PreToolUse');
    await expect(page.getByTestId('sample-input')).toContainText('"hook_event_name": "PreToolUse"');
  });
});

test('shows PreToolUse for Claude Code on load', async ({ page }) => {
  await openExperiment(page, explorerPath);

  await expect(page.getByRole('radio', { name: 'Claude Code' })).toBeChecked();
  await expect(eventButton(page, 'PreToolUse')).toHaveAttribute('aria-current', 'true');
  await expect(detail(page).getByRole('heading', { level: 2 })).toHaveText('PreToolUse');
  await expect(page.getByTestId('input-fields')).toContainText('tool_name');
  await expect(page.getByTestId('output-fields')).toContainText('permissionDecision');
  await expect(eventList(page).getByRole('button')).toHaveCount(33);
});

test('lists the 12 Codex events and keeps the selected one', async ({ page }) => {
  await openExperiment(page, explorerPath);

  await chooseTool(page, 'Codex');
  await expect(eventList(page).getByRole('button')).toHaveCount(12);
  await expect(detail(page).getByRole('heading', { level: 2 })).toHaveText('PreToolUse');
  await expect(page.getByTestId('comparison')).toContainText('Only in Codex');
  await expect(detail(page)).toContainText('An unknown key anywhere in this output');

  await detail(page).getByRole('button', { name: 'See the Claude Code version' }).click();
  await expect(page.getByRole('radio', { name: 'Claude Code' })).toBeChecked();
});

test('filters the event list', async ({ page }) => {
  await openExperiment(page, explorerPath);

  await page.getByLabel('Filter events').fill('compact');
  await expect(eventList(page).getByRole('button')).toHaveCount(2);
  await expect(eventButton(page, 'PreCompact')).toBeVisible();
  await expect(eventButton(page, 'PostCompact')).toBeVisible();

  await page.getByLabel('Filter events').fill('no-such-event');
  await expect(eventList(page).getByRole('button')).toHaveCount(0);
  await expect(page.getByText('No events match')).toBeVisible();
});

test('shows an event’s fields when it’s selected', async ({ page }) => {
  await openExperiment(page, explorerPath);

  await eventButton(page, 'Stop').click();
  await expect(detail(page).getByRole('heading', { level: 2 })).toHaveText('Stop');
  await expect(page.getByTestId('input-fields')).toContainText('stop_hook_active');
  await expect(page.getByTestId('sample-input')).toContainText('"hook_event_name": "Stop"');
  await expect(page.locator('#payload')).toHaveValue(/"hook_event_name": "Stop"/);

  await page.getByTestId('common-input').locator('summary').click();
  await expect(page.getByTestId('common-input')).toContainText('transcript_path');
});

test('checks the sample, then catches a broken payload with its path', async ({ page }) => {
  await openExperiment(page, explorerPath);

  await page.getByRole('button', { name: 'Check it' }).click();
  await expect(page.getByTestId('check-result')).toContainText('Valid stdin for PreToolUse');

  await page.locator('#payload').fill('{ "session_id": 42, "cwd": "/tmp" }');
  await page.getByRole('button', { name: 'Check it' }).click();
  await expect(page.getByTestId('issue-path').first()).toBeVisible();
  await expect(page.getByTestId('issue-path')).toContainText(['session_id']);

  await page.locator('#payload').fill('{ "session_id": ');
  await page.getByRole('button', { name: 'Check it' }).click();
  await expect(page.getByTestId('check-result')).toContainText('isn’t valid JSON');

  await page.getByRole('button', { name: 'Reset to the sample' }).click();
  await expect(page.locator('#payload')).toHaveValue(/"hook_event_name": "PreToolUse"/);
});

test('checks stdout against the selected event', async ({ page }) => {
  await openExperiment(page, explorerPath);

  await page.getByText('stdout (what it prints)').click();
  await expect(page.locator('#payload')).toHaveValue(/"hookEventName": "PreToolUse"/);
  await page.locator('#payload').fill('{ "hookSpecificOutput": { "hookEventName": "Stop" } }');
  await page.getByRole('button', { name: 'Check it' }).click();
  await expect(page.getByTestId('issue-path')).toContainText(['hookSpecificOutput.hookEventName']);
});

for (const colorScheme of ['light', 'dark'] as const) {
  test(`never scrolls sideways at 360 pixels wide in ${colorScheme} mode`, async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.emulateMedia({ colorScheme });
    await openExperiment(page, explorerPath);

    await openEveryDisclosure(page);
    expect(await horizontalOverflow(page)).toBe(0);

    await eventButton(page, 'PermissionRequest').click();
    await openEveryDisclosure(page);
    expect(await horizontalOverflow(page)).toBe(0);

    // A long unknown key in a strict Codex output comes back in the error message.
    await chooseTool(page, 'Codex');
    await page.getByText('stdout (what it prints)').click();
    const longKey = 'an_unknown_key_without_any_spaces_'.repeat(6);
    await page.locator('#payload').fill(`{ "${longKey}": true }`);
    await page.getByRole('button', { name: 'Check it' }).click();
    await expect(page.getByTestId('check-result')).toContainText(longKey);
    expect(await horizontalOverflow(page)).toBe(0);
  });
}
