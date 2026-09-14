#!/usr/bin/env bun
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium, type CDPSession, type Page } from '@playwright/test';

import { PLAYGROUND_URL_PREFIX } from '@stevekinney/utilities/tailwind-playground-policy';
import type {
  PlaygroundManifest,
  PlaygroundManifestEntry,
} from '@stevekinney/utilities/tailwind-playground-types';

type BrowserName = 'chromium' | 'firefox' | 'webkit';
type ParentTheme = 'light' | 'dark';
type ViewportName = 'mobile' | 'desktop';
type AuditIssue = {
  sourcePath: string;
  route: string;
  entry?: string;
  browser: BrowserName;
  viewport: ViewportName;
  parentTheme: ParentTheme;
  message: string;
};
type FrameMetrics = {
  sourcePath: string;
  route: string;
  src: string;
  title: string;
  screenshotPath: string;
  height: number;
  scrollHeight: number;
  clientHeight: number;
  overflowPixels: number;
};

const websiteDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repositoryRoot = path.resolve(websiteDirectory, '../..');
const manifestPath = path.join(websiteDirectory, '.generated', 'playgrounds', 'manifest.json');
const outputDirectory = path.join(repositoryRoot, 'tmp', 'tailwind-playground-audit');
const expectedSourcePageCount = 61;
const viewports: Record<ViewportName, { width: number; height: number }> = {
  mobile: { width: 390, height: 844 },
  desktop: { width: 1280, height: 900 },
};
const browserName: BrowserName = 'chromium';

const emulateDarkPreference = async (page: Page): Promise<CDPSession> => {
  const session = await page.context().newCDPSession(page);
  await session.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-color-scheme', value: 'dark' }],
  });
  return session;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isManifestEntry = (value: unknown): value is PlaygroundManifestEntry => {
  if (!isRecord(value)) return false;
  return (
    typeof value.sourcePath === 'string' &&
    Number.isInteger(value.ordinal) &&
    typeof value.sourceFingerprint === 'string' &&
    Number.isInteger(value.height) &&
    typeof value.title === 'string' &&
    typeof value.src === 'string' &&
    typeof value.cssSrc === 'string'
  );
};

const loadManifest = async (): Promise<PlaygroundManifest> => {
  const parsed: unknown = JSON.parse(await readFile(manifestPath, 'utf8'));
  if (!isRecord(parsed) || parsed.version !== 1 || !Array.isArray(parsed.examples)) {
    throw new Error(`Tailwind playground manifest has an unsupported shape: ${manifestPath}`);
  }
  if (!parsed.examples.every(isManifestEntry)) {
    throw new Error(`Tailwind playground manifest contains an unsupported entry: ${manifestPath}`);
  }
  return parsed as PlaygroundManifest;
};

const parseBaseUrl = (): string => {
  const baseUrlIndex = process.argv.indexOf('--base-url');
  const inlineBaseUrl = process.argv.find((argument) => argument.startsWith('--base-url='));
  const value =
    inlineBaseUrl?.slice('--base-url='.length) ??
    (baseUrlIndex >= 0 ? process.argv[baseUrlIndex + 1] : undefined) ??
    process.env.PLAYWRIGHT_BASE_URL ??
    'http://127.0.0.1:4445';
  return new URL(value).toString().replace(/\/$/, '');
};

const sourceRoute = (sourcePath: string): string => `/${sourcePath.replace(/\.md$/, '')}`;

const slug = (value: string): string => value.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');

const frameSelector = (src: string): string => `iframe[src="${src}"]`;

const diagnoseParentOverflow = async (
  page: Page,
  issues: AuditIssue[],
  context: Omit<AuditIssue, 'message' | 'entry'>,
): Promise<void> => {
  const overflow = await page.evaluate(() => {
    const documentElement = document.documentElement;
    const overflowPixels = documentElement.scrollWidth - documentElement.clientWidth;
    const wideElements = [...document.body.querySelectorAll('*')]
      .map((element) => {
        const rectangle = element.getBoundingClientRect();
        return {
          tagName: element.tagName.toLowerCase(),
          className:
            typeof element.className === 'string'
              ? element.className
              : String(element.getAttribute('class') ?? ''),
          text: element.textContent?.trim().replace(/\s+/g, ' ').slice(0, 100) ?? '',
          left: rectangle.left,
          right: rectangle.right,
          width: rectangle.width,
        };
      })
      .filter((element) => element.right > documentElement.clientWidth + 1 || element.left < -1)
      .sort((left, right) => right.width - left.width)
      .slice(0, 8);
    return {
      clientWidth: documentElement.clientWidth,
      scrollWidth: documentElement.scrollWidth,
      overflowPixels,
      wideElements,
    };
  });

  if (overflow.overflowPixels > 1) {
    issues.push({
      ...context,
      message: `Parent page overflows horizontally by ${overflow.overflowPixels}px: ${JSON.stringify(overflow.wideElements)}`,
    });
  }
};

