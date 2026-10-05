import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { fileURLToPath } from 'node:url';

import { openExperiment } from './helpers/open-experiment';

// The fixtures are synthetic settings files laid out like a home folder's
// .claude and a repository's .claude. The project file has a comment, so it's
// read leniently.
const fixture = (name: string): string =>
  fileURLToPath(new URL(`./fixtures/lethal-trifecta/${name}`, import.meta.url));

const path = '/experiments/lethal-trifecta';

const open = (page: Page): Promise<void> => openExperiment(page, path);

const preset = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
const verdict = (page: Page) => page.getByTestId('verdict');
const node = (page: Page, id: string) => page.locator(`[data-node="${id}"]`);
const control = (page: Page, id: string) => page.locator(`#control-${id}`);
const folderInput = (page: Page) => page.locator('input[webkitdirectory]');
const warning = (page: Page, id: string) => page.locator(`[data-warning="${id}"]`);

const horizontalOverflow = (page: Page): Promise<number> =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

/** Opens the page and skips the prediction, for tests about something else. */
const openRevealed = async (page: Page): Promise<void> => {
  await open(page);
  await page.getByRole('button', { name: 'Skip and show me' }).click();
};

test('responds with 200 and a descriptive title', async ({ page }) => {
  const response = await page.goto(path);

  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle(/Cut a Leg/);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Cut a leg of the lethal trifecta.' }),
  ).toBeVisible();
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('asks for a prediction but disables the controls', async ({ page }) => {
    await page.goto(path);

    await expect(page.getByText('Is this agent still exploitable?')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Yes, still exploitable' })).toBeDisabled();
    await expect(control(page, 'reader-doer')).toBeDisabled();
  });
});

