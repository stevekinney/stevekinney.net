import { expect, test } from '@playwright/test';

test('tailwind playground renders inline previews', async ({ page }) => {
  await page.goto('/courses/tailwind/building-a-button');

  await expect(page.getByRole('heading', { name: 'Building a Button' })).toBeVisible();

  await expect(page.locator('[data-tailwind-playground]').first()).toBeVisible();

  const hasPreview = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('[data-tailwind-playground] button'));
    return buttons.some(
      (button) =>
        button.textContent?.trim() === 'Button' && button.classList.contains('bg-blue-600'),
    );
  });

  expect(hasPreview).toBe(true);
});
