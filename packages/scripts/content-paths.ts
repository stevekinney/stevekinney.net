import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { normalizePath } from '@stevekinney/utilities/frontmatter';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const repositoryRoot = path.resolve(__dirname, '..', '..');
export const writingRoot = path.resolve(repositoryRoot, 'writing');
export const coursesRoot = path.resolve(repositoryRoot, 'courses');
export const websiteRoot = path.resolve(repositoryRoot, 'applications', 'website');
export const websiteStaticRoot = path.resolve(websiteRoot, 'static');
export const websiteBuildRoot = path.resolve(websiteRoot, 'build');
export const websiteSvelteKitClientRoot = path.resolve(
  websiteRoot,
  '.svelte-kit',
  'output',
  'client',
);
export const websiteVercelStaticRoot = path.resolve(websiteRoot, '.vercel', 'output', 'static');
export const generatedContentDirectory = path.resolve(websiteRoot, '.generated');
export const generatedContentDataPath = path.resolve(
  generatedContentDirectory,
  'content-data.json',
);
export const tailwindPlaygroundSourcePath = path.resolve(
  generatedContentDirectory,
  'tailwind-playground-source.html',
);
export const contentEnhancementsEntryPath = path.resolve(
  websiteRoot,
  'src',
  'lib',
  'content-enhancements.ts',
);
export const generatedContentEnhancementsDirectory = path.resolve(
  generatedContentDirectory,
  'content-enhancements',
);
export const imageManifestPath = path.resolve(repositoryRoot, 'image-manifest.json');

export const normalizeRepositoryPath = (absolutePath: string): string =>
  normalizePath(path.relative(repositoryRoot, absolutePath));

export const resolveRepositoryPath = (repositoryPath: string): string =>
  path.resolve(repositoryRoot, repositoryPath);
