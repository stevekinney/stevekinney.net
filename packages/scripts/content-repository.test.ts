import { randomUUID } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { obsidianPreprocessor } from '@stevekinney/markdown/obsidian-preprocessor';
import { normalizeObsidianMarkdown } from '@stevekinney/markdown/obsidian-normalization';

import type { ContentRepository } from './content-repository.ts';
import { coursesRoot, writingRoot } from './content-paths.ts';
import { collectContentRepository } from './content-repository.ts';
import { repositoryRoot } from './content-paths.ts';
import { attachmentMimeType } from './content-repository/publication.ts';

const createTemporaryName = (prefix: string): string => `${prefix}-${randomUUID()}`;

const writeTextFile = async (filePath: string, contents: string): Promise<void> => {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, contents, 'utf8');
};

describe('collectContentRepository', () => {
  test('preserves manifest video MIME types for published attachments', () => {
    expect(
      attachmentMimeType('applications/website/static/audio.ogg', { videoMimeType: 'video/ogg' }),
    ).toBe('video/ogg');
    expect(
      attachmentMimeType('applications/website/static/audio.ogg', { videoMimeType: null }),
    ).toBe('audio/ogg');
  });

  let repositoryPromise: Promise<ContentRepository>;

  beforeAll(async () => {
    repositoryPromise = collectContentRepository();
    await repositoryPromise;
  });

  test('validates the current repository content graph', async () => {
    const repository = await repositoryPromise;
    const errors = repository.validationIssues.filter((i) => i.severity !== 'warning');
    expect(errors).toEqual([]);
    expect(repository.meta.routeCount).toBeGreaterThan(800);
    expect(repository.meta.sourceFileCount).toBeGreaterThan(800);
  });

  test('builds a route map for writing, course, lesson, and project content', async () => {
    const repository = await repositoryPromise;
    expect(repository.routes['/writing/setup-python']).toMatchObject({
      contentType: 'writing',
      slug: 'setup-python',
      sourcePath: 'writing/setup-python.md',
    });

    expect(repository.routes['/courses/testing']).toMatchObject({
      contentType: 'course',
      courseSlug: 'testing',
      sourcePath: 'courses/testing/README.md',
    });

    expect(repository.routes['/courses/testing/the-basics']).toMatchObject({
      contentType: 'lesson',
      courseSlug: 'testing',
      lessonSlug: 'the-basics',
      sourcePath: 'courses/testing/the-basics.md',
    });

    expect(repository.routes['/projects/weft']).toMatchObject({
      contentType: 'project',
      projectSlug: 'weft',
      sourcePath: 'projects/weft.md',
      npmPackages: ['@lostgradient/weft'],
    });

    expect(repository.routes['/projects/agent-bureau']).toMatchObject({
      npmPackages: ['armorer', 'conversationalist'],
    });
  });

  test('produces deterministic metadata for content routes', async () => {
    const repository = await repositoryPromise;
    const route = repository.routes['/writing/setup-python'];

    expect(route.sourceHash).toMatch(/^[a-f0-9]{64}$/);
    expect(route.llmsPath).toBe('/writing/setup-python/llms.txt');
    expect(route.openGraphPath).toBe('/writing/setup-python/open-graph.jpg');
  });

  test('includes npm package metadata for every package-backed project', async () => {
    const repository = await repositoryPromise;
    const npmPackagesByProject = Object.fromEntries(
      repository.projects
        .filter((project) => project.npmPackages)
        .map((project) => [project.slug, project.npmPackages]),
    );

    expect(npmPackagesByProject).toEqual({
      'agent-bureau': ['armorer', 'conversationalist'],
      cinder: ['@lostgradient/cinder', '@lostgradient/chat'],
      'eslint-plugin-temporal': ['eslint-plugin-temporal'],
      'github-webhook-schemas': ['github-webhook-schemas'],
      octavian: ['octavian'],
      'prose-writer': ['prose-writer'],
      'temporal-explorer': ['temporal-explorer'],
      'temporal-mcp': ['temporal-mcp'],
      'vector-frankl': ['vector-frankl'],
      weft: ['@lostgradient/weft'],
    });
  });

  test('includes canonical and legacy prerender entries for long-form content routes', async () => {
    const repository = await repositoryPromise;

    expect(repository.prerenderEntries.writing).toContainEqual({ slug: 'setup-python' });
    expect(repository.prerenderEntries.writing).toContainEqual({ slug: 'setup-python.md' });
    expect(repository.prerenderEntries.courses).toContainEqual({ course: 'testing' });
    expect(repository.prerenderEntries.courses).toContainEqual({ course: 'testing.md' });
    expect(repository.prerenderEntries.courses).toContainEqual({ course: 'the-basics.md' });
    expect(repository.prerenderEntries.lessons).toContainEqual({
      course: 'testing',
      lesson: 'the-basics',
    });
    expect(repository.prerenderEntries.lessons).toContainEqual({
      course: 'testing',
      lesson: 'the-basics.md',
    });
    expect(repository.prerenderEntries.projects).toContainEqual({ project: 'weft' });
  });

  test('extracts sanitized Tailwind playground source', async () => {
    const repository = await repositoryPromise;
    expect(repository.tailwindPlaygroundSource).toContain('bg-blue-600');
    expect(repository.tailwindPlaygroundSource).toContain('rounded-md');
    expect(repository.tailwindPlaygroundSource).not.toContain('<script');
  });

  test('reports missing course readmes, reserved slugs, broken links, and bad course contents', async () => {
    const courseWithoutReadme = path.join(
      coursesRoot,
      createTemporaryName('zz-content-missing-readme'),
    );
    const courseWithBadContents = path.join(
      coursesRoot,
      createTemporaryName('zz-content-bad-index'),
    );
    const reservedWritingPath = path.join(writingRoot, 'page.md');
    const brokenLinkWritingPath = path.join(
      writingRoot,
      `${createTemporaryName('zz-content-broken-link')}.md`,
    );

    await mkdir(courseWithoutReadme, { recursive: true });
    await mkdir(courseWithBadContents, { recursive: true });

    try {
      await writeTextFile(
        path.join(courseWithBadContents, 'README.md'),
        `---\ntitle: Temporary Test Course\ndescription: Temporary test course.\ndate: 2025-01-01\nmodified: 2025-01-01\n---\n\nTemporary course body.\n`,
      );
      await writeTextFile(
        path.join(courseWithBadContents, 'index.toml'),
        `[[section]]\ntitle = "Broken"\n\n[[section.item]]\ntitle = "Missing lesson"\nhref = "missing-lesson.md"\n`,
      );
      await writeTextFile(
        reservedWritingPath,
        `---\ntitle: Temporary Reserved Route\ndescription: Triggers a reserved route collision.\ndate: 2025-01-01\nmodified: 2025-01-01\n---\n\nTemporary content.\n`,
      );
      await writeTextFile(
        brokenLinkWritingPath,
        `---\ntitle: Temporary Broken Link\ndescription: Triggers broken link validation issues.\ndate: 2025-01-01\nmodified: 2025-01-01\n---\n\n## Temporary Heading\n\n[Missing asset](/zz-temporary-missing-asset-${randomUUID()}.png)\n[Missing section](#does-not-exist)\n`,
      );

      const repository = await collectContentRepository();
      const issues = repository.validationIssues.map((issue) => `${issue.file}: ${issue.message}`);

      expect(issues).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Missing course README.md.'),
          expect.stringContaining("index.toml references missing lesson 'missing-lesson.md'."),
          expect.stringContaining("Writing slug 'page' collides with a reserved route."),
          expect.stringContaining('Missing static asset for link'),
          expect.stringContaining("Unknown heading anchor '#does-not-exist'."),
        ]),
      );
    } finally {
      await rm(courseWithoutReadme, { recursive: true, force: true });
      await rm(courseWithBadContents, { recursive: true, force: true });
      await rm(reservedWritingPath, { force: true });
      await rm(brokenLinkWritingPath, { force: true });
    }
  });

  describe('Obsidian publication dependencies', () => {
    const suffix = createTemporaryName('zz-obsidian-integration');
    const hostPath = path.join(writingRoot, `${suffix}-host.md`);
    const targetPath = path.join(writingRoot, `${suffix}-target.md`);
    const unpublishedPath = path.join(repositoryRoot, `${suffix}-unpublished.md`);
    const frontmatter = (title: string, extra = '') =>
      `---\ntitle: ${title}\ndescription: Temporary fixture.\ndate: 2025-01-01\nmodified: 2025-01-01\n${extra}---\n\n`;

    let first: ContentRepository;
    let route: string;
    let firstHash: string;
    beforeAll(async () => {
      await writeTextFile(
        targetPath,
        `${frontmatter('Obsidian Target')}## Target heading\n\nTarget body.\n`,
      );
      await writeTextFile(
        hostPath,
        `${frontmatter('Obsidian Host', 'tags: [fixture, fixture, obsidian]\naliases: [Fixture Host, Fixture Host]\n')}%%private comment%%\n\n![[${path.basename(targetPath, '.md')}]]\n`,
      );
      await writeTextFile(unpublishedPath, `${frontmatter('Unpublished Note')}Private.\n`);

      first = await collectContentRepository();
    });

    afterAll(async () => {
      await rm(hostPath, { force: true });
      await rm(targetPath, { force: true });
      await rm(unpublishedPath, { force: true });
    });

    test('normalizes metadata and excludes unpublished notes', () => {
      const hostSourcePath = path.relative(repositoryRoot, hostPath).split(path.sep).join('/');
      const targetSourcePath = path.relative(repositoryRoot, targetPath).split(path.sep).join('/');
      const hostDocument = first.publicationIndex.documents.find(
        (item) => item.sourcePath === hostSourcePath,
      );
      const hostNormalized = first.normalizedDocuments[hostSourcePath];

      expect(hostDocument?.aliases).toEqual(['Fixture Host']);
      expect(first.writing.find((item) => item.sourcePath === hostSourcePath)?.tags).toEqual([
        'fixture',
        'obsidian',
      ]);
      expect(
        first.publicationIndex.documents.some(
          (item) =>
            item.sourcePath ===
            path.relative(repositoryRoot, unpublishedPath).split(path.sep).join('/'),
        ),
      ).toBe(false);
      expect(hostNormalized.markdown).not.toContain('private comment');
      expect(hostNormalized.dependencies).toContain(targetSourcePath);

      route = hostDocument!.route;
      firstHash = first.routes[route].sourceHash;
    });

    test('invalidates host hashes when embedded dependencies change', async () => {
      await writeTextFile(
        targetPath,
        `${frontmatter('Obsidian Target')}## Target heading\n\nChanged target body.\n`,
      );
      const second = await collectContentRepository();
      expect(second.routes[route].sourceHash).not.toBe(firstHash);
    });
  });

  test('preprocessor reads generated content and tracks artifact plus transitive dependencies', async () => {
    const suffix = createTemporaryName('zz-obsidian-preprocessor');
    const hostPath = path.join(writingRoot, `${suffix}-host.md`);
    const targetPath = path.join(writingRoot, `${suffix}-target.md`);
    const leafPath = path.join(writingRoot, `${suffix}-leaf.md`);
    const artifactPath = path.join(repositoryRoot, 'tmp', `${suffix}.json`);
    const frontmatter = (title: string) =>
      `---\ntitle: ${title}\ndescription: Temporary fixture.\ndate: 2025-01-01\nmodified: 2025-01-01\n---\n\n`;

    try {
      const leafSource = `${frontmatter('Leaf')}Leaf body.\n`;
      const targetSource = `${frontmatter('Target')}![[${path.basename(leafPath, '.md')}]]\n`;
      const hostSource = `${frontmatter('Host')}![[${path.basename(targetPath, '.md')}]]\n`;
      await writeTextFile(hostPath, hostSource);
      await writeTextFile(targetPath, targetSource);
      await writeTextFile(leafPath, leafSource);

      const sourcePath = (filename: string): string =>
        path.relative(repositoryRoot, filename).split(path.sep).join('/');
      const hostSourcePath = sourcePath(hostPath);
      const targetSourcePath = sourcePath(targetPath);
      const leafSourcePath = sourcePath(leafPath);
      const publicationIndex = {
        documents: [
          { sourcePath: hostSourcePath, route: `/writing/${suffix}-host`, source: hostSource },
          {
            sourcePath: targetSourcePath,
            route: `/writing/${suffix}-target`,
            source: targetSource,
          },
          { sourcePath: leafSourcePath, route: `/writing/${suffix}-leaf`, source: leafSource },
        ],
        attachments: [],
      };
      const targetNormalized = normalizeObsidianMarkdown(targetSource, {
        sourcePath: targetSourcePath,
        publicationIndex,
      });
      const hostNormalized = normalizeObsidianMarkdown(hostSource, {
        sourcePath: hostSourcePath,
        publicationIndex,
      });
      await writeTextFile(
        artifactPath,
        JSON.stringify({
          publicationIndex,
          documents: {
            [hostSourcePath]: hostNormalized,
            [targetSourcePath]: targetNormalized,
            [leafSourcePath]: normalizeObsidianMarkdown(leafSource, {
              sourcePath: leafSourcePath,
              publicationIndex,
            }),
          },
        }),
      );
      const preprocessor = obsidianPreprocessor({ artifactPath, repositoryRoot });
      const result = await preprocessor.markup!({ content: hostSource, filename: hostPath });
      expect(result?.dependencies).toEqual(
        expect.arrayContaining([
          artifactPath,
          path.resolve(repositoryRoot, targetSourcePath),
          path.resolve(repositoryRoot, leafSourcePath),
        ]),
      );
      expect(result?.code).toContain('Leaf body.');

      const changedHost = `${frontmatter('Host')}Changed host.\n`;
      const changed = await preprocessor.markup!({ content: changedHost, filename: hostPath });
      expect(changed?.code).toContain('Changed host.');
      expect(changed?.code).not.toContain('Leaf body.');
    } finally {
      await rm(hostPath, { force: true });
      await rm(targetPath, { force: true });
      await rm(leafPath, { force: true });
      await rm(artifactPath, { force: true });
    }
  });
});
