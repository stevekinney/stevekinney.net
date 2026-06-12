import { spawn, spawnSync, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';

import { JSDOM } from 'jsdom';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { url as canonicalSiteUrl } from '../applications/website/src/lib/metadata';

type Scenario = {
  name: string;
  path: string;
  fixturePath: string;
};

type OpenGraphMetadata = {
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  twitterCard: string;
  canonicalUrl: string;
  ogUrl: string;
  twitterUrl: string;
};

const repositoryRoot = new URL('../', import.meta.url);
const websiteDirectory = new URL('applications/website/', repositoryRoot);
const previewPort = 4400 + (process.pid % 1000);
const previewOrigin = `http://[::1]:${previewPort}`;
const canonicalSiteOrigin = new URL(canonicalSiteUrl).origin;

const scenarios: Scenario[] = [
  {
    name: 'agent loops writing reference',
    path: '/writing/agent-loops',
    fixturePath: 'tests/fixtures/og-working.html',
  },
  {
    name: 'AI gateway durable workflows writing page',
    path: '/writing/ai-gateway-durable-workflows',
    fixturePath: 'tests/fixtures/og-ai-gateway.html',
  },
  {
    name: 'self-testing AI agents course page',
    path: '/courses/self-testing-ai-agents',
    fixturePath: 'tests/fixtures/og-self-testing.html',
  },
  {
    name: 'self-testing AI agents lesson page',
    path: '/courses/self-testing-ai-agents/configuring-playwright',
    fixturePath: 'tests/fixtures/og-lesson-configuring-playwright.html',
  },
];

const buildEnvironment: NodeJS.ProcessEnv = { ...process.env };
delete buildEnvironment.PUBLIC_SITE_URL;
delete buildEnvironment.VERCEL;
delete buildEnvironment.VERCEL_PROJECT_PRODUCTION_URL;

let previewProcess: ChildProcessWithoutNullStreams | undefined;
let previewOutput = '';

const readMetaContent = (document: Document, selector: string): string => {
  const element = document.querySelector<HTMLMetaElement>(selector);

  if (!element) {
    throw new Error(`Missing metadata element: ${selector}`);
  }

  const content = element.getAttribute('content');

  if (!content) {
    throw new Error(`Metadata element has no content: ${selector}`);
  }

  return content;
};

const readLinkHref = (document: Document, selector: string): string => {
  const element = document.querySelector<HTMLLinkElement>(selector);

  if (!element) {
    throw new Error(`Missing link element: ${selector}`);
  }

  const href = element.getAttribute('href');

  if (!href) {
    throw new Error(`Link element has no href: ${selector}`);
  }

  return href;
};

const extractMetadata = (html: string): OpenGraphMetadata => {
  const document = new JSDOM(html).window.document;

  return {
    ogTitle: readMetaContent(document, 'meta[property="og:title"]'),
    ogDescription: readMetaContent(document, 'meta[property="og:description"]'),
    ogImage: readMetaContent(document, 'meta[property="og:image"]'),
    twitterCard: readMetaContent(document, 'meta[name="twitter:card"]'),
    canonicalUrl: readLinkHref(document, 'link[rel="canonical"]'),
    ogUrl: readMetaContent(document, 'meta[property="og:url"]'),
    twitterUrl: readMetaContent(document, 'meta[name="twitter:url"]'),
  };
};

const expectRequiredMetadata = (metadata: OpenGraphMetadata): URL => {
  expect(metadata.ogTitle).not.toHaveLength(0);
  expect(metadata.ogDescription).not.toHaveLength(0);
  expect(metadata.twitterCard).not.toHaveLength(0);
  expect(metadata.ogImage).toMatch(/^https:\/\//);

  const imageUrl = new URL(metadata.ogImage);
  expect(imageUrl.origin).toBe(canonicalSiteOrigin);

  expect(new URL(metadata.canonicalUrl).origin).toBe(canonicalSiteOrigin);
  expect(new URL(metadata.ogUrl).origin).toBe(canonicalSiteOrigin);
  expect(new URL(metadata.twitterUrl).origin).toBe(canonicalSiteOrigin);

  return imageUrl;
};

const runBuild = (): void => {
  const result = spawnSync('bun', ['run', 'build'], {
    cwd: repositoryRoot,
    encoding: 'utf8',
    env: buildEnvironment,
    timeout: 600_000,
  });

  if (result.status !== 0) {
    throw new Error(
      [
        'Production build failed before Open Graph metadata assertions could run.',
        result.stdout,
        result.stderr,
      ].join('\n'),
    );
  }
};

const startPreview = async (): Promise<void> => {
  previewProcess = spawn(
    'bun',
    ['run', 'preview', '--', '--host', '::1', '--port', String(previewPort), '--strictPort'],
    {
      cwd: websiteDirectory,
      env: buildEnvironment,
    },
  );

  previewProcess.stdout.on('data', (chunk: Buffer) => {
    previewOutput += chunk.toString();
  });
  previewProcess.stderr.on('data', (chunk: Buffer) => {
    previewOutput += chunk.toString();
  });

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      const response = await fetch(`${previewOrigin}/`);
      if (response.ok) return;
    } catch {
      // Preview may still be binding its port.
    }

    await delay(2_000);
  }

  throw new Error(`Preview server did not start.\n${previewOutput}`);
};

const fetchPreviewHtml = async (path: string): Promise<string> => {
  const response = await fetch(`${previewOrigin}${path}`);
  expect(response.status).toBe(200);
  return response.text();
};

const expectPreviewImageResponse = async (imageUrl: URL): Promise<void> => {
  const response = await fetch(`${previewOrigin}${imageUrl.pathname}${imageUrl.search}`);
  expect(response.status).toBe(200);
  expect(response.headers.get('content-type')).toMatch(/^image\//);
};

beforeAll(async () => {
  runBuild();
  await startPreview();
}, 660_000);

afterAll(() => {
  previewProcess?.kill('SIGTERM');
});

describe('Open Graph metadata', () => {
  for (const scenario of scenarios) {
    test(`${scenario.name} has fetchable image metadata in fixtures and production build output`, async () => {
      const fixtureHtml = await readFile(new URL(scenario.fixturePath, repositoryRoot), 'utf8');
      const fixtureMetadata = extractMetadata(fixtureHtml);

      expectRequiredMetadata(fixtureMetadata);

      const previewHtml = await fetchPreviewHtml(scenario.path);
      const previewMetadata = extractMetadata(previewHtml);
      const previewImageUrl = expectRequiredMetadata(previewMetadata);

      // To regenerate a fixture: serve a production build locally, fetch the page HTML,
      // and replace the fixture file. Run `bun run test:og-metadata` to confirm it passes.
      expect(previewMetadata).toEqual(fixtureMetadata);

      await expectPreviewImageResponse(previewImageUrl);
    }, 120_000);
  }
});
