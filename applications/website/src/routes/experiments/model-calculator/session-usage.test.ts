import { describe, expect, it } from 'vitest';

import { UNKNOWN_ADVISOR_MODEL } from './claude-code-session';
import { createSessionUsageCollector, UNKNOWN_MODEL } from './session-usage';
import type { SessionUsage } from './session-usage';

/** Feeds each file's lines through one collector, in order. */
const collect = (files: Record<string, string[]>): SessionUsage => {
  const collector = createSessionUsageCollector();

  for (const [name, lines] of Object.entries(files)) {
    const reader = collector.readFile(name);
    lines.forEach(reader.addLine);
    reader.finish();
  }

  return collector.summarize();
};

const usageFor = (session: SessionUsage, model: string) =>
  session.models.find((entry) => entry.model === model);

type ClaudeCodeCounts = {
  input?: number;
  output?: number;
  cacheRead?: number;
  cacheWrite5m?: number;
  cacheWrite1h?: number;
};

const claudeCodeUsage = ({
  input = 0,
  output = 0,
  cacheRead = 0,
  cacheWrite5m = 0,
  cacheWrite1h = 0,
}: ClaudeCodeCounts) => ({
  input_tokens: input,
  output_tokens: output,
  cache_read_input_tokens: cacheRead,
  cache_creation_input_tokens: cacheWrite5m + cacheWrite1h,
  cache_creation: {
    ephemeral_5m_input_tokens: cacheWrite5m,
    ephemeral_1h_input_tokens: cacheWrite1h,
  },
});

const claudeCodeResponse = (
  id: string,
  usage: Record<string, unknown>,
  { model = 'claude-sonnet-5-5', ...extra }: Record<string, unknown> = {},
): string =>
  JSON.stringify({
    type: 'assistant',
    sessionId: 'session-1',
    requestId: `request-${id}`,
    ...extra,
    message: { id, model, role: 'assistant', usage },
  });

const claudeCodeUserLine = JSON.stringify({
  type: 'user',
  sessionId: 'session-1',
  message: { role: 'user', content: 'Explain the usage field.' },
});

type CodexCounts = { input?: number; cached?: number; output?: number; reasoning?: number };

const codexCounts = ({ input = 0, cached = 0, output = 0, reasoning = 0 }: CodexCounts) => ({
  input_tokens: input,
  cached_input_tokens: cached,
  cache_write_input_tokens: 0,
  output_tokens: output,
  reasoning_output_tokens: reasoning,
  total_tokens: input + output,
});

const codexMeta = (id: string, forkedFromId?: string): string =>
  JSON.stringify({
    timestamp: '2026-10-04T00:00:00.000Z',
    type: 'session_meta',
    payload: {
      id,
      ...(forkedFromId ? { forked_from_id: forkedFromId } : {}),
      cli_version: '0.200.0',
      model_provider: 'openai',
    },
  });

const codexSessionMeta = codexMeta('thread-1');

const codexTurn = (model: string): string =>
  JSON.stringify({
    timestamp: '2026-10-04T00:00:01.000Z',
    type: 'turn_context',
    payload: { model },
  });

const codexTokenCount = (total: CodexCounts, last: CodexCounts): string =>
  JSON.stringify({
    timestamp: '2026-10-04T00:00:02.000Z',
    type: 'event_msg',
    payload: {
      type: 'token_count',
      info: { total_token_usage: codexCounts(total), last_token_usage: codexCounts(last) },
    },
  });

