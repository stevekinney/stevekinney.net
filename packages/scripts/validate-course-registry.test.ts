/**
 * Tests for validate-course-registry. Each test sets up a temporary
 * fixtures directory representing a `courses/` tree plus a stand-in
 * website package.json, runs the validator against it, and asserts the
 * issue list. Run with `bun test packages/scripts/validate-course-registry.test.ts`.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { validateCourseRegistry } from './validate-course-registry.ts';

type CourseFixture = {
  slug: string;
  readme?: string | null;
  packageJson?: Record<string, unknown> | null;
  lessons?: string[];
  indexToml?: boolean;
};

const validReadme = (slug: string): string =>
  `---
title: ${slug}
description: A test course.
date: 2026-01-01
modified: 2026-01-02
---

Body.
`;

const validPackageJson = (slug: string): Record<string, unknown> => ({
  name: `@stevekinney/${slug}`,
  private: true,
  type: 'module',
  scripts: {
    manifest: 'bun run ../../packages/scripts/generate-course-manifest.ts',
    build: 'bun run manifest',
  },
});

let workspace: string;
let coursesRoot: string;
let websitePackagePath: string;

const writeFixture = async (fixtures: CourseFixture[], websiteDeps: string[]): Promise<void> => {
  await mkdir(coursesRoot, { recursive: true });
  await writeFile(
    websitePackagePath,
    JSON.stringify(
      {
        name: '@stevekinney/website',
        dependencies: Object.fromEntries(websiteDeps.map((name) => [name, 'workspace:*'])),
      },
      null,
      2,
    ),
  );

  for (const fixture of fixtures) {
    const dir = path.join(coursesRoot, fixture.slug);
    await mkdir(dir, { recursive: true });
    if (fixture.readme !== null) {
      await writeFile(path.join(dir, 'README.md'), fixture.readme ?? validReadme(fixture.slug));
    }
    if (fixture.packageJson !== null) {
      await writeFile(
        path.join(dir, 'package.json'),
        JSON.stringify(fixture.packageJson ?? validPackageJson(fixture.slug), null, 2),
      );
    }
    for (const lesson of fixture.lessons ?? []) {
      await writeFile(
        path.join(dir, `${lesson}.md`),
        `---
title: ${lesson}
description: A lesson.
date: 2026-01-01
modified: 2026-01-02
---

Lesson body.
`,
      );
    }
    if (fixture.indexToml) {
      await writeFile(path.join(dir, 'index.toml'), '');
    }
  }
};

beforeEach(async () => {
  workspace = await mkdtemp(path.join(tmpdir(), 'course-registry-test-'));
  coursesRoot = path.join(workspace, 'courses');
  websitePackagePath = path.join(workspace, 'applications/website/package.json');
  await mkdir(path.dirname(websitePackagePath), { recursive: true });
});

afterEach(async () => {
  await rm(workspace, { recursive: true, force: true });
});

describe('validateCourseRegistry', () => {
  test('passes when every course is fully registered', async () => {
    await writeFixture(
      [{ slug: 'good-one' }, { slug: 'good-two', lessons: ['lesson-a'], indexToml: true }],
      ['@stevekinney/good-one', '@stevekinney/good-two'],
    );

    const issues = await validateCourseRegistry({ coursesRoot, websitePackagePath });
    expect(issues).toEqual([]);
  });

  test('flags missing README', async () => {
    await writeFixture([{ slug: 'no-readme', readme: null }], ['@stevekinney/no-readme']);

    const issues = await validateCourseRegistry({ coursesRoot, websitePackagePath });
    expect(
      issues.some((issue) => issue.message.includes('Missing courses/no-readme/README.md')),
    ).toBe(true);
  });

  test('flags missing required frontmatter fields', async () => {
    const incompleteReadme = `---
title: Has Title
---

Body.
`;
    await writeFixture(
      [{ slug: 'bad-frontmatter', readme: incompleteReadme }],
      ['@stevekinney/bad-frontmatter'],
    );

    const issues = await validateCourseRegistry({ coursesRoot, websitePackagePath });
    const messages = issues.map((issue) => issue.message);
    expect(messages.some((m) => m.includes("'description'"))).toBe(true);
    expect(messages.some((m) => m.includes("'date'"))).toBe(true);
    expect(messages.some((m) => m.includes("'modified'"))).toBe(true);
  });

  test('flags invalid date frontmatter', async () => {
    const badDateReadme = `---
title: Bad Date
description: A course.
date: not-a-date
modified: also-not-a-date
---

Body.
`;
    await writeFixture([{ slug: 'bad-date', readme: badDateReadme }], ['@stevekinney/bad-date']);

    const issues = await validateCourseRegistry({ coursesRoot, websitePackagePath });
    const messages = issues.map((issue) => issue.message);
    expect(messages.some((m) => m.includes("invalid 'date'"))).toBe(true);
    expect(messages.some((m) => m.includes("invalid 'modified'"))).toBe(true);
  });

  test('flags missing package.json', async () => {
    await writeFixture([{ slug: 'no-package', packageJson: null }], []);

    const issues = await validateCourseRegistry({ coursesRoot, websitePackagePath });
    expect(
      issues.some((issue) => issue.message.includes('Missing courses/no-package/package.json')),
    ).toBe(true);
  });

  test('flags package.json with wrong name', async () => {
    await writeFixture(
      [
        {
          slug: 'wrong-name',
          packageJson: {
            name: '@stevekinney/different-name',
            scripts: { manifest: 'noop' },
          },
        },
      ],
      ['@stevekinney/different-name'],
    );

    const issues = await validateCourseRegistry({ coursesRoot, websitePackagePath });
    expect(
      issues.some((issue) => issue.message.includes('expected "@stevekinney/wrong-name"')),
    ).toBe(true);
  });

  test('flags package.json missing manifest script', async () => {
    await writeFixture(
      [
        {
          slug: 'no-manifest-script',
          packageJson: { name: '@stevekinney/no-manifest-script' },
        },
      ],
      ['@stevekinney/no-manifest-script'],
    );

    const issues = await validateCourseRegistry({ coursesRoot, websitePackagePath });
    expect(issues.some((issue) => issue.message.includes('missing a "manifest" script'))).toBe(
      true,
    );
  });

  test('flags course not listed in website dependencies', async () => {
    await writeFixture([{ slug: 'orphan' }], []);

    const issues = await validateCourseRegistry({ coursesRoot, websitePackagePath });
    expect(
      issues.some((issue) =>
        issue.message.includes('not listed in applications/website/package.json'),
      ),
    ).toBe(true);
  });

  test('reports zero issues when courses directory is empty', async () => {
    await writeFixture([], []);

    const issues = await validateCourseRegistry({ coursesRoot, websitePackagePath });
    expect(issues).toEqual([]);
  });

  test('reproduces the self-testing-ai-agents bug class (everything missing)', async () => {
    // Mimic the original failure mode: course directory exists with lesson files
    // and index.toml, but README, package.json, and website dep are all missing.
    await writeFixture(
      [
        {
          slug: 'half-registered',
          readme: null,
          packageJson: null,
          lessons: ['intro', 'chapter-one'],
          indexToml: true,
        },
      ],
      [],
    );

    const issues = await validateCourseRegistry({ coursesRoot, websitePackagePath });
    const messages = issues.map((issue) => issue.message);
    expect(messages.some((m) => m.includes('Missing courses/half-registered/README.md'))).toBe(
      true,
    );
    expect(messages.some((m) => m.includes('Missing courses/half-registered/package.json'))).toBe(
      true,
    );
  });
});
