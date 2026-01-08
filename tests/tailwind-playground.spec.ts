import { expect, test } from '@playwright/test';

test('tailwind playground renders inline via declarative shadow DOM', async ({ page }) => {
  await page.goto('/courses/tailwind/building-a-button');

  await expect(page.getByRole('heading', { name: 'Building a Button' })).toBeVisible();

  await page.waitForFunction(() => {
    return Array.from(document.querySelectorAll('*')).some((el) =>
      el.shadowRoot?.querySelector('button'),
    );
  });

  const hasShadowPreview = await page.evaluate(() => {
    const hosts = Array.from(document.querySelectorAll('*')).filter((el) => el.shadowRoot);
    return hosts.some((host) => {
      const button = host.shadowRoot?.querySelector('button');
      return Boolean(
        button &&
        button.textContent?.trim() === 'Button' &&
        button.classList.contains('bg-blue-600'),
      );
    });
  });

  expect(hasShadowPreview).toBe(true);
});
