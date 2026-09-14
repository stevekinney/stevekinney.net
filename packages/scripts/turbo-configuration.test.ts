import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, test } from 'bun:test';

const turboPath = path.resolve(import.meta.dirname, '../../turbo.json');

type TurboTask = { inputs?: string[]; outputs?: string[]; dependsOn?: string[] };

const readTurboTasks = async (): Promise<Record<string, TurboTask>> => {
  const configuration = JSON.parse(await readFile(turboPath, 'utf8')) as {
    tasks: Record<string, TurboTask>;
  };
  return configuration.tasks;
};

describe('turbo generated asset graph', () => {
  test('keeps website build cache outputs needed by preview and build reports', async () => {
    const tasks = await readTurboTasks();
    expect(tasks['@stevekinney/website#build']?.outputs).toEqual([
      'build/**',
      '.svelte-kit/output/**',
      '.vercel/output/**',
    ]);
  });

  test('tracks generated asset recipes and transitive utility inputs', async () => {
    const tasks = await readTurboTasks();
    expect(tasks['@stevekinney/scripts#content:build']?.inputs).toEqual(
      expect.arrayContaining([
        'build-artifacts.ts',
        '../utilities/tailwind-playground.ts',
        '../utilities/tailwind-playground-types.ts',
        '../utilities/tailwind-playground-metadata.ts',
        '../utilities/write-formatted-json.ts',
      ]),
    );
    expect(tasks['@stevekinney/scripts#playgrounds:build']?.inputs).toEqual(
      expect.arrayContaining([
        'build-artifacts.ts',
        'build-dependencies.ts',
        'tailwind-playground.css',
        '../utilities/tailwind-playground-policy.ts',
      ]),
    );
    expect(tasks['@stevekinney/scripts#content-enhancements:build']?.inputs).toEqual(
      expect.arrayContaining([
        'content-enhancements-build.ts',
        'content-enhancement-build-hash.ts',
        'build-artifacts.ts',
        '../content-enhancements/src/**',
        '../utilities/**/*.ts',
        '!../utilities/**/*.test.ts',
      ]),
    );
    expect(tasks['@stevekinney/scripts#content:validate']?.inputs).toEqual(
      expect.arrayContaining([
        'build-artifacts.ts',
        '../utilities/write-formatted-json.ts',
        '../utilities/tailwind-playground-types.ts',
        '../utilities/tailwind-playground-metadata.ts',
      ]),
    );
    expect(tasks['@stevekinney/scripts#test:unit']?.inputs).toEqual(
      expect.arrayContaining([
        'build-report/**/*.ts',
        '../../turbo.json',
        'playgrounds-build.ts',
        'content-enhancements-build.ts',
        'sync-generated-browser-assets.ts',
        '../utilities/write-formatted-json.ts',
        '../utilities/**/*.ts',
      ]),
    );
    expect(tasks['@stevekinney/website#test:unit']?.inputs).toEqual(
      expect.arrayContaining([
        'plugins/**/*.ts',
        'tests/**/*.ts',
        'svelte.config.ts',
        '../../vercel.json',
        '../../packages/utilities/**/*.ts',
        '../../packages/markdown/src/**/*.ts',
      ]),
    );
  });

  test('keeps website watch checks behind generated browser asset producers', async () => {
    const tasks = await readTurboTasks();
    expect(tasks['@stevekinney/website#check:watch']?.dependsOn).toEqual(
      expect.arrayContaining([
        '@stevekinney/website#sync',
        '@stevekinney/scripts#content:build',
        '@stevekinney/scripts#playgrounds:build',
        '@stevekinney/scripts#content-enhancements:build',
      ]),
    );
  });

  test('does not duplicate generated producer outputs as downstream cache inputs', async () => {
    const tasks = await readTurboTasks();
    expect(tasks['@stevekinney/scripts#playgrounds:build']?.dependsOn).toContain(
      '@stevekinney/scripts#content:build',
    );
    expect(tasks['@stevekinney/scripts#playgrounds:build']?.inputs ?? []).not.toContain(
      '../../applications/website/.generated/playground-inputs.json',
    );
    expect(tasks['@stevekinney/website#build']?.dependsOn).toEqual(
      expect.arrayContaining([
        '@stevekinney/scripts#content:build',
        '@stevekinney/scripts#playgrounds:build',
        '@stevekinney/scripts#content-enhancements:build',
      ]),
    );
    expect(tasks['@stevekinney/website#build']?.inputs ?? []).not.toEqual(
      expect.arrayContaining([
        '.generated/content-data.json',
        '.generated/site-tailwind-candidates.txt',
        '.generated/playgrounds/**',
        '.generated/content-enhancements/**',
      ]),
    );
    expect(tasks['@stevekinney/website#test:unit']?.dependsOn).toEqual(
      expect.arrayContaining([
        '@stevekinney/scripts#content:build',
        '@stevekinney/scripts#playgrounds:build',
        '@stevekinney/scripts#content-enhancements:build',
      ]),
    );
    expect(tasks['@stevekinney/website#test:unit']?.inputs ?? []).not.toEqual(
      expect.arrayContaining(['.generated/playgrounds/**', '.generated/content-enhancements/**']),
    );
    expect(tasks['@stevekinney/website#check:watch']?.inputs ?? []).not.toEqual(
      expect.arrayContaining(['.generated/playgrounds/**', '.generated/content-enhancements/**']),
    );
  });
});
