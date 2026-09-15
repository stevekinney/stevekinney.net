import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { test, expect } from '@playwright/test';
import { compile, type MdsvexOptions } from 'mdsvex';
import { normalizeObsidianMarkdown } from '../../../packages/markdown/src/obsidian-normalization';
import rehypeCallouts from '../../../packages/markdown/src/rehype-callouts';
import rehypeObsidianIdentifiers from '../../../packages/markdown/src/rehype-obsidian-identifiers';
import rehypeObsidianMath, {
  getObsidianMathStylesheet,
} from '../../../packages/markdown/src/rehype-obsidian-math';

test('normalized Obsidian content supports keyboard folding, media, and math in a browser', async ({
  page,
}) => {
  const wave = Buffer.alloc(44 + 1600);
  wave.write('RIFF');
  wave.writeUInt32LE(wave.length - 8, 4);
  wave.write('WAVEfmt ', 8);
  wave.writeUInt32LE(16, 16);
  wave.writeUInt16LE(1, 20);
  wave.writeUInt16LE(1, 22);
  wave.writeUInt32LE(8000, 24);
  wave.writeUInt32LE(16000, 28);
  wave.writeUInt16LE(2, 32);
  wave.writeUInt16LE(16, 34);
  wave.write('data', 36);
  wave.writeUInt32LE(1600, 40);
  const media = new Map([
    ['/sample.wav', { body: wave, contentType: 'audio/wav' }],
    [
      '/sample.mp4',
      {
        body: await readFile('../../courses/figma/assets/figma-add-interaction.mp4'),
        contentType: 'video/mp4',
      },
    ],
    [
      '/sample.pdf',
      {
        body: await readFile('../../courses/enterprise-ui/assets/enterprise-ui-slides.pdf'),
        contentType: 'application/pdf',
      },
    ],
  ]);
  await page.route('https://obsidian-fixture.test/*', async (route) => {
    const asset = media.get(new URL(route.request().url()).pathname);
    if (!asset) throw new Error('Unexpected fixture media request.');
    await route.fulfill(asset);
  });
  const normalized = normalizeObsidianMarkdown(
    '> [!note]- Equation\n> $\\frac{1}{2}$\n\n![[sample.wav]]\n\n![[sample.mp4]]\n\n![[sample.pdf#page=2]]',
    {
      sourcePath: 'writing/example.md',
      publicationIndex: {
        documents: [],
        attachments: [
          {
            sourcePath: 'writing/sample.wav',
            url: 'https://obsidian-fixture.test/sample.wav',
            mimeType: 'audio/wav',
          },
          {
            sourcePath: 'writing/sample.mp4',
            url: 'https://obsidian-fixture.test/sample.mp4',
            mimeType: 'video/mp4',
          },
          {
            sourcePath: 'writing/sample.pdf',
            url: 'https://obsidian-fixture.test/sample.pdf',
            mimeType: 'application/pdf',
          },
        ],
      },
    },
  );
  expect(normalized.diagnostics).toEqual([]);
  const plugins = [rehypeCallouts, rehypeObsidianIdentifiers, rehypeObsidianMath] as NonNullable<
    MdsvexOptions['rehypePlugins']
  >;
  const result = await compile(normalized.markdown, { rehypePlugins: plugins });
  const require = createRequire(import.meta.url);
  const stylesheet = await readFile(require.resolve('rehype-callouts/theme/obsidian'), 'utf8');
  await page.setContent(
    `<style>${stylesheet}${getObsidianMathStylesheet()}</style><div data-content-document>${result!.code}</div>`,
  );
  await expect(page.locator('[data-content-document]')).toHaveCount(1);
  const callout = page.locator('details');
  await expect(callout).not.toHaveAttribute('open', '');
  await callout.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(callout).toHaveAttribute('open', '');
  await expect(page.locator('mjx-container svg')).toBeVisible();
  expect(await page.locator('audio').evaluate((node: HTMLAudioElement) => node.controls)).toBe(
    true,
  );
  expect(await page.locator('video').evaluate((node: HTMLVideoElement) => node.controls)).toBe(
    true,
  );
  await expect
    .poll(() => page.locator('audio').evaluate((node: HTMLAudioElement) => node.readyState))
    .toBeGreaterThanOrEqual(1);
  await expect
    .poll(() => page.locator('video').evaluate((node: HTMLVideoElement) => node.videoWidth))
    .toBeGreaterThan(0);
  await expect(page.locator('object[type="application/pdf"]')).toHaveAttribute(
    'aria-label',
    'sample.pdf',
  );
  await expect(page.getByRole('link', { name: 'Open sample.pdf' }).last()).toBeVisible();
});

test('callout styling follows the system color scheme on published content', async ({ page }) => {
  await page.goto('/courses/figma/number-variable-tokens');
  const title = page.locator('details[data-callout="example"] .callout-title').first();
  await page.emulateMedia({ colorScheme: 'light' });
  const light = await title.evaluate((node) => getComputedStyle(node).color);
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect.poll(() => title.evaluate((node) => getComputedStyle(node).color)).not.toBe(light);
});