describe('Claude Code sessions', () => {
  it('keeps the final line of a response that streamed across several lines', () => {
    const session = collect({
      'session.jsonl': [
        claudeCodeUserLine,
        claudeCodeResponse('message-1', claudeCodeUsage({ input: 2, output: 6, cacheRead: 900 })),
        claudeCodeResponse('message-1', claudeCodeUsage({ input: 2, output: 243, cacheRead: 900 })),
      ],
    });

    expect(session.requests).toBe(1);
    expect(session.total).toEqual({
      uncachedInput: 2,
      cacheRead: 900,
      cacheWrite5m: 0,
      cacheWrite1h: 0,
      output: 243,
    });
  });

  it('splits cache writes by lifetime and treats an unsplit write as five-minute', () => {
    const session = collect({
      'session.jsonl': [
        claudeCodeResponse('split', {
          ...claudeCodeUsage({ cacheWrite1h: 60 }),
          cache_creation_input_tokens: 100,
        }),
        claudeCodeResponse('unsplit', { input_tokens: 1, cache_creation_input_tokens: 50 }),
      ],
    });

    expect(session.total.cacheWrite5m).toBe(90);
    expect(session.total.cacheWrite1h).toBe(60);
  });

  it('bills an advisor call to the advisor model without counting the executor twice', () => {
    const executorTurn = claudeCodeUsage({ input: 2, output: 221, cacheRead: 109_597 });
    const advisorCall = {
      ...claudeCodeUsage({ input: 112_634, output: 16_212 }),
      type: 'advisor_message',
    };
    const executorFollowUp = claudeCodeUsage({ input: 2, output: 280, cacheRead: 111_037 });

    const session = collect({
      'session.jsonl': [
        claudeCodeResponse(
          'with-advisor',
          {
            ...claudeCodeUsage({ input: 4, output: 501, cacheRead: 220_634 }),
            iterations: [
              { ...executorTurn, type: 'message' },
              advisorCall,
              { ...executorFollowUp, type: 'message' },
            ],
          },
          { advisorModel: 'claude-fable-5-1' },
        ),
      ],
    });

    expect(usageFor(session, 'claude-sonnet-5-5')).toMatchObject({
      requests: 1,
      usage: { uncachedInput: 4, cacheRead: 220_634, output: 501 },
    });
    expect(usageFor(session, 'claude-fable-5-1')).toMatchObject({
      requests: 1,
      usage: { uncachedInput: 112_634, cacheRead: 0, output: 16_212 },
    });
  });

  it('measures the largest prompt per iteration, not from the summed usage', () => {
    const iteration = claudeCodeUsage({ input: 2, output: 100, cacheRead: 109_997 });
    const session = collect({
      'session.jsonl': [
        claudeCodeResponse('two-iterations', {
          ...claudeCodeUsage({ input: 4, output: 200, cacheRead: 219_994 }),
          iterations: [
            { ...iteration, type: 'message' },
            { ...iteration, type: 'message' },
          ],
        }),
      ],
    });

    expect(session.largestPrompt).toBe(109_999);
    expect(usageFor(session, 'claude-sonnet-5-5')).toMatchObject({
      largestPrompt: 109_999,
      usage: { uncachedInput: 4, cacheRead: 219_994 },
    });
  });

  it('names the advisor as unknown when the line does not say which model ran it', () => {
    const session = collect({
      'session.jsonl': [
        claudeCodeResponse('advisor', {
          ...claudeCodeUsage({ input: 1 }),
          iterations: [{ ...claudeCodeUsage({ input: 10 }), type: 'advisor_message' }],
        }),
      ],
    });

    expect(usageFor(session, UNKNOWN_ADVISOR_MODEL)?.usage.uncachedInput).toBe(10);
  });

  it('ignores the synthetic placeholder responses Claude Code writes for errors', () => {
    const session = collect({
      'session.jsonl': [
        claudeCodeResponse('placeholder', claudeCodeUsage({}), { model: '<synthetic>' }),
      ],
    });

    expect(session.models).toEqual([]);
  });

  it('counts a response once when the transcript and a subagent file both contain it', () => {
    const response = claudeCodeResponse('shared', claudeCodeUsage({ input: 5, output: 7 }));

    const session = collect({
      'session.jsonl': [response],
      'session/subagents/agent-1.jsonl': [response],
    });

    expect(session.requests).toBe(1);
    expect(session.files.map((file) => file.requests)).toEqual([1, 1]);
  });

  it('keeps the last cost Claude Code recorded for each session and adds sessions together', () => {
    const costState = (sessionId: string, totalCostUSD: number) =>
      JSON.stringify({ type: 'cost-state', sessionId, totalCostUSD });

    const session = collect({
      'first.jsonl': [costState('first', 0.1), costState('first', 0.25)],
      'second.jsonl': [costState('second', 1)],
    });

    expect(session.reportedCost).toBeCloseTo(1.25);
  });

  it('leaves the reported cost empty when no transcript recorded one', () => {
    const session = collect({
      'session.jsonl': [claudeCodeResponse('message-1', claudeCodeUsage({ input: 1 }))],
    });

    expect(session.reportedCost).toBeNull();
  });

  it('recognizes a subagent file that starts with a line that has no session ID', () => {
    const session = collect({
      'agent.jsonl': [
        JSON.stringify({ type: 'started' }),
        claudeCodeResponse('message-1', claudeCodeUsage({ input: 3 })),
      ],
    });

    expect(session.files[0].format).toBe('claude-code');
    expect(session.total.uncachedInput).toBe(3);
  });
});

