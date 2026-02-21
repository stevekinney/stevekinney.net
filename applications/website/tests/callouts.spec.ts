import { expect, test } from '@playwright/test';

const viewport = { width: 1280, height: 720 };
const colorSchemes = ['light', 'dark'] as const;

const scenarios = [
  {
    name: 'writing setup python',
    path: '/writing/setup-python',
    callouts: [
      { name: 'info', selector: '[data-callout="info"]', snapshot: 'callout-info' },
      { name: 'success', selector: '[data-callout="success"]', snapshot: 'callout-success' },
      { name: 'question', selector: '[data-callout="question"]', snapshot: 'callout-question' },
    ],
  },
  {
    name: 'courses advanced test configuration',
    path: '/courses/testing/advanced-test-configuration',
    callouts: [{ name: 'note', selector: '[data-callout="note"]', snapshot: 'callout-note' }],
  },
  {
    name: 'courses the basics',
    path: '/courses/testing/the-basics',
    callouts: [{ name: 'tip', selector: '[data-callout="tip"]', snapshot: 'callout-tip' }],
  },
  {
    name: 'courses differences between jest and vitest',
    path: '/courses/testing/differences-between-jest-and-vitest',
    callouts: [
      { name: 'warning', selector: '[data-callout="warning"]', snapshot: 'callout-warning' },
    ],
  },
  {
    name: 'courses asymmetric matchers',
    path: '/courses/testing/asymmetric-matchers',
    callouts: [
      { name: 'example', selector: '[data-callout="example"]', snapshot: 'callout-example' },
    ],
  },
  {
    name: 'courses storybook setting up tailwind',
    path: '/courses/storybook/setting-up-tailwind',
    callouts: [
      { name: 'failure', selector: '[data-callout="failure"]', snapshot: 'callout-failure' },
    ],
  },
  {
    name: 'writing counter factual reasoning',
    path: '/writing/counter-factual-reasoning-in-ai',
    callouts: [{ name: 'danger', selector: '[data-callout="danger"]', snapshot: 'callout-danger' }],
  },
  {
    name: 'courses python ai tokenization',
    path: '/courses/python-ai/tokenization',
    callouts: [
      { name: 'abstract', selector: '[data-callout="abstract"]', snapshot: 'callout-abstract' },
    ],
  },
];

for (const colorScheme of colorSchemes) {
  for (const scenario of scenarios) {
    test(`callouts render on ${scenario.name} (${colorScheme})`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.emulateMedia({ colorScheme });
      await page.goto(scenario.path);

      for (const calloutConfig of scenario.callouts) {
        const callout = page.locator(calloutConfig.selector).first();
        await expect(callout, `${calloutConfig.name} callout should render`).toBeVisible();
        await callout.scrollIntoViewIfNeeded();
        await expect(callout.locator('p').first()).not.toContainText('[!');

        const suffix = colorScheme === 'dark' ? '-dark' : '';
        await expect(callout).toHaveScreenshot(`${calloutConfig.snapshot}${suffix}.png`);
      }
    });
  }
}