const waitForFrameImages = async (
  page: Page,
  entry: PlaygroundManifestEntry,
  issues: AuditIssue[],
  context: Omit<AuditIssue, 'message' | 'entry'>,
): Promise<void> => {
  const frame = page.frameLocator(frameSelector(entry.src));
  const imageResults = await frame.locator('img').evaluateAll(async (images) => {
    const htmlImages = images.filter(
      (image): image is HTMLImageElement => image instanceof HTMLImageElement,
    );
    const settle = (image: HTMLImageElement): Promise<void> => {
      if (image.complete) return Promise.resolve();
      return new Promise((resolve) => {
        image.addEventListener('load', () => resolve(), { once: true });
        image.addEventListener('error', () => resolve(), { once: true });
        window.setTimeout(() => resolve(), 5000);
      });
    };
    await Promise.all(htmlImages.map((image) => settle(image)));
    return htmlImages.map((image) => ({
      src: image.currentSrc || image.src,
      complete: image.complete,
      naturalWidth: image.naturalWidth,
      naturalHeight: image.naturalHeight,
    }));
  });

  for (const image of imageResults) {
    if (!image.complete || image.naturalWidth === 0 || image.naturalHeight === 0) {
      issues.push({
        ...context,
        entry: entry.src,
        message: `Image failed or did not finish loading: ${image.src}`,
      });
    }
  }
};

const auditFrame = async (
  page: Page,
  entry: PlaygroundManifestEntry,
  issues: AuditIssue[],
  context: Omit<AuditIssue, 'message' | 'entry'>,
): Promise<FrameMetrics> => {
  const iframe = page.locator(frameSelector(entry.src));
  const count = await iframe.count();
  if (count !== 1) {
    issues.push({ ...context, entry: entry.src, message: `Expected one iframe, found ${count}.` });
  }
  await iframe.scrollIntoViewIfNeeded();

  const box = await iframe.boundingBox();
  if (!box || box.width === 0 || box.height === 0) {
    issues.push({ ...context, entry: entry.src, message: 'Iframe is not visible.' });
  }

  const title = await iframe.getAttribute('title');
  if (title !== entry.title) {
    issues.push({
      ...context,
      entry: entry.src,
      message: `Iframe title mismatch: expected "${entry.title}", received "${title ?? ''}".`,
    });
  }

  const renderedHeight = Math.round(box?.height ?? 0);
  if (renderedHeight !== entry.height) {
    issues.push({
      ...context,
      entry: entry.src,
      message: `Iframe height mismatch: expected ${entry.height}, received ${renderedHeight}.`,
    });
  }

  const frame = page.frameLocator(frameSelector(entry.src));
  const documentMetrics = await frame.locator('body').evaluate((body) => {
    window.scrollTo(0, 0);
    window.scrollTo(0, document.documentElement.scrollHeight);
    return {
      scrollHeight: document.documentElement.scrollHeight,
      clientHeight: document.documentElement.clientHeight,
      bodyScrollHeight: body.scrollHeight,
    };
  });
  await waitForFrameImages(page, entry, issues, context);
  await frame.locator('body').evaluate(() => window.scrollTo(0, 0));

  const overflowPixels =
    Math.max(documentMetrics.scrollHeight, documentMetrics.bodyScrollHeight, 0) - entry.height;
  const screenshotPath = path.join(
    outputDirectory,
    'frames',
    `${context.browser}-${context.viewport}-${context.parentTheme}-${slug(entry.sourcePath)}-${entry.ordinal}.png`,
  );
  await mkdir(path.dirname(screenshotPath), { recursive: true });
  await page.locator(frameSelector(entry.src)).locator('xpath=ancestor::figure[1]').screenshot({
    path: screenshotPath,
  });

  return {
    sourcePath: entry.sourcePath,
    route: sourceRoute(entry.sourcePath),
    src: entry.src,
    title: entry.title,
    screenshotPath: path.relative(outputDirectory, screenshotPath),
    height: entry.height,
    scrollHeight: Math.max(documentMetrics.scrollHeight, documentMetrics.bodyScrollHeight),
    clientHeight: documentMetrics.clientHeight,
    overflowPixels,
  };
};

