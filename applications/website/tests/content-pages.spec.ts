import { expect, test } from '@playwright/test';

test('writing post pages render prerendered content with code-block enhancement', async ({
  page,
}) => {
  await page.goto('/writing/setup-python');

  await expect(
    page.getByRole('heading', { name: 'Setting Up a Python Environment on macOS' }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Copy code' }).first()).toBeVisible();
});

test('course lesson pages render prerendered content with code-block enhancement', async ({
  page,
}) => {
  await page.goto('/courses/testing/the-basics');

  await expect(page.getByRole('heading', { name: 'Starting with Simple Tests' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Copy code' }).first()).toBeVisible();
});

test('mermaid diagrams are progressively enhanced on content pages', async ({ page }) => {
  await page.goto('/writing/ai-gateway-durable-workflows');

  await expect(page.locator('[data-mermaid] svg').first()).toBeVisible();
});