describe('Codex sessions', () => {
  it('separates cached input from uncached input and keeps reasoning inside output', () => {
    const session = collect({
      'rollout.jsonl': [
        codexSessionMeta,
        codexTurn('gpt-6-luna'),
        codexTokenCount(
          { input: 1_000, cached: 800, output: 300, reasoning: 200 },
          { input: 1_000, cached: 800, output: 300, reasoning: 200 },
        ),
      ],
    });

    expect(usageFor(session, 'gpt-6-luna')?.usage).toEqual({
      uncachedInput: 200,
      cacheRead: 800,
      cacheWrite5m: 0,
      cacheWrite1h: 0,
      output: 300,
    });
  });

  it('skips the repeated copy of each token event', () => {
    const event = codexTokenCount({ input: 100, output: 10 }, { input: 100, output: 10 });

    const session = collect({
      'rollout.jsonl': [codexSessionMeta, codexTurn('gpt-6-luna'), event, event],
    });

    expect(session.requests).toBe(1);
    expect(session.total.output).toBe(10);
  });

  it('keeps counting after compaction resets the running total to zero', () => {
    const session = collect({
      'rollout.jsonl': [
        codexSessionMeta,
        codexTurn('gpt-6-luna'),
        codexTokenCount({ input: 1_000, output: 50 }, { input: 1_000, output: 50 }),
        codexTokenCount({}, {}),
        codexTokenCount({ input: 400, output: 20 }, { input: 400, output: 20 }),
      ],
    });

    expect(session.requests).toBe(2);
    expect(session.total.uncachedInput).toBe(1_400);
    expect(session.total.output).toBe(70);
  });

  it('attributes each request to the model of its turn', () => {
    const session = collect({
      'rollout.jsonl': [
        codexSessionMeta,
        codexTurn('gpt-6-luna'),
        codexTokenCount({ input: 100, output: 10 }, { input: 100, output: 10 }),
        codexTurn('gpt-6-astra'),
        codexTokenCount({ input: 300, output: 30 }, { input: 200, output: 20 }),
      ],
    });

    expect(usageFor(session, 'gpt-6-luna')?.usage.uncachedInput).toBe(100);
    expect(usageFor(session, 'gpt-6-astra')?.usage.uncachedInput).toBe(200);
  });

  it('gives usage reported before the first turn to that turn’s model', () => {
    const session = collect({
      'rollout.jsonl': [
        codexSessionMeta,
        codexTokenCount({ input: 100 }, { input: 100 }),
        codexTurn('gpt-6.1-sol'),
      ],
    });

    expect(usageFor(session, 'gpt-6.1-sol')?.usage.uncachedInput).toBe(100);
  });

  it('labels usage as an unknown model when no turn ever names one', () => {
    const session = collect({
      'rollout.jsonl': [codexSessionMeta, codexTokenCount({ input: 100 }, { input: 100 })],
    });

    expect(usageFor(session, UNKNOWN_MODEL)?.usage.uncachedInput).toBe(100);
  });

  it("counts a parent's events once when a forked subagent's file replays them", () => {
    const first = codexTokenCount({ input: 100, output: 10 }, { input: 100, output: 10 });
    const second = codexTokenCount({ input: 300, output: 30 }, { input: 200, output: 20 });

    const session = collect({
      'parent.jsonl': [codexSessionMeta, codexTurn('gpt-6-luna'), first, second],
      'fork.jsonl': [
        codexSessionMeta,
        codexTurn('gpt-6-luna'),
        first,
        second,
        codexTokenCount({ input: 700, output: 70 }, { input: 400, output: 40 }),
      ],
    });

    expect(session.requests).toBe(3);
    expect(session.total.uncachedInput).toBe(700);
    expect(session.files.map((file) => file.requests)).toEqual([2, 1]);
  });
});

describe('a corrupt token count', () => {
  it('counts as zero instead of overflowing the totals', () => {
    const session = collect({
      'session.jsonl': [
        claudeCodeResponse('huge', {
          input_tokens: 1e308,
          output_tokens: 10,
        }),
      ],
    });

    expect(session.total.uncachedInput).toBe(0);
    expect(session.total.output).toBe(10);
    expect(Number.isFinite(session.largestPrompt)).toBe(true);
  });
});