test.describe('predict first', () => {
  test('loads the careful team and hides the verdict until the learner answers', async ({
    page,
  }) => {
    await open(page);

    await expect(preset(page, 'Careful team')).toHaveAttribute('aria-pressed', 'true');
    await expect(control(page, 'claude-md-line')).toBeChecked();
    await expect(control(page, 'auto-mode')).toBeChecked();
    await expect(control(page, 'deny-curl')).toBeChecked();
    await expect(verdict(page)).toHaveCount(0);
    await expect(page.getByText('Make your prediction above to see the verdict.')).toBeVisible();
    await expect(page.locator('[data-path]')).toHaveCount(0);
  });

  test('reveals the answer next to a wrong prediction', async ({ page }) => {
    await open(page);
    await page.getByRole('button', { name: 'No, it’s protected' }).click();

    const result = page.getByTestId('prediction-result');
    await expect(result).toContainText('You said no.');
    await expect(result).toContainText('yes, still exploitable');
    await expect(result).toContainText('The plausible answer is the wrong one here.');
    await expect(page.getByRole('button', { name: 'No, it’s protected' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(verdict(page)).toHaveAttribute('data-verdict', 'exploitable');
  });

  test('says right for a right prediction, and a skip reveals it too', async ({ page }) => {
    await open(page);
    await page.getByRole('button', { name: 'Yes, still exploitable' }).click();
    await expect(page.getByTestId('prediction-result')).toContainText('Right.');

    await open(page);
    await page.getByRole('button', { name: 'Skip and show me' }).click();
    await expect(page.getByTestId('prediction-result')).toContainText('You skipped the prediction');
    await expect(verdict(page)).toBeVisible();
  });
});

test('acceptance 1: the default agent is exploitable from an issue through env tokens to the network', async ({
  page,
}) => {
  await openRevealed(page);
  await preset(page, 'Default coding agent').click();

  await expect(verdict(page)).toContainText('Exploitable: all three legs are intact.');
  await expect(page.getByTestId('path')).toHaveText(
    'A stranger’s issue → agent context ← exported tokens in the environment → the shell network.',
  );
  await expect(page.locator('[data-path="true"]')).toHaveCount(3);
  for (const id of ['issues', 'environment', 'shell-network']) {
    await expect(node(page, id)).toHaveAttribute('data-path', 'true');
  }
});

test('acceptance 2: the careful team is still exploitable, and its controls say why', async ({
  page,
}) => {
  await openRevealed(page);

  await expect(verdict(page)).toContainText('Exploitable');
  await expect(page.getByTestId('path')).toContainText('through any HTTP client but curl');
  await expect(page.locator('[data-control="claude-md-line"]')).toContainText('cuts nothing');
  await expect(page.locator('[data-control="deny-curl"]')).toContainText('partial');
  await expect(page.locator('[data-control="auto-mode"]')).toContainText(
    'best-effort, cuts nothing guaranteed',
  );
});

test.describe('acceptance 3: strict egress', () => {
  test('lists five exits with deferred execution off until its card is shown', async ({ page }) => {
    await openRevealed(page);
    await preset(page, 'Default coding agent').click();

    for (const id of [
      'shell-network',
      'unsandboxed-shell',
      'web-fetch',
      'git-push',
      'public-comment',
    ]) {
      await expect(node(page, id)).toHaveAttribute('data-edge', 'live');
    }
    await expect(node(page, 'deferred-execution')).toHaveAttribute('data-edge', 'absent');

    await page.getByRole('button', { name: 'Show me: Deferred execution' }).click();
    await expect(node(page, 'deferred-execution')).toHaveAttribute('data-edge', 'live');
    await expect(page.locator('#node-deferred-execution')).toBeChecked();
  });

  test('cuts the way out, keeps push and comments as residual risks, then reopens through gist', async ({
    page,
  }) => {
    await openRevealed(page);
    await preset(page, 'Default coding agent').click();
    for (const id of [
      'default-deny-egress',
      'no-unsandboxed-retry',
      'deny-web-fetch',
      'publish-gate',
    ]) {
      await control(page, id).check();
    }

    await expect(verdict(page)).toHaveAttribute('data-verdict', 'safe');
    await expect(verdict(page)).toContainText(
      'Leg cut: no path from untrusted content to an exit carries private data.',
    );
    await expect(page.getByTestId('leg-line')).toHaveText('Leg cut: a way out.');
    const risks = page.getByTestId('residual-risks').locator('[data-risk="human-gate"]');
    await expect(risks).toHaveCount(2);
    await expect(risks.nth(0)).toContainText('→ a git push, held only by the prompt');
    await expect(risks.nth(1)).toContainText('→ a public comment, held only by the prompt');
    await expect(node(page, 'shell-network')).toHaveAttribute('data-edge', 'cut');
    await expect(node(page, 'shell-network')).toContainText('Cut by Default-deny egress');
    await expect(node(page, 'git-push')).toHaveAttribute('data-edge', 'gated');

    await page.getByRole('checkbox', { name: /^gist\.github\.com/ }).check();

    await expect(verdict(page)).toHaveAttribute('data-verdict', 'exploitable');
    await expect(page.getByTestId('path')).toContainText(
      'the shell network to allowlisted gist.github.com',
    );
    await expect(verdict(page)).toContainText('the allowlist admits gist.github.com');
  });
});

test('acceptance 4: the reader/doer split cuts untrusted content reaching the acting agent', async ({
  page,
}) => {
  await openRevealed(page);
  await preset(page, 'Default coding agent').click();
  await control(page, 'reader-doer').check();

  await expect(verdict(page)).toHaveAttribute('data-verdict', 'safe');
  await expect(page.getByTestId('leg-line')).toHaveText(
    'Leg cut: untrusted content reaching the acting agent.',
  );
  await expect(preset(page, 'Reader/doer split')).toHaveAttribute('aria-pressed', 'true');
});

test.describe('the other presets and edge cases', () => {
  test('the convenient allowlist is exploitable through gist', async ({ page }) => {
    await openRevealed(page);
    await preset(page, 'Sandboxed, with a convenient allowlist').click();

    await expect(page.getByTestId('path')).toContainText('allowlisted gist.github.com');
  });

  test('the container cuts the way out and narrows private data to the source', async ({
    page,
  }) => {
    await openRevealed(page);
    await preset(page, 'Container, credentials outside, default-deny egress').click();

    await expect(page.getByTestId('leg-line')).toHaveText('Leg cut: a way out.');
    await expect(node(page, 'source')).toHaveAttribute('data-edge', 'live');
    await expect(node(page, 'environment')).toHaveAttribute('data-edge', 'cut');
  });

  test('no sources is not exploitable, and unusual', async ({ page }) => {
    await openRevealed(page);
    for (const id of [
      'issues',
      'web-pages',
      'dependencies',
      'mcp-results',
      'cloned-repositories',
    ]) {
      await page.locator(`#node-${id}`).uncheck();
    }

    await expect(verdict(page)).toContainText('unusual for a coding agent—are you sure?');
    await expect(preset(page, 'Careful team')).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByTestId('preset-notice')).toHaveText(
      'Custom setup. Pick a preset to get back to a worked example.',
    );
  });

  test('hovering a control highlights the edges it removes', async ({ page }) => {
    await openRevealed(page);

    await page.locator('[data-control="reader-doer"]').hover();
    await expect(page.locator('[data-highlighted="true"]')).toHaveCount(5);
    await expect(node(page, 'issues')).toHaveAttribute('data-highlighted', 'true');

    await control(page, 'publish-gate').focus();
    await expect(node(page, 'git-push')).toHaveAttribute('data-highlighted', 'true');
    await expect(node(page, 'public-comment')).toHaveAttribute('data-highlighted', 'true');
  });

  test('the text equivalent lists the live paths', async ({ page }) => {
    await openRevealed(page);

    await expect(page.getByTestId('live-paths')).toContainText('is a live path');
    await expect(page.getByTestId('live-paths')).toContainText(
      'Issues and pull requests from strangers',
    );
  });
});

test.describe('load your settings', () => {
  test('acceptance 5 and 6: warns about Read(.env) and a broad curl allow', async ({ page }) => {
    await openRevealed(page);
    await folderInput(page).setInputFiles(fixture('project'));
    await expect(page.getByText('Read 2 settings files.')).toBeVisible();

    await expect(warning(page, 'env-pattern')).toContainText(
      'Read(.env) doesn’t cover .env.local. Read(.env) doesn’t match it, and Read(**/.env*) does.',
    );
    // npm test is flagged too: it runs whatever the repository's test script says.
    await expect(warning(page, 'unsandboxed-retry')).toHaveCount(2);
    await expect(
      warning(page, 'unsandboxed-retry').filter({ hasText: 'Bash(curl *) also' }),
    ).toContainText('Bash(curl *) also approves an unsandboxed retry');
    await expect(warning(page, 'allowlist')).toContainText('gist.github.com');
    await expect(warning(page, 'excluded-network')).toContainText('docker compose *');

    const settingsRead = page.getByTestId('settings-read');
    await expect(settingsRead).toContainText('comments or trailing commas');
    await expect(settingsRead).toContainText('Keys this tool doesn’t read, and ignores: model.');
  });

  test('fills in controls with the line that justified each one', async ({ page }) => {
    await openRevealed(page);
    await folderInput(page).setInputFiles(fixture('project'));
    await expect(page.getByText('Read 2 settings files.')).toBeVisible();

    await expect(control(page, 'deny-web-fetch')).toBeChecked();
    await expect(page.getByTestId('evidence-deny-web-fetch')).toContainText('"WebFetch"');
    await expect(page.getByTestId('evidence-deny-web-fetch')).toContainText(
      'project/.claude/settings.json (Project), line 5',
    );
    await expect(page.getByTestId('evidence-reader-doer')).toContainText(
      'Not determinable from settings.',
    );
    await expect(page.getByTestId('evidence-default-deny-egress')).toContainText(
      'without strictAllowlist',
    );
  });

  test('shows which scope wins a conflict and lets the learner change it', async ({ page }) => {
    await openRevealed(page);
    await folderInput(page).setInputFiles(fixture('project'));
    await expect(page.getByText('Read 2 settings files.')).toBeVisible();
    await folderInput(page).setInputFiles(fixture('home'));
    await expect(page.getByText('Read 1 settings file.')).toBeVisible();

    const conflicts = page.getByTestId('conflicts');
    await expect(conflicts).toContainText('sandbox.allowUnsandboxedCommands');
    await expect(conflicts).toContainText('assuming Project, local wins with true');
    await expect(control(page, 'no-unsandboxed-retry')).not.toBeChecked();

    // The user file's strictAllowlist turns default-deny on, and gist reopens it.
    await expect(control(page, 'default-deny-egress')).toBeChecked();
    await expect(page.getByTestId('path')).toContainText('allowlisted gist.github.com');

    await page.getByRole('button', { name: 'Move User earlier' }).click();
    await page.getByRole('button', { name: 'Move User earlier' }).click();
    await expect(conflicts).toContainText('assuming User wins with false');
    await expect(control(page, 'no-unsandboxed-retry')).toBeChecked();
  });

  test('reads pasted settings and says when a paste is empty', async ({ page }) => {
    await openRevealed(page);

    await page
      .getByLabel('Or paste a settings file')
      .fill('{"permissions": {"deny": ["Read(.env)"]}}');
    await page.getByRole('button', { name: 'Add pasted settings' }).click();
    await expect(warning(page, 'env-pattern')).toBeVisible();

    await page.getByRole('button', { name: 'Add pasted settings' }).click();
    await expect(page.getByText('This file is empty, so it changes nothing.')).toBeVisible();
  });
});

test.describe('sharing', () => {
  test('copies a link with the toggles and nothing from an upload, and restores it', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await openRevealed(page);
    await folderInput(page).setInputFiles(fixture('project'));
    await expect(page.getByText('Read 2 settings files.')).toBeVisible();

    await page.getByRole('button', { name: 'Copy link' }).click();
    await expect(page.getByText('Link copied.')).toBeVisible();
    const link = await page.evaluate(() => navigator.clipboard.readText());
    expect(link).toContain('allow=gist.github.com');
    expect(link).not.toContain('npmjs');
    expect(link).not.toContain('docker');

    // A fresh page, so the link is read on load rather than as a same-page hash change.
    const fresh = await context.newPage();
    await fresh.goto(link);
    await expect(fresh.locator('html')).toHaveAttribute('data-hydrated', 'true');
    await expect(control(fresh, 'deny-web-fetch')).toBeChecked();
    await expect(fresh.getByRole('checkbox', { name: /^gist\.github\.com/ })).toBeChecked();
    await expect(verdict(fresh)).toBeVisible();
  });

  test('copies a Markdown summary', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await openRevealed(page);

    await page.getByRole('button', { name: 'Copy summary' }).click();
    await expect(page.getByText('Summary copied as Markdown.')).toBeVisible();
    const summary = await page.evaluate(() => navigator.clipboard.readText());
    expect(summary).toContain('# Cut a Leg');
    expect(summary).toContain('Exploitable: all three legs are intact.');
    expect(summary).toContain('## Residual risks');
  });

  test('falls back to a text box when the clipboard refuses', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: () => Promise.reject(new Error('denied')) },
      });
    });
    await openRevealed(page);

    await page.getByRole('button', { name: 'Copy link' }).click();
    await expect(page.getByRole('textbox', { name: 'Link to copy' })).toHaveValue(/nodes=/);
  });
});