const main = async (): Promise<void> => {
  const baseUrl = parseBaseUrl();
  const manifest = await loadManifest();
  const sourcePaths = [...new Set(manifest.examples.map((entry) => entry.sourcePath))].sort();
  const entriesBySource = new Map<string, PlaygroundManifestEntry[]>();
  const issues: AuditIssue[] = [];
  const metrics: FrameMetrics[] = [];

  for (const entry of manifest.examples) {
    if (!entry.src.startsWith(PLAYGROUND_URL_PREFIX)) {
      throw new Error(`Manifest src must be rooted under ${PLAYGROUND_URL_PREFIX}: ${entry.src}`);
    }
    if (!entry.cssSrc.startsWith(PLAYGROUND_URL_PREFIX)) {
      throw new Error(
        `Manifest cssSrc must be rooted under ${PLAYGROUND_URL_PREFIX}: ${entry.cssSrc}`,
      );
    }
    const entries = entriesBySource.get(entry.sourcePath) ?? [];
    entries.push(entry);
    entriesBySource.set(entry.sourcePath, entries);
  }

  if (sourcePaths.length !== expectedSourcePageCount) {
    throw new Error(
      `Expected ${expectedSourcePageCount} Tailwind playground source pages, found ${sourcePaths.length}.`,
    );
  }

  await rm(outputDirectory, { force: true, recursive: true });
  await mkdir(outputDirectory, { recursive: true });

  const browser = await chromium.launch({ args: ['--site-per-process'] });
  for (const [viewportName, viewport] of Object.entries(viewports) as [
    ViewportName,
    { width: number; height: number },
  ][]) {
    for (const parentTheme of ['light', 'dark'] as const) {
      const context = await browser.newContext({
        baseURL: baseUrl,
        viewport,
      });
      const page = await context.newPage();
      const darkPreferenceSession =
        parentTheme === 'dark' ? await emulateDarkPreference(page) : null;
      page.on('console', (message) => {
        if (message.type() === 'error') {
          issues.push({
            sourcePath: 'browser-console',
            route: page.url(),
            browser: browserName,
            viewport: viewportName,
            parentTheme,
            message: message.text(),
          });
        }
      });
      page.on('pageerror', (error) => {
        issues.push({
          sourcePath: 'page-error',
          route: page.url(),
          browser: browserName,
          viewport: viewportName,
          parentTheme,
          message: error.message,
        });
      });
      page.on('requestfailed', (request) => {
        if (request.resourceType() !== 'image') return;
        issues.push({
          sourcePath: 'image-request',
          route: page.url(),
          browser: browserName,
          viewport: viewportName,
          parentTheme,
          message: `Image request failed: ${request.url()} (${request.failure()?.errorText ?? 'unknown error'}).`,
        });
      });
      page.on('response', (response) => {
        if (response.request().resourceType() !== 'image' || response.status() < 400) return;
        issues.push({
          sourcePath: 'image-response',
          route: page.url(),
          browser: browserName,
          viewport: viewportName,
          parentTheme,
          message: `Image response returned ${response.status()}: ${response.url()}.`,
        });
      });

      for (const sourcePath of sourcePaths) {
        const route = sourceRoute(sourcePath);
        const response = await page.goto(route, { waitUntil: 'networkidle' });
        if (!response || response.status() !== 200) {
          issues.push({
            sourcePath,
            route,
            browser: browserName,
            viewport: viewportName,
            parentTheme,
            message: `Route returned ${response?.status() ?? 'no response'}.`,
          });
          continue;
        }

        const contextForIssue = {
          sourcePath,
          route,
          browser: browserName,
          viewport: viewportName,
          parentTheme,
        };
        await diagnoseParentOverflow(page, issues, contextForIssue);
        for (const entry of entriesBySource.get(sourcePath) ?? []) {
          const [documentResponse, stylesheetResponse] = await Promise.all([
            page.request.get(entry.src),
            page.request.get(entry.cssSrc),
          ]);
          if (documentResponse.status() !== 200) {
            issues.push({
              ...contextForIssue,
              entry: entry.src,
              message: `Iframe document returned ${documentResponse.status()}.`,
            });
          }
          if (stylesheetResponse.status() !== 200) {
            issues.push({
              ...contextForIssue,
              entry: entry.cssSrc,
              message: `Iframe stylesheet returned ${stylesheetResponse.status()}.`,
            });
          }
          metrics.push(await auditFrame(page, entry, issues, contextForIssue));
        }

        const screenshotPath = path.join(
          outputDirectory,
          `${browserName}-${viewportName}-${parentTheme}-${slug(sourcePath)}.png`,
        );
        await page.screenshot({ path: screenshotPath, fullPage: true });
      }

      await darkPreferenceSession?.detach();
      await context.close();
    }
  }
  await browser.close();

  const summary = {
    baseUrl,
    browser: browserName,
    sourcePageCount: sourcePaths.length,
    playgroundCount: manifest.examples.length,
    parentScreenshotCount: sourcePaths.length * Object.keys(viewports).length * 2,
    frameScreenshotCount: metrics.length,
    screenshotCount: sourcePaths.length * Object.keys(viewports).length * 2 + metrics.length,
    metrics,
    issues,
  };
  await writeFile(
    path.join(outputDirectory, 'summary.json'),
    `${JSON.stringify(summary, null, 2)}\n`,
  );
  console.log(
    `Audited ${summary.playgroundCount} playgrounds on ${summary.sourcePageCount} pages. Screenshots and summary written to ${outputDirectory}.`,
  );

  if (issues.length > 0) {
    console.error(`Tailwind playground audit found ${issues.length} issue(s).`);
    process.exitCode = 1;
  }
};

await main();
