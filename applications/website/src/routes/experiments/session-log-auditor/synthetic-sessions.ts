/**
 * Writes synthetic Claude Code transcripts in the shape real ones have, for
 * the presets and the tests. Every session, path, and ID here is made up.
 */

export type SessionInfo = {
  sessionId: string;
  cwd: string;
  gitBranch?: string;
  version: string;
  model: string;
};

export type UsageSpec = {
  input?: number;
  cacheRead?: number;
  /** Five-minute cache writes. */
  write5m?: number;
  /** One-hour cache writes. */
  write1h?: number;
  output?: number;
  /** Leave out `usage.cache_creation`, as older transcripts do. */
  noSplit?: boolean;
};

export type ToolSpec = { id: string; name: string; command?: string };

export type SessionWriter = {
  /** Sets the time for the records that follow. */
  at: (timestamp: string) => SessionWriter;
  /** One response, written as one line per tool call with identical usage, as Claude Code writes them. */
  respond: (messageId: string, usage: UsageSpec, tools?: ToolSpec[]) => SessionWriter;
  result: (
    toolUseId: string,
    content: string | { type: 'text'; text: string }[],
    isError: boolean,
  ) => SessionWriter;
  compact: (trigger: 'manual' | 'auto', preTokens: number, postTokens: number) => SessionWriter;
  /** Writes a raw line, such as a malformed one. */
  raw: (line: string) => SessionWriter;
  lines: () => string[];
  text: () => string;
};

export const createSessionWriter = (
  info: SessionInfo,
  { isSidechain = false }: { isSidechain?: boolean } = {},
): SessionWriter => {
  const lines: string[] = [];
  let records = 0;
  let timestamp = '2026-09-01T09:00:00.000Z';

  const common = (): Record<string, unknown> => ({
    sessionId: info.sessionId,
    timestamp,
    cwd: info.cwd,
    ...(info.gitBranch ? { gitBranch: info.gitBranch } : {}),
    version: info.version,
    isSidechain,
    uuid: `${info.sessionId}-${isSidechain ? 'agent-' : ''}${(records += 1)}`,
  });

  const writer: SessionWriter = {
    at: (next) => {
      timestamp = next;

      return writer;
    },
    respond: (messageId, spec, tools = []) => {
      const write5m = spec.write5m ?? 0;
      const write1h = spec.write1h ?? 0;
      const usage = {
        input_tokens: spec.input ?? 0,
        cache_read_input_tokens: spec.cacheRead ?? 0,
        cache_creation_input_tokens: write5m + write1h,
        output_tokens: spec.output ?? 0,
        ...(spec.noSplit
          ? {}
          : {
              cache_creation: {
                ephemeral_5m_input_tokens: write5m,
                ephemeral_1h_input_tokens: write1h,
              },
            }),
      };
      const contents =
        tools.length > 0
          ? tools.map((tool) => [
              {
                type: 'tool_use',
                id: tool.id,
                name: tool.name,
                input: tool.command ? { command: tool.command } : {},
              },
            ])
          : [[{ type: 'text', text: 'Done.' }]];

      for (const content of contents) {
        lines.push(
          JSON.stringify({
            type: 'assistant',
            ...common(),
            message: { id: messageId, model: info.model, role: 'assistant', content, usage },
          }),
        );
      }

      return writer;
    },
    result: (toolUseId, content, isError) => {
      lines.push(
        JSON.stringify({
          type: 'user',
          ...common(),
          message: {
            role: 'user',
            content: [{ type: 'tool_result', tool_use_id: toolUseId, is_error: isError, content }],
          },
        }),
      );

      return writer;
    },
    compact: (trigger, preTokens, postTokens) => {
      lines.push(
        JSON.stringify({
          type: 'system',
          subtype: 'compact_boundary',
          ...common(),
          compactMetadata: { trigger, preTokens, postTokens },
        }),
      );

      return writer;
    },
    raw: (line) => {
      lines.push(line);

      return writer;
    },
    lines: () => [...lines],
    text: () => `${lines.join('\n')}\n`,
  };

  return writer;
};

/** A synthetic session ID: a UUID-shaped string that no real session will have. */
export const syntheticSessionId = (number: number): string =>
  `00000000-0000-4000-8000-${number.toString().padStart(12, '0')}`;
