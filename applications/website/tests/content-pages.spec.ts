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

test('tailwind playground previews are progressively enhanced on content pages', async ({
  page,
}) => {
  await page.goto('/courses/tailwind/utility-first');

  await expect(page.locator('[data-content-document][data-content-enhanced="true"]')).toBeVisible();
  const playground = page.locator('[data-tailwind-playground]').first();

  await expect(playground.getByRole('button').first()).toBeVisible();
  await expect(playground).not.toHaveAttribute('aria-hidden', 'true');
  await expect(playground).not.toHaveAttribute('role', 'presentation');
  await expect(playground).not.toHaveAttribute('inert', '');
});

test.describe('exactly one content document wrapper per content page', () => {
  // Regression: a shared markdown layout briefly added its own
  // `data-content-document` wrapper on top of the per-route one, which caused
  // every code block, table, and playground to be enhanced twice.
  const contentPages = [
    '/writing/setup-python',
    '/courses/testing/the-basics',
    '/courses/tailwind/utility-first',
  ];

  for (const pagePath of contentPages) {
    test(`${pagePath} exposes a single data-content-document wrapper`, async ({ page }) => {
      await page.goto(pagePath);
      await expect(page.locator('[data-content-document]')).toHaveCount(1);
    });
  }
});