test.describe('CI and the reader/doer demo', () => {
  test('shows which leg each CI choice adds or cuts', async ({ page }) => {
    await openRevealed(page);
    await page.getByRole('button', { name: 'Load the CI agent' }).click();

    const effects = page.getByTestId('ci-effects');
    await expect(effects.locator('[data-effect="adds"]').first()).toContainText(
      'pull_request_target',
    );

    await page.getByRole('button', { name: 'pull_request', exact: true }).click();
    await expect(effects.locator('[data-effect="cuts"]')).toContainText('withholds your secrets');
    await expect(node(page, 'environment')).toContainText('GitHub withholds your secrets');

    await page.getByRole('button', { name: 'OIDC' }).click();
    await expect(effects.locator('[data-effect="narrows"]')).toContainText('expires with the job');
  });

  test('drops the injected action at the strict schema', async ({ page }) => {
    await openRevealed(page);

    const demo = page.getByTestId('reader-doer');
    await expect(demo.locator('[data-stage="schema"]')).toContainText(
      'actions dropped: Not in the schema, and additionalProperties is false.',
    );
    await expect(demo.locator('[data-stage="doer"]').getByRole('listitem')).toHaveCount(2);
    await demo.getByRole('button', { name: 'Play it through' }).click();
    await expect(demo.locator('[data-stage="doer"]')).toContainText('Label the issue “high”');
  });
});

