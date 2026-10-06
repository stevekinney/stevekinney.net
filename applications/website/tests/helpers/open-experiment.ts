import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

/**
 * Opens a page and waits until it's interactive. Experiment pages are
 * prerendered, and `page.goto` resolves before their scripts even load, so a
 * click, keystroke, or chosen file before then lands where nothing listens.
 * The root layout sets `data-hydrated` on `<html>` once the page has mounted.
 */
export const openExperiment = async (
  page: Page,
  path: string,
  { fileControlsOpen = true }: { fileControlsOpen?: boolean } = {},
): Promise<void> => {
  // File drop zones start closed. Most specs use their controls, so they start open here.
  if (fileControlsOpen) {
    await page.addInitScript(() => {
      try {
        localStorage.setItem('experiments:file-drop-zone-collapsed', 'false');
      } catch {
        // The zone starts closed, and a spec that needs it open will say so.
      }
    });
  }

  await page.goto(path);
  await expect(page.locator('html')).toHaveAttribute('data-hydrated', 'true');
};