describe('Codex sessions that report the same counts', () => {
  const first = codexTokenCount({ input: 100, output: 10 }, { input: 100, output: 10 });

  it('counts both when the sessions are unrelated', () => {
    const session = collect({
      'one.jsonl': [codexMeta('thread-a'), codexTurn('gpt-6-luna'), first],
      'two.jsonl': [codexMeta('thread-b'), codexTurn('gpt-6-luna'), first],
    });

    expect(session.requests).toBe(2);
    expect(session.total.uncachedInput).toBe(200);
  });

  it('counts both when neither file names its thread', () => {
    const session = collect({
      'one.jsonl': [codexTurn('gpt-6-luna'), first],
      'two.jsonl': [codexTurn('gpt-6-luna'), first],
    });

    expect(session.requests).toBe(2);
  });

  it('counts a replay once when the fork names its parent, whichever file comes first', () => {
    const files = {
      'parent.jsonl': [codexMeta('thread-a'), codexTurn('gpt-6-luna'), first],
      'fork.jsonl': [codexMeta('thread-b', 'thread-a'), codexTurn('gpt-6-luna'), first],
    };

    expect(collect(files).requests).toBe(1);
    expect(
      collect({ 'fork.jsonl': files['fork.jsonl'], 'parent.jsonl': files['parent.jsonl'] })
        .requests,
    ).toBe(1);
  });

  it('follows a fork chain back to the original whichever order the files are read in', () => {
    const files = {
      'a.jsonl': [codexMeta('thread-a'), codexTurn('gpt-6-luna'), first],
      'b.jsonl': [codexMeta('thread-b', 'thread-a'), codexTurn('gpt-6-luna'), first],
      'c.jsonl': [codexMeta('thread-c', 'thread-b'), codexTurn('gpt-6-luna'), first],
    };

    expect(
      collect({
        'c.jsonl': files['c.jsonl'],
        'b.jsonl': files['b.jsonl'],
        'a.jsonl': files['a.jsonl'],
      }).requests,
    ).toBe(1);
    expect(
      collect({
        'c.jsonl': files['c.jsonl'],
        'a.jsonl': files['a.jsonl'],
        'b.jsonl': files['b.jsonl'],
      }).requests,
    ).toBe(1);
  });

  it('counts an identical request on either side of a compaction reset', () => {
    const reset = codexTokenCount({}, {});
    const session = collect({
      'rollout.jsonl': [codexMeta('thread-a'), codexTurn('gpt-6-luna'), first, reset, first],
    });

    expect(session.requests).toBe(2);
    expect(session.total.uncachedInput).toBe(200);
  });

  it('follows a fork of a fork back to the original thread', () => {
    const session = collect({
      'a.jsonl': [codexMeta('thread-a'), codexTurn('gpt-6-luna'), first],
      'b.jsonl': [codexMeta('thread-b', 'thread-a'), codexTurn('gpt-6-luna'), first],
      'c.jsonl': [codexMeta('thread-c', 'thread-b'), codexTurn('gpt-6-luna'), first],
    });

    expect(session.requests).toBe(1);
  });
});

describe('every session', () => {
  it('reports a file that is neither format', () => {
    const session = collect({ 'notes.txt': ['Not JSON at all', '{"also": "not a session"}'] });

    expect(session.files[0]).toEqual({
      name: 'notes.txt',
      format: null,
      requests: 0,
      unreadableLines: 1,
    });
    expect(session.models).toEqual([]);
  });

  it('counts a truncated final line as unreadable and keeps the complete lines', () => {
    const complete = claudeCodeResponse('message-1', claudeCodeUsage({ input: 5, output: 9 }));

    // A session that's still running can end mid-line.
    const session = collect({ 'session.jsonl': [complete, complete.slice(0, -12)] });

    expect(session.files[0].unreadableLines).toBe(1);
    expect(session.total.output).toBe(9);
  });

  it('combines Claude Code and Codex files, most tokens first, and tracks the largest prompt', () => {
    const session = collect({
      'session.jsonl': [
        claudeCodeResponse('small', claudeCodeUsage({ input: 10, cacheRead: 90, output: 5 })),
      ],
      'rollout.jsonl': [
        codexSessionMeta,
        codexTurn('gpt-6-astra'),
        codexTokenCount({ input: 5_000, output: 100 }, { input: 5_000, output: 100 }),
      ],
    });

    expect(session.models.map((entry) => entry.model)).toEqual([
      'gpt-6-astra',
      'claude-sonnet-5-5',
    ]);
    expect(session.largestPrompt).toBe(5_000);
    expect(usageFor(session, 'claude-sonnet-5-5')?.largestPrompt).toBe(100);
    expect(session.files.map((file) => file.format)).toEqual(['claude-code', 'codex']);
  });
});
