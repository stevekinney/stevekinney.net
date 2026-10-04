import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { openExperiment } from './helpers/open-experiment';

type Entry = {
  id: string;
  name: string;
  category: string;
  maturity: string;
  confidence: string;
  aliases: string[];
  related: string[];
};

// The expected numbers come from the committed dataset, which the unit tests
// pin to the specification's counts, so this spec checks what the page shows
// against what the data says.
const dataset = JSON.parse(
  readFileSync(
    fileURLToPath(
      new URL('../src/routes/experiments/agentic-coding-patterns/patterns.json', import.meta.url),
    ),
    'utf8',
  ),
) as { entries: Entry[] };

const entries = dataset.entries;
const entryNamed = (name: string): Entry => {
  const entry = entries.find((candidate) => candidate.name === name);
  if (!entry) throw new Error(`No entry named ${name}`);

  return entry;
};

const fixtureDirectory = (name: string): string =>
  fileURLToPath(new URL(`./fixtures/agentic-coding-patterns/${name}`, import.meta.url));

const path = '/experiments/agentic-coding-patterns';

const openPatterns = (page: Page, suffix = ''): Promise<void> =>
  openExperiment(page, `${path}${suffix}`);

const panel = (page: Page): Locator => page.locator('#view-panel');

const countLine = (page: Page): Locator => page.getByRole('status').filter({ hasText: / of \d+/ });

const gridButton = (page: Page, label: string): Locator =>
  page
    .getByRole('region', { name: /^Entries by category and/ })
    .getByRole('button', { name: label, exact: true });

const cardLink = (page: Page, name: string): Locator =>
  panel(page).getByRole('link', { name, exact: true });

const openEntry = async (page: Page, name: string): Promise<void> => {
  await cardLink(page, name).click();
  await expect(page.getByRole('heading', { level: 2, name, exact: true })).toBeVisible();
};

const horizontalOverflow = (page: Page): Promise<number> =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test('responds with 200 and the specification’s headline', async ({ page }) => {
  const response = await page.goto(path);

  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle(/Agentic Coding Patterns/);
  await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toHaveText(
    'The agentic coding pattern landscape',
  );
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('still shows the grid and the list, and disables what needs a script', async ({ page }) => {
    await page.goto(path);

    await expect(panel(page).locator('li h3')).toHaveCount(118);
    await expect(gridButton(page, 'verification, established: 12 entries')).toBeDisabled();
  });
});

