import { expect, test } from '@playwright/test';

test('tailwind playground renders an isolated preview beside enhanced source', async ({ page }) => {
  await page.goto('/courses/tailwind/building-a-button');

  await expect(page.getByRole('heading', { name: 'Building a Button' })).toBeVisible();

  await expect(page.locator('[data-tailwind-playground]').first()).toBeVisible();

  await expect(page.locator('[data-content-document][data-content-enhanced="true"]')).toBeVisible();

  const preview = page.frameLocator('[data-tailwind-playground] iframe').first();
  const button = preview.getByRole('button', { name: 'Button', exact: true });
  await expect(button).toBeVisible();
  await expect(button).toHaveClass(/bg-blue-600/);
});