test.describe('at 360 pixels wide', () => {
  for (const colorScheme of ['light', 'dark'] as const) {
    test(`stacks the diagram and keeps tooltips inside the page in ${colorScheme} mode`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 360, height: 800 });
      await page.emulateMedia({ colorScheme });
      await openRevealed(page);
      await folderInput(page).setInputFiles(fixture('project'));
      await expect(page.getByText('Read 2 settings files.')).toBeVisible();

      // The SVG lines are hidden and the columns stack, with each card naming its edge state.
      await expect(page.getByTestId('diagram').locator('svg')).toBeHidden();
      await expect(node(page, 'issues')).toContainText('Live');

      for (const target of [
        node(page, 'public-comment'),
        page.locator('[data-control="deny-curl"]'),
        page.locator('[data-control="auto-mode"]'),
      ]) {
        await target.scrollIntoViewIfNeeded();
        await target.hover();
        await expect(target.getByRole('tooltip')).toBeVisible();
        expect(await horizontalOverflow(page)).toBe(0);
      }

      await page.mouse.move(0, 0);
      await control(page, 'fsmonitor-off').focus();
      const tooltip = page.locator('[data-control="fsmonitor-off"]').getByRole('tooltip');
      await expect(tooltip).toBeVisible();
      const box = await tooltip.boundingBox();
      expect(box && box.x >= 0 && box.x + box.width <= 360).toBe(true);
      expect(await horizontalOverflow(page)).toBe(0);

      await page.locator('#node-web-pages').focus();
      await expect(node(page, 'web-pages').getByRole('tooltip')).toBeVisible();
      expect(await horizontalOverflow(page)).toBe(0);
    });
  }
});