test.describe('the bundled library', () => {
  test('has 118 entries, and the grid totals match the categories and maturities', async ({
    page,
  }) => {
    await openPatterns(page);

    await expect(countLine(page)).toHaveText('118 of 118');
    await expect(panel(page).locator('li h3')).toHaveCount(118);

    const categories = [...new Set(entries.map((entry) => entry.category))];
    expect(categories).toHaveLength(8);
    for (const category of categories) {
      const total = entries.filter((entry) => entry.category === category).length;
      await expect(gridButton(page, `${category}, all: ${total} entries`)).toBeVisible();
    }

    await expect(gridButton(page, 'All categories, foundational: 3 entries')).toBeVisible();
    await expect(gridButton(page, 'All categories, established: 77 entries')).toBeVisible();
    await expect(gridButton(page, 'All categories, emerging: 38 entries')).toBeVisible();
  });

  test('lists the categories in the specified order, with a dot for an empty cell', async ({
    page,
  }) => {
    await openPatterns(page);

    const rows = page.getByRole('region', { name: /^Entries by category/ }).locator('tbody th');
    await expect(rows).toHaveText([
      'methodology',
      'context-management',
      'verification',
      'control-loop',
      'multi-agent',
      'academic',
      'planning',
      'governance',
    ]);
    await expect(gridButton(page, 'verification, foundational: 0 entries')).toHaveText('·');
  });

  test('does not mark notes with nested section headings as partial', async ({ page }) => {
    await openPatterns(page);

    const partialTags = panel(page).locator('ul[aria-label="Labels"] li', { hasText: /^partial$/ });
    await expect(partialTags).toHaveCount(0);

    await openEntry(page, 'Agent Handoff');
    await expect(page.getByRole('heading', { level: 3, name: 'When not to use it' })).toBeVisible();
    await expect(page.getByText('partial entry')).toHaveCount(0);
    await expect(page.getByText('Not recorded.')).toHaveCount(0);
  });

  test('filters from a grid cell, shows the count, and clears on a second click', async ({
    page,
  }) => {
    await openPatterns(page);
    const expected = entries.filter(
      (entry) => entry.category === 'verification' && entry.maturity === 'established',
    ).length;
    const cell = gridButton(page, `verification, established: ${expected} entries`);

    await cell.click();
    await expect(countLine(page)).toHaveText(`${expected} of 118 · verification · established`);
    await expect(cell).toHaveAttribute('aria-pressed', 'true');
    await expect(panel(page).locator('li h3')).toHaveCount(expected);

    await cell.click();
    await expect(countLine(page)).toHaveText('118 of 118');
    await expect(cell).toHaveAttribute('aria-pressed', 'false');
  });

  test('a row total filters by category alone, and a cell works from the keyboard', async ({
    page,
  }) => {
    await openPatterns(page);

    await gridButton(page, 'planning, all: 9 entries').click();
    await expect(countLine(page)).toHaveText('9 of 118 · planning');

    const cell = gridButton(page, 'governance, emerging: 3 entries');
    await cell.focus();
    await page.keyboard.press('Enter');
    await expect(countLine(page)).toHaveText('3 of 118 · governance · emerging');
    await page.keyboard.press('Space');
    await expect(countLine(page)).toHaveText('118 of 118');
  });

  test('switches the grid columns to confidence', async ({ page }) => {
    await openPatterns(page);

    await page.getByRole('button', { name: 'Confidence', exact: true }).first().click();

    await expect(gridButton(page, 'All categories, Strong: 11 entries')).toBeVisible();
    await expect(gridButton(page, 'All categories, Emerging: 79 entries')).toBeVisible();
    await expect(gridButton(page, 'All categories, Experimental: 28 entries')).toBeVisible();

    await gridButton(page, 'All categories, Strong: 11 entries').click();
    await expect(countLine(page)).toHaveText('11 of 118 · Strong');
    expect(new URL(page.url()).searchParams.get('confidence')).toBe('Strong');
  });

  test('combines filter chips with AND, and each active filter can be removed', async ({
    page,
  }) => {
    await openPatterns(page);

    await panel(page).getByRole('button', { name: 'methodology', exact: true }).click();
    await panel(page).getByRole('button', { name: 'Experimental', exact: true }).click();
    const expected = entries.filter(
      (entry) => entry.confidence === 'Experimental' && entry.category === 'methodology',
    );
    expect(expected.length).toBeGreaterThan(0);

    const methodologyCount = await countLine(page).textContent();
    expect(methodologyCount).toMatch(/ of 118 · Experimental · methodology$/);

    await page.getByRole('button', { name: 'Remove filter: Type: methodology' }).click();
    await expect(countLine(page)).toHaveText(
      `${entries.filter((entry) => entry.confidence === 'Experimental').length} of 118 · Experimental`,
    );

    await page.getByRole('button', { name: 'Clear filters' }).click();
    await expect(countLine(page)).toHaveText('118 of 118');
  });

  test('opens Agent Teams with its aliases, nine related patterns, and what refers to it', async ({
    page,
  }) => {
    await openPatterns(page);
    await openEntry(page, 'Agent Teams');

    await expect(page.getByRole('list', { name: 'Labels' })).toContainText('Confidence: Emerging');
    await expect(page.getByText(/Also known as:.*Peer Mesh/)).toBeVisible();
    await expect(page.getByRole('heading', { level: 3, name: 'When to use it' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 3, name: 'When not to use it' })).toBeVisible();

    const related = page.getByRole('region', { name: 'Related patterns' });
    await expect(related.locator('a')).toHaveCount(9);
    await expect(
      related.getByRole('link', { name: 'Delegation Chain', exact: true }),
    ).toBeVisible();
    await expect(
      related.getByRole('link', { name: 'Subagent Context Isolation', exact: true }),
    ).toBeVisible();

    // The tenth link has no note, so it's a disabled pill with a tooltip.
    const dangling = related.locator('[aria-disabled="true"]');
    await expect(dangling).toHaveCount(1);
    await expect(dangling).toHaveAttribute('title', 'No note for this pattern yet.');
    await dangling.focus();
    await expect(related.getByRole('tooltip')).toBeVisible();

    const referencing = entries
      .filter((entry) => entry.related.some((name) => name.toLowerCase() === 'agent teams'))
      .map((entry) => entry.name)
      .sort();
    const referencedBy = page.getByRole('region', { name: 'Referenced by' });
    await expect(referencedBy.locator('li a span:first-child')).toHaveText(referencing);
    await expect(referencedBy.getByText(/^(mutual|one-way)$/)).toHaveCount(referencing.length);
  });

  test('shows mutual and one-way references differently', async ({ page }) => {
    await openPatterns(page, '#agent-teams');

    const referencedBy = page.getByRole('region', { name: 'Referenced by' });
    const names = entries.find((entry) => entry.name === 'Agent Teams')?.related ?? [];
    const mutual = entries
      .filter((entry) => entry.related.includes('Agent Teams') && names.includes(entry.name))
      .map((entry) => entry.name);
    await expect(referencedBy.getByText('mutual', { exact: true })).toHaveCount(mutual.length);
  });

  test('searches a quoted phrase that only appears in the drawbacks', async ({ page }) => {
    await openPatterns(page);

    await page.getByRole('searchbox', { name: 'Search patterns' }).fill('"cap inflation"');

    await expect(panel(page).locator('li h3')).toHaveCount(1);
    const card = panel(page).locator('li', { hasText: 'Circuit Breaker' });
    await expect(card.getByRole('link', { name: 'Circuit Breaker' })).toBeVisible();
    await expect(card).toContainText('matched in Drawbacks and failure modes');
    await expect(card.locator('mark')).toHaveText('cap inflation');
    await expect(countLine(page)).toHaveText('1 of 118 · "cap inflation"');
  });

  test('requires every word to match and ranks a name match first', async ({ page }) => {
    await openPatterns(page);
    const search = page.getByRole('searchbox', { name: 'Search patterns' });

    await search.fill('circuit breaker');
    await expect(panel(page).locator('li h3').first()).toHaveText('Circuit Breaker');
    await expect(panel(page).locator('li h3')).not.toHaveCount(0);

    await search.fill('circuit zzzqqq');
    await expect(panel(page).getByText('Nothing matches.')).toBeVisible();
    await panel(page).getByRole('button', { name: 'Clear filters' }).last().click();
    await expect(panel(page).locator('li h3')).toHaveCount(118);
  });

  test('finds an entry by one of its aliases and says so', async ({ page }) => {
    await openPatterns(page);

    await page.getByRole('searchbox', { name: 'Search patterns' }).fill('"Peer Mesh"');

    const card = panel(page).locator('li', { hasText: 'Agent Teams' }).first();
    await expect(card).toContainText('matched in Also known as');
  });

  test('keeps the view in the address, so a pasted link opens the same pattern and filters', async ({
    page,
    context,
  }) => {
    const verification = entries.filter(
      (entry) => entry.category === 'verification' && entry.maturity === 'established',
    );
    const target = verification[1] as Entry;

    await openPatterns(page);
    await gridButton(page, `verification, established: ${verification.length} entries`).click();
    await cardLink(page, target.name).click();
    await expect(page.getByRole('heading', { level: 2, name: target.name })).toBeVisible();

    const address = new URL(page.url());
    expect(address.hash).toBe(`#${target.id}`);
    expect(address.searchParams.get('category')).toBe('verification');
    expect(address.searchParams.get('maturity')).toBe('established');

    const second = await context.newPage();
    await openExperiment(second, `${address.pathname}${address.search}${address.hash}`);

    await expect(second.getByRole('heading', { level: 2, name: target.name })).toBeVisible();
    await expect(second.getByText(`2 of ${verification.length}`)).toBeVisible();
    await second.getByRole('button', { name: 'Back to the list' }).click();
    await expect(countLine(second)).toHaveText(
      `${verification.length} of 118 · verification · established`,
    );
  });

  test('opens a deep link that names no entry, with a way back', async ({ page }) => {
    await openPatterns(page, '#no-such-pattern');

    await expect(page.getByRole('heading', { name: 'No entry with that link' })).toBeVisible();
    await page.getByRole('button', { name: 'Back to the list' }).click();
    await expect(panel(page).locator('li h3')).toHaveCount(118);
  });

  test('moves between the list and entries with Back and Forward', async ({ page }) => {
    await openPatterns(page);

    await openEntry(page, 'Agent Teams');
    await page.getByRole('link', { name: 'Delegation Chain', exact: true }).first().click();
    await expect(page.getByRole('heading', { level: 2, name: 'Delegation Chain' })).toBeVisible();
    expect(new URL(page.url()).hash).toBe('#delegation-chain');

    await page.goBack();
    await expect(page.getByRole('heading', { level: 2, name: 'Agent Teams' })).toBeVisible();
    await page.goBack();
    await expect(page.getByRole('heading', { level: 2, name: 'Patterns' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'Patterns' })).toBeFocused();

    await page.goForward();
    await expect(page.getByRole('heading', { level: 2, name: 'Agent Teams' })).toBeFocused();
  });

  test('restores the list’s scroll position when you come back to it', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await openPatterns(page);

    const link = cardLink(page, 'Parallel Worktree Swarm');
    await link.scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollBy(0, 150));
    const before = await page.evaluate(() => window.scrollY);
    expect(before).toBeGreaterThan(1500);

    await link.click();
    await expect(
      page.getByRole('heading', { level: 2, name: 'Parallel Worktree Swarm' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Back to the list' }).click();
    await expect(page.getByRole('heading', { level: 2, name: 'Patterns' })).toBeVisible();

    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(before - 5);
    expect(await page.evaluate(() => window.scrollY)).toBeLessThan(before + 5);
  });

  test('steps through the filtered list with the buttons and the j, k, /, and Escape keys', async ({
    page,
  }) => {
    await openPatterns(page);
    await gridButton(page, 'planning, all: 9 entries').click();
    const planning = entries
      .filter((entry) => entry.category === 'planning')
      .map((entry) => entry.name);
    const [first, second] = planning as [string, string];

    await openEntry(page, first);
    await expect(page.getByText(`1 of ${planning.length}`)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Previous' })).toBeDisabled();

    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByRole('heading', { level: 2, name: second, exact: true })).toBeVisible();

    await page.keyboard.press('k');
    await expect(page.getByRole('heading', { level: 2, name: first, exact: true })).toBeVisible();
    await page.keyboard.press('j');
    await expect(page.getByRole('heading', { level: 2, name: second, exact: true })).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByRole('heading', { level: 2, name: 'Patterns' })).toBeFocused();
    await expect(countLine(page)).toHaveText('9 of 118 · planning');

    await page.keyboard.press('/');
    await expect(page.getByRole('searchbox', { name: 'Search patterns' })).toBeFocused();

    // Shortcuts stay out of the way while typing.
    await page.keyboard.type('jk');
    await expect(page.getByRole('searchbox', { name: 'Search patterns' })).toHaveValue('jk');
    await expect(page.getByRole('heading', { level: 2, name: 'Patterns' })).toBeVisible();
  });

  test('opens an entry from the keyboard with Enter', async ({ page }) => {
    await openPatterns(page);

    await cardLink(page, 'Circuit Breaker').focus();
    await page.keyboard.press('Enter');

    await expect(page.getByRole('heading', { level: 2, name: 'Circuit Breaker' })).toBeFocused();
  });

  test('shows the neighborhood graph and a text list of what an entry links to', async ({
    page,
  }) => {
    await openPatterns(page, '#circuit-breaker');

    const neighborhood = page.getByRole('region', {
      name: 'Neighborhood graph of Circuit Breaker',
    });
    await expect(neighborhood.locator('svg a')).not.toHaveCount(0);
    await neighborhood.locator('svg a').first().focus();
    await expect(neighborhood.locator('svg text')).not.toHaveCount(0);
  });

  test('collapses a very long section behind Show more', async ({ page }) => {
    await openPatterns(page);
    const long = entries.find((entry) => entry.name === 'Vibe Coding');
    expect(long).toBeTruthy();

    await openEntry(page, 'Vibe Coding');
    const toggle = page.getByRole('button', { name: 'Show more' }).first();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await toggle.click();
    await expect(page.getByRole('button', { name: 'Show less' }).first()).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });
});

