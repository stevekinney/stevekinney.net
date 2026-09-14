import { EventEmitter } from 'node:events';

import { beforeEach, describe, expect, it, vi } from 'vitest';

const childProcessMock = vi.hoisted(() => ({ spawn: vi.fn() }));

vi.mock('node:child_process', () => childProcessMock);

import { regenerateGeneratedContent } from '../../plugins/vite/regenerate-generated-content';

const waitForDebounce = async (): Promise<void> => {
  await new Promise<void>((resolve) => setTimeout(resolve, 10));
};

const makeServer = () => {
  const watcher = new EventEmitter();
  const clientInvalidate = vi.fn();
  const ssrInvalidate = vi.fn();
  const clientHotSend = vi.fn();
  const ssrHotSend = vi.fn();
  const clientMarkdown = { file: '/workspace/writing/embedded.md' };
  const clientGenerated = { file: '/workspace/.generated/content-data.json' };
  const clientRuntime = { file: '/workspace/src/runtime.ts' };
  const ssrMarkdown = { file: '/workspace/writing/embedded.md' };
  const ssrGenerated = { file: '/workspace/.generated/content-data.json' };
  const ssrRuntime = { file: '/workspace/src/runtime.ts' };
  return {
    server: {
      watcher,
      environments: {
        client: {
          name: 'client',
          moduleGraph: {
            fileToModulesMap: new Map([
              [clientMarkdown.file, new Set([clientMarkdown])],
              [clientGenerated.file, new Set([clientGenerated])],
              [clientRuntime.file, new Set([clientRuntime])],
            ]),
            invalidateModule: clientInvalidate,
          },
          hot: { send: clientHotSend },
        },
        ssr: {
          name: 'ssr',
          moduleGraph: {
            fileToModulesMap: new Map([
              [ssrMarkdown.file, new Set([ssrMarkdown])],
              [ssrGenerated.file, new Set([ssrGenerated])],
              [ssrRuntime.file, new Set([ssrRuntime])],
            ]),
            invalidateModule: ssrInvalidate,
          },
          hot: { send: ssrHotSend },
        },
      },
      ws: { send: vi.fn() },
      config: { logger: { error: vi.fn() } },
    },
    watcher,
    clientInvalidate,
    ssrInvalidate,
    clientHotSend,
    ssrHotSend,
  };
};

const createChild = (): EventEmitter => new EventEmitter();

describe('regenerateGeneratedContent', () => {
  beforeEach(() => {
    childProcessMock.spawn.mockReset();
  });

  it('regenerates once for content, parser, manifest, and attachment changes', async () => {
    const child = createChild();
    childProcessMock.spawn.mockReturnValue(child);
    const { server, watcher, clientInvalidate, ssrInvalidate, clientHotSend, ssrHotSend } =
      makeServer();
    const plugin = regenerateGeneratedContent({
      contentBuildScriptPath: '/workspace/packages/scripts/content-build.ts',
      workingDirectory: '/workspace',
      contentDirectories: ['/workspace/writing'],
      enhancementSourceDirectories: ['/workspace/packages/content-enhancements'],
      additionalDependencies: ['/workspace/image-manifest.json'],
      debounceMs: 0,
    });

    if (
      !plugin ||
      typeof plugin !== 'object' ||
      Array.isArray(plugin) ||
      !('configureServer' in plugin) ||
      typeof plugin.configureServer !== 'function'
    )
      throw new Error('Expected a Vite server plugin.');
    plugin.configureServer.call(undefined as never, server as never);

    watcher.emit('change', '/workspace/writing/embedded.md');
    watcher.emit('change', '/workspace/packages/content-enhancements/parser.ts');
    watcher.emit('change', '/workspace/image-manifest.json');
    watcher.emit('change', '/workspace/writing/attachment.pdf');
    watcher.emit('change', '/workspace/unrelated.txt');
    await waitForDebounce();

    expect(childProcessMock.spawn).toHaveBeenCalledTimes(1);
    child.emit('exit', 0);
    expect(clientInvalidate).toHaveBeenCalledTimes(2);
    expect(ssrInvalidate).toHaveBeenCalledTimes(2);
    expect(clientHotSend).not.toHaveBeenCalled();
    expect(ssrHotSend).toHaveBeenCalledWith({ type: 'full-reload' });
    expect(server.ws.send).toHaveBeenCalledWith({ type: 'full-reload' });
  });

  it('does not invalidate or reload after a failed rebuild', async () => {
    const child = createChild();
    childProcessMock.spawn.mockReturnValue(child);
    const { server, watcher, clientInvalidate, ssrInvalidate } = makeServer();
    const plugin = regenerateGeneratedContent({
      contentBuildScriptPath: '/workspace/packages/scripts/content-build.ts',
      workingDirectory: '/workspace',
      contentDirectories: ['/workspace/writing'],
      enhancementSourceDirectories: ['/workspace/packages/content-enhancements'],
      additionalDependencies: ['/workspace/image-manifest.json'],
      debounceMs: 0,
    });
    if (
      !plugin ||
      typeof plugin !== 'object' ||
      Array.isArray(plugin) ||
      !('configureServer' in plugin) ||
      typeof plugin.configureServer !== 'function'
    )
      throw new Error('Expected a Vite server plugin.');
    plugin.configureServer.call(undefined as never, server as never);

    watcher.emit('change', '/workspace/writing/embedded.md');
    await waitForDebounce();
    child.emit('exit', 1);

    expect(clientInvalidate).not.toHaveBeenCalled();
    expect(ssrInvalidate).not.toHaveBeenCalled();
    expect(server.ws.send).not.toHaveBeenCalled();
  });
});
