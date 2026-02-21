import { expect, test } from '@playwright/test';

test('index page has expected heading', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Recent Posts' })).toBeVisible();
});