test.describe('the graph', () => {
  test('draws every entry, lists the 15 most connected, and opens an entry on click', async ({
    page,
  }) => {
    await openPatterns(page, '?view=graph');

    await expect(page.getByRole('heading', { level: 2, name: 'Relationship graph' })).toBeVisible();
    const nodes = page.locator('svg[aria-label^="Relationship graph"] a');
    await expect(nodes).toHaveCount(118);

    const mostConnected = page.getByRole('region', { name: 'Most connected' }).locator('ol > li');
    await expect(mostConnected).toHaveCount(15);

    // A name shows on focus, not only on hover.
    await nodes.first().focus();
    await expect(page.locator('svg[aria-label^="Relationship graph"] text')).toHaveCount(1);

    await nodes.nth(3).click({ force: true });
    await expect(page.getByRole('button', { name: 'Back to the list' })).toBeVisible();
    expect(new URL(page.url()).hash).not.toBe('');
  });

  test('dims what the search does not match instead of removing it', async ({ page }) => {
    await openPatterns(page, '?view=graph');
    const nodes = page.locator('svg[aria-label^="Relationship graph"] a');
    await expect(nodes).toHaveCount(118);

    await page.getByRole('searchbox', { name: 'Search patterns' }).fill('circuit breaker');

    await expect(nodes).toHaveCount(118);
    const dimmed = page.locator('svg[aria-label^="Relationship graph"] a[style*="opacity: 0.2"]');
    const matches = Number((await countLine(page).textContent())?.split(' ')[0]);
    expect(matches).toBeGreaterThan(0);
    await expect(dimmed).toHaveCount(118 - matches);
    await expect(page.getByRole('link', { name: /^Circuit Breaker, / })).not.toHaveAttribute(
      'style',
      /opacity: 0.2/,
    );
  });

  test('zooms and fits to the screen', async ({ page }) => {
    await openPatterns(page, '?view=graph');
    const group = page.locator('svg[aria-label^="Relationship graph"] > g');
    await expect(group).toHaveAttribute('transform', /scale\(/);
    const fitted = await group.getAttribute('transform');

    await page.getByRole('button', { name: 'Zoom in' }).click();
    expect(await group.getAttribute('transform')).not.toBe(fitted);

    await page.getByRole('button', { name: 'Fit to screen' }).click();
    expect(await group.getAttribute('transform')).toBe(fitted);
  });

  test('pans when you drag the background and zooms with the wheel', async ({ page }) => {
    await openPatterns(page, '?view=graph');
    const svg = page.locator('svg[aria-label^="Relationship graph"]');
    const group = svg.locator('> g');
    await expect(group).toHaveAttribute('transform', /scale\(/);
    await svg.scrollIntoViewIfNeeded();
    const box = await svg.boundingBox();
    if (!box) throw new Error('The graph has no box.');
    const translation = async (): Promise<number[]> =>
      ((await group.getAttribute('transform')) ?? '')
        .match(/translate\(([^ ]+) ([^)]+)\)/)!
        .slice(1)
        .map(Number);

    const [startX = 0, startY = 0] = await translation();
    // The corner holds no node, so the drag starts on the background.
    await page.mouse.move(box.x + 8, box.y + box.height - 8);
    await page.mouse.down();
    await page.mouse.move(box.x + 68, box.y + box.height - 48, { steps: 4 });
    await page.mouse.up();
    const [endX = 0, endY = 0] = await translation();
    expect(Math.round(endX - startX)).toBe(60);
    expect(Math.round(endY - startY)).toBe(-40);

    const before = await group.getAttribute('transform');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(0, -300);
    await expect.poll(() => group.getAttribute('transform')).not.toBe(before);
    expect(new URL(page.url()).hash).toBe('');
  });
});

test.describe('comparing', () => {
  test('compares up to three entries, with shared relations highlighted', async ({ page }) => {
    await openPatterns(page);

    await page.getByRole('checkbox', { name: 'Compare Agent Teams' }).check();
    await page.getByRole('checkbox', { name: 'Compare Agent Handoff' }).check();
    await expect(page.getByText('Comparing 2 of 3')).toBeVisible();

    await page.getByRole('checkbox', { name: 'Compare Circuit Breaker' }).check();
    await expect(page.getByRole('checkbox', { name: 'Compare Vibe Coding' })).toBeDisabled();

    await page
      .getByRole('button', { name: 'Remove Circuit Breaker from the comparison' })
      .first()
      .click();
    await page.getByRole('button', { name: 'Open comparison' }).click();

    await expect(page.getByRole('heading', { level: 2, name: 'Compare patterns' })).toBeFocused();
    const columns = page.getByRole('article');
    await expect(columns).toHaveCount(2);
    await expect(
      columns.first().getByRole('heading', { level: 4, name: 'When not to use it' }),
    ).toBeVisible();
    await expect(
      columns.first().getByRole('heading', { level: 4, name: 'Maturity and confidence' }),
    ).toBeVisible();

    const teams = new Set(entryNamed('Agent Teams').related.map((name) => name.toLowerCase()));
    const sharedCount = entryNamed('Agent Handoff').related.filter((name) =>
      teams.has(name.toLowerCase()),
    ).length;
    expect(sharedCount).toBeGreaterThan(0);
    await expect(page.getByText('(shared)')).toHaveCount(sharedCount * 2);
    expect(new URL(page.url()).searchParams.get('compare')).toBe('agent-teams,agent-handoff');
  });

  test('says so when there is nothing to compare', async ({ page }) => {
    await openPatterns(page, '?view=compare');

    await expect(page.getByText('Nothing to compare yet.')).toBeVisible();
  });
});

test.describe('the shortlist', () => {
  test('exports starred entries as Markdown for the vault and as CSV', async ({ page }) => {
    await openPatterns(page);

    await page.getByRole('button', { name: 'Shortlist Circuit Breaker' }).click();
    await page.getByRole('button', { name: 'Shortlist Agent Teams' }).click();
    await expect(page.getByRole('tab', { name: 'Shortlist (2)' })).toBeVisible();

    await page.getByRole('tab', { name: 'Shortlist (2)' }).click();
    await expect(page.getByRole('heading', { level: 2, name: 'Shortlist' })).toBeFocused();
    await page
      .getByRole('textbox', { name: /Note for Agent Teams/ })
      .fill('Try it on a review task.');

    const preview = page.getByRole('textbox', { name: 'Markdown for your vault' });
    await expect(preview).toHaveValue(/## Contents/);
    const markdown = await preview.inputValue();
    expect(markdown.match(/^- \[\[[^\]]+\]\]/gm)).toEqual([
      '- [[Agent Teams]]',
      '- [[Circuit Breaker]]',
    ]);
    expect(markdown).toContain('- [[Agent Teams]]—Try it on a review task.');

    const markdownDownload = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download Markdown' }).click();
    const markdownFile = await markdownDownload;
    expect(markdownFile.suggestedFilename()).toBe('pattern-shortlist.md');
    const markdownPath = await markdownFile.path();
    expect(readFileSync(markdownPath, 'utf8')).toBe(markdown);

    const csvDownload = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download CSV' }).click();
    const csv = readFileSync(await (await csvDownload).path(), 'utf8').split('\r\n');
    expect(csv[0]).toBe('name,category,maturity,confidence,note');
    expect(csv[1]).toBe('Agent Teams,multi-agent,emerging,Emerging,Try it on a review task.');
    expect(csv[2]).toBe('Circuit Breaker,control-loop,established,Emerging,');
  });

  test('keeps the shortlist in this browser, and works when storage is blocked', async ({
    page,
  }) => {
    await openPatterns(page);
    await page.getByRole('button', { name: 'Shortlist Agent Teams' }).click();
    await expect(page.getByRole('button', { name: 'Shortlist Agent Teams' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-hydrated', 'true');
    await expect(page.getByRole('button', { name: 'Shortlist Agent Teams' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  test('still works with storage blocked', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        get() {
          throw new Error('blocked');
        },
      });
    });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await openPatterns(page);

    await page.getByRole('button', { name: 'Shortlist Agent Teams' }).click();
    await page.getByRole('tab', { name: 'Shortlist (1)' }).click();

    await expect(page.getByRole('link', { name: 'Agent Teams', exact: true })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('says so when nothing is starred', async ({ page }) => {
    await openPatterns(page, '?view=shortlist');

    await expect(page.getByText('Nothing on your shortlist yet.')).toBeVisible();
    await page.getByRole('button', { name: 'Browse the library' }).click();
    await expect(page.getByRole('heading', { level: 2, name: 'Patterns' })).toBeVisible();
  });
});

test.describe('your own notes', () => {
  test('loads a folder of three notes, one typed index, as two entries and one exclusion', async ({
    page,
  }) => {
    await openPatterns(page);
    await page.locator('input[webkitdirectory]').setInputFiles(fixtureDirectory('three-notes'));

    await expect(page.getByText('Viewing 2 notes from')).toBeVisible();
    await expect(page.getByText('three-notes', { exact: true })).toBeVisible();
    await expect(countLine(page)).toHaveText('2 of 2');
    await expect(panel(page).locator('li h3')).toHaveText(['Harbor Method', 'Lantern Loop']);

    const diagnostics = page.locator('details', { hasText: 'Diagnostics' });
    await expect(diagnostics).toHaveAttribute('open', '');
    await expect(diagnostics.getByRole('heading', { name: 'Excluded notes (1)' })).toBeVisible();
    await expect(diagnostics).toContainText('three-notes/Index.md');
    await expect(diagnostics).toContainText('Its type is "index"');
    await expect(
      diagnostics.getByRole('heading', { name: 'Dangling related links (1)' }),
    ).toBeVisible();
    await expect(diagnostics).toContainText('links to “Missing Note”');
  });

  test('reads frontmatter variants, ignores a self-reference, and links to the entries it has', async ({
    page,
  }) => {
    await openPatterns(page);
    await page.locator('input[webkitdirectory]').setInputFiles(fixtureDirectory('three-notes'));
    await expect(page.getByText('Viewing 2 notes from')).toBeVisible();

    await openEntry(page, 'Lantern Loop');
    await expect(page.getByText('Also known as: Beacon Cycle, Lantern, again')).toBeVisible();
    await expect(page.getByRole('list', { name: 'Labels' })).toContainText('Confidence: Strong');

    const related = page.getByRole('region', { name: 'Related patterns' });
    await expect(related.locator('a')).toHaveText(['Harbor Method']);
    await expect(related.locator('[aria-disabled="true"]')).toHaveText('Missing Note');

    // A wikilink to a note the library has becomes a link inside the page.
    await page.getByRole('link', { name: 'Harbor Method', exact: true }).first().click();
    await expect(page.getByRole('heading', { level: 2, name: 'Harbor Method' })).toBeVisible();
    await expect(page.getByText('Also known as: Safe Harbor')).toBeVisible();
  });

  test('changes the included types, and returns to the bundled library', async ({ page }) => {
    await openPatterns(page);
    await page.locator('input[webkitdirectory]').setInputFiles(fixtureDirectory('three-notes'));
    await expect(countLine(page)).toHaveText('2 of 2');

    const types = page.getByRole('textbox', { name: 'Included types' });
    await expect(types).toHaveValue('pattern, methodology');
    await types.fill('pattern');
    await types.press('Enter');
    await types.blur();

    await expect(page.getByText('Viewing 1 note from')).toBeVisible();
    await expect(page.locator('details', { hasText: 'Diagnostics' })).toContainText(
      'Its type is "methodology", and only pattern is included.',
    );

    await page.getByRole('button', { name: 'Return to bundled library' }).click();
    await expect(countLine(page)).toHaveText('118 of 118');
    await expect(page.getByText(/^Viewing \d+ notes? from/)).toHaveCount(0);
  });

  test('says so when none of the notes has an included type', async ({ page }) => {
    await openPatterns(page);
    await page.locator('input[webkitdirectory]').setInputFiles(fixtureDirectory('three-notes'));
    await expect(countLine(page)).toHaveText('2 of 2');

    const types = page.getByRole('textbox', { name: 'Included types' });
    await types.fill('recipe');
    await types.press('Enter');
    await types.blur();

    await expect(page.getByText('No entries loaded.')).toBeVisible();
    await page.getByRole('button', { name: 'Return to bundled library' }).first().click();
    await expect(panel(page).locator('li h3')).toHaveCount(118);
  });

  test('names the missing section of a partial entry, linked to the entry', async ({ page }) => {
    await openPatterns(page);
    await page.locator('input[webkitdirectory]').setInputFiles(fixtureDirectory('hostile'));
    await expect(page.getByText('Viewing 2 notes from')).toBeVisible();

    const partialTag = panel(page)
      .locator('li', { hasText: 'Thin Note' })
      .locator('ul[aria-label="Labels"] li', { hasText: /^partial$/ });
    await expect(partialTag).toHaveCount(1);
    await expect(
      panel(page).locator('li', { hasText: 'Trojan Note' }).getByText('partial', { exact: true }),
    ).toHaveCount(0);

    const diagnostics = page.locator('details', { hasText: 'Diagnostics' });
    await expect(diagnostics.getByRole('heading', { name: 'Partial entries (1)' })).toBeVisible();
    await expect(diagnostics).toContainText('is missing When to use it, When not to use it');
    await diagnostics.getByRole('link', { name: 'Thin Note' }).first().click();
    await expect(page.getByRole('heading', { level: 2, name: 'Thin Note' })).toBeVisible();
    await expect(page.getByText('partial entry')).toBeVisible();
    await expect(page.getByText('Not recorded.')).toHaveCount(3);
  });

  test('renders a note with a script tag and a javascript: link as inert text', async ({
    page,
  }) => {
    const dialogs: string[] = [];
    page.on('dialog', (dialog) => {
      dialogs.push(dialog.message());
      void dialog.dismiss();
    });

    await openPatterns(page);
    await page.locator('input[webkitdirectory]').setInputFiles(fixtureDirectory('hostile'));
    await expect(page.getByText('Viewing 2 notes from')).toBeVisible();
    await openEntry(page, 'Trojan Note');

    const detail = panel(page);
    await expect(detail.getByText('<script>window.__injected = true</script>')).toBeVisible();
    await expect(detail.getByText('<img src=x onerror="window.__injected=true">')).toBeVisible();
    await expect(
      detail.getByText('<a href="javascript:window.__injected=true">inline HTML link</a>'),
    ).toBeVisible();

    await expect(detail.locator('script, img, iframe, object, embed')).toHaveCount(0);
    await expect(detail.locator('a[href^="javascript:" i], a[href^="data:" i]')).toHaveCount(0);
    await expect(detail.locator('[onerror], [onclick]:not(a, button)')).toHaveCount(0);

    // The unsafe link keeps its words, as text. The safe one opens in a new tab with no opener.
    await expect(detail.getByText('the unsafe one')).toBeVisible();
    await expect(detail.getByRole('link', { name: 'the unsafe one' })).toHaveCount(0);
    const safe = detail.getByRole('link', { name: /the safe link/ });
    await expect(safe).toHaveAttribute('href', 'https://example.com/docs');
    await expect(safe).toHaveAttribute('target', '_blank');
    await expect(safe).toHaveAttribute('rel', 'noopener noreferrer');

    expect(
      await page.evaluate(() => (window as unknown as { __injected?: boolean }).__injected),
    ).toBeUndefined();
    expect(dialogs).toEqual([]);
  });

  test('accepts dropped files anywhere on the page', async ({ page }) => {
    await openPatterns(page);

    const dataTransfer = await page.evaluateHandle(() => {
      const transfer = new DataTransfer();
      transfer.items.add(
        new File(['---\ntype: pattern\n---\n## TL;DR\nDropped.'], 'Dropped Note.md'),
      );

      return transfer;
    });
    await page.getByRole('heading', { level: 1 }).last().dispatchEvent('drop', { dataTransfer });

    await expect(page.getByText('Viewing 1 note from')).toBeVisible();
    await expect(page.getByText('your files', { exact: true })).toBeVisible();
    await expect(panel(page).locator('li h3')).toHaveText(['Dropped Note']);
  });
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 360, height: 800 } });

  test('never scrolls sideways in any view', async ({ page }) => {
    await openPatterns(page);
    expect(await horizontalOverflow(page)).toBe(0);

    await openEntry(page, 'Agent Teams');
    expect(await horizontalOverflow(page)).toBe(0);
    await page.getByRole('button', { name: 'Back to the list' }).click();

    await page.getByRole('checkbox', { name: 'Compare Agent Teams' }).check();
    await page.getByRole('checkbox', { name: 'Compare Agent Handoff' }).check();
    await page.getByRole('button', { name: 'Shortlist Agent Teams' }).click();
    await page.getByRole('button', { name: 'Open comparison' }).click();
    await expect(page.getByRole('heading', { level: 2, name: 'Compare patterns' })).toBeVisible();
    expect(await horizontalOverflow(page)).toBe(0);

    await page.getByRole('tab', { name: 'Shortlist (1)' }).click();
    await expect(page.getByRole('heading', { level: 2, name: 'Shortlist' })).toBeVisible();
    expect(await horizontalOverflow(page)).toBe(0);

    await page.getByRole('tab', { name: 'Graph' }).click();
    await expect(page.locator('svg[aria-label^="Relationship graph"] a')).toHaveCount(118);
    expect(await horizontalOverflow(page)).toBe(0);
  });

  test('keeps the heat grid and the diagnostics inside their own boxes', async ({ page }) => {
    await openPatterns(page);
    await page.locator('input[webkitdirectory]').setInputFiles(fixtureDirectory('three-notes'));
    await expect(page.getByText('Viewing 2 notes from')).toBeVisible();

    expect(await horizontalOverflow(page)).toBe(0);
    const grid = page.getByRole('region', { name: /^Entries by category/ });
    expect(await grid.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
  });
});
