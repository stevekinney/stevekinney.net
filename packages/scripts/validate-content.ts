import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fg from 'fast-glob';
import matter from 'gray-matter';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { visit } from 'unist-util-visit';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const WRITING_ROOT = path.resolve(REPO_ROOT, 'content/writing');
const COURSES_ROOT = path.resolve(REPO_ROOT, 'courses');
const STATIC_ROOT = path.resolve(REPO_ROOT, 'applications/website/static');

const WRITING_REQUIRED = ['title', 'description', 'date', 'modified'] as const;
const COURSE_REQUIRED = ['title', 'description', 'date', 'modified'] as const;

const externalPrefixes = ['http://', 'https://', 'mailto:', 'tel:', 'data:', 'ftp:'];

const normalizePath = (value: string): string => value.split(path.sep).join('/');
const toRepoPath = (absolutePath: string): string =>
  normalizePath(path.relative(REPO_ROOT, absolutePath));

const isExternal = (url: string): boolean => {
  if (!url) return true;
  if (url.startsWith('#')) return true;
  if (url.startsWith('//')) return true;
  return externalPrefixes.some((prefix) => url.startsWith(prefix));
};

const stripQueryHash = (url: string): string => url.split(/[?#]/)[0] ?? '';

const isValidDate = (value: unknown): boolean => {
  if (value instanceof Date) return true;
  if (typeof value !== 'string') return false;
  return !Number.isNaN(Date.parse(value));
};

const ensureString = (value: unknown): boolean =>
  typeof value === 'string' && value.trim().length > 0;

const errors: string[] = [];

const addError = (file: string, message: string) => {
  errors.push(`${file}: ${message}`);
};

const shouldSkipCourseFile = (filePath: string, data: Record<string, unknown>): boolean => {
  if (path.basename(filePath) === '_index.md') return true;
  if (data.layout === 'contents') return true;
  return false;
};

const checkFrontmatter = (
  file: string,
  data: Record<string, unknown>,
  required: readonly string[],
  allowPublished: boolean,
) => {
  for (const key of required) {
    const value = data[key];
    if (key === 'date' || key === 'modified') {
      if (!isValidDate(value)) {
        addError(file, `Missing or invalid '${key}' frontmatter.`);
      }
      continue;
    }

    if (!ensureString(value)) {
      addError(file, `Missing required '${key}' frontmatter.`);
    }
  }

  if (allowPublished && typeof data.published !== 'boolean') {
    addError(file, "Missing or invalid 'published' frontmatter (expected boolean).");
  }
};

const resolveRelative = (file: string, urlPath: string): string =>
  path.resolve(path.dirname(file), urlPath);

const checkRootLink = (
  file: string,
  urlPath: string,
  writingSlugs: Set<string>,
  courseMap: Map<string, Set<string>>,
) => {
  const normalized = urlPath !== '/' ? urlPath.replace(/\/$/, '') : urlPath;

  if (normalized === '/' || normalized === '/writing' || normalized === '/courses') return;
  if (normalized.startsWith('/_app/') || normalized.startsWith('/open-graph')) return;

  if (normalized.startsWith('/writing/')) {
    const slug = normalized.split('/')[2];
    if (!slug || !writingSlugs.has(slug)) {
      addError(file, `Missing writing slug for link '${urlPath}'.`);
    }
    return;
  }

  if (normalized.startsWith('/courses/')) {
    const parts = normalized.split('/').filter(Boolean);
    const course = parts[1];
    const lesson = parts[2];

    if (!course) {
      addError(file, `Missing course slug for link '${urlPath}'.`);
      return;
    }

    const lessons = courseMap.get(course);
    if (!lessons) {
      addError(file, `Unknown course '${course}' for link '${urlPath}'.`);
      return;
    }

    if (lesson) {
      if (!lessons.has(lesson)) {
        addError(file, `Unknown lesson '${lesson}' for link '${urlPath}'.`);
      }
    } else {
      const readmePath = path.join(COURSES_ROOT, course, 'README.md');
      if (!existsSync(readmePath)) {
        addError(file, `Missing README for course '${course}'.`);
      }
    }

    return;
  }

  const staticPath = path.join(STATIC_ROOT, urlPath.slice(1));
  if (!existsSync(staticPath)) {
    addError(file, `Missing static asset for link '${urlPath}'.`);
  }
};

const checkLinkTarget = (
  file: string,
  url: string,
  writingSlugs: Set<string>,
  courseMap: Map<string, Set<string>>,
) => {
  const normalized = stripQueryHash(url);
  if (!normalized) return;

  if (normalized.startsWith('/')) {
    checkRootLink(file, normalized, writingSlugs, courseMap);
    return;
  }

  const resolved = resolveRelative(file, normalized);
  const isInWriting = resolved.startsWith(WRITING_ROOT);
  const isInCourses = resolved.startsWith(COURSES_ROOT);

  if (!isInWriting && !isInCourses) {
    addError(toRepoPath(file), `Relative link escapes content roots: '${url}'.`);
    return;
  }

  if (!existsSync(resolved)) {
    addError(toRepoPath(file), `Missing asset or file for link '${url}'.`);
  }
};

const writingFiles = await fg('content/writing/*.md', { cwd: REPO_ROOT, absolute: true });
const courseFiles = await fg('courses/**/*.md', { cwd: REPO_ROOT, absolute: true });
const courseDirs = await fg('courses/*', { cwd: REPO_ROOT, absolute: true, onlyDirectories: true });

const writingSlugs = new Set<string>();
const writingDuplicates = new Set<string>();

for (const file of writingFiles) {
  const slug = path.basename(file, '.md');
  if (writingSlugs.has(slug)) {
    writingDuplicates.add(slug);
  }
  writingSlugs.add(slug);
}

for (const slug of writingDuplicates) {
  addError('content/writing', `Duplicate writing slug '${slug}'.`);
}

const courseMap = new Map<string, Set<string>>();

for (const dir of courseDirs) {
  const slug = path.basename(dir);
  courseMap.set(slug, new Set());
}

for (const file of courseFiles) {
  const relative = path.relative(COURSES_ROOT, file);
  const parts = relative.split(path.sep);
  const courseDir = parts[0];
  const filename = parts.at(-1);
  if (!courseDir || !filename) {
    addError(toRepoPath(file), 'Course file must live under a course directory.');
    continue;
  }
  if (filename === 'README.md' || filename === '_index.md') continue;

  const slug = path.basename(filename, '.md');
  const lessons = courseMap.get(courseDir) ?? new Set<string>();

  if (lessons.has(slug)) {
    addError(toRepoPath(file), `Duplicate lesson slug '${slug}' in course '${courseDir}'.`);
  }

  lessons.add(slug);
  courseMap.set(courseDir, lessons);
}

for (const file of writingFiles) {
  const contents = await readFile(file, 'utf8');
  const { data } = matter(contents);
  checkFrontmatter(toRepoPath(file), data, WRITING_REQUIRED, true);
}

for (const file of courseFiles) {
  const contents = await readFile(file, 'utf8');
  const { data, content } = matter(contents);

  if (shouldSkipCourseFile(file, data)) {
    continue;
  }

  checkFrontmatter(toRepoPath(file), data, COURSE_REQUIRED, false);

  const tree = unified().use(remarkParse).parse(content);
  visit(tree, ['link', 'image', 'definition'], (node) => {
    if (!('url' in node)) return;
    const url = String(node.url ?? '').trim();
    if (!url || isExternal(url)) return;
    checkLinkTarget(file, url, writingSlugs, courseMap);
  });
}

for (const file of writingFiles) {
  const contents = await readFile(file, 'utf8');
  const { content } = matter(contents);
  const tree = unified().use(remarkParse).parse(content);
  visit(tree, ['link', 'image', 'definition'], (node) => {
    if (!('url' in node)) return;
    const url = String(node.url ?? '').trim();
    if (!url || isExternal(url)) return;
    checkLinkTarget(file, url, writingSlugs, courseMap);
  });
}

if (errors.length > 0) {
  console.error('Content validation failed:');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log('Content validation passed.');
