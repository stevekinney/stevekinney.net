import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

/**
 * Opens a page and waits until it's interactive. Experiment pages are
 * prerendered, and `page.goto` resolves before their scripts even load, so a
 * click, keystroke, or chosen file before then lands where nothing listens.
 * The root layout sets `data-hydrated` on `<html>` once the page has mounted.
 */
export const openExperiment = async (page: Page, path: string): Promise<void> => {
  await page.goto(path);
  await expect(page.locator('html')).toHaveAttribute('data-hydrated', 'true');
};
