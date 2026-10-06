/**
 * The globals a Claude Code workflow script uses (`agent`, `parallel`,
 * `pipeline`, `phase`, `log`, `workflow`, and `budget`), rebuilt on the Codex
 * SDK. Each `agent()` call is one Codex thread.
 *
 * This runtime has no imports of its own. The code around it imports the Codex
 * client, Ajv, and the Node modules it needs and passes them to
 * `createWorkflowRuntime`, so the same text runs in a converted workflow, in
 * tests with a fake Codex, and in a browser that only wants `toStrictSchema`.
 */

/** Items one `parallel()` or `pipeline()` call accepts. A longer list is an error, as in Claude Code. */
const MAXIMUM_ITEMS = 4096;

/** Agents one run may start, as in Claude Code: a backstop against a runaway loop. */
const MAXIMUM_AGENTS = 1000;

/** Claude Code's `effort` names, and the Codex `modelReasoningEffort` each one becomes. */
const REASONING_EFFORT = {
  low: 'low',
  medium: 'medium',
  high: 'high',
  xhigh: 'xhigh',
  max: 'max',
};

/** `agent()` options Codex has no equivalent for, and what the script does instead. */
const UNSUPPORTED_OPTIONS = {
  agentType: 'Codex has no subagent types, so every agent runs as a plain Codex thread.',
  disallowedTools:
    "Codex can't take tools away from one thread; CONFIG.sandboxMode limits what every agent can do.",
  bashCommandClamp:
    'Codex has no per-thread command allow list; the sandbox decides what commands can do.',
  stallMs: "There's no stall timer; an agent runs until its Codex turn ends.",
};

/**
 * JSON Schema keywords OpenAI's strict structured output accepts. Anything
 * else is removed from the schema sent to Codex; the reply is still checked
 * against the original schema, so a removed constraint is enforced by retrying.
 */
const STRICT_KEYWORDS = new Set([
  'type',
  'properties',
  'required',
  'additionalProperties',
  'items',
  'enum',
  'const',
  'anyOf',
  'description',
  'title',
  '$ref',
  '$defs',
  'definitions',
  'pattern',
  'format',
  'minimum',
  'maximum',
  'exclusiveMinimum',
  'exclusiveMaximum',
  'multipleOf',
  'minItems',
  'maxItems',
]);

/** String formats strict structured output accepts. */
const STRICT_FORMATS = new Set([
  'date-time',
  'time',
  'date',
  'duration',
  'email',
  'hostname',
  'ipv4',
  'ipv6',
  'uuid',
]);

/** Types that become nullable as `type: [T, 'null']` rather than through `anyOf`. */
const SIMPLE_TYPES = new Set(['string', 'number', 'integer', 'boolean']);

/**
 * @typedef {Record<string, unknown>} SchemaObject
 *
 * @typedef {object} StrictSchemaResult
 * @property {SchemaObject} schema The strict copy to send to Codex.
 * @property {string[]} nullablePaths
 *   Properties that were optional and are now required but nullable, as data
 *   paths such as `findings[].suggestion`. A `null` the model returns at one of
 *   them is removed before the reply is checked.
 * @property {Array<{ path: string; keyword: string }>} droppedKeywords
 *   Keywords strict mode doesn't accept, removed from the copy.
 * @property {Array<{ path: string; message: string }>} rewrites
 *   Other changes that alter what the model may return, such as `oneOf` becoming `anyOf`.
 */

/**
 * @param {unknown} value
 * @returns {value is SchemaObject}
 */
function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * @param {string} parent
 * @param {string} key
 */
function propertyPath(parent, key) {
  return parent === '' ? key : `${parent}.${key}`;
}

/**
 * Follow a local `$ref` (`#/$defs/Name`, or any `#/…` pointer) to the schema it names.
 *
 * @param {unknown} schema
 * @param {SchemaObject} root
 * @returns {unknown}
 */
function resolveReference(schema, root) {
  let current = schema;
  for (let hops = 0; hops < 32 && isPlainObject(current); hops += 1) {
    const reference = current['$ref'];
    if (typeof reference !== 'string' || !reference.startsWith('#')) return current;
    /** @type {unknown} */
    let target = root;
    for (const part of reference.slice(1).split('/').filter(Boolean)) {
      const key = decodeURIComponent(part).replaceAll('~1', '/').replaceAll('~0', '~');
      target = isPlainObject(target) ? target[key] : undefined;
    }
    current = target;
  }
  return current;
}

/**
 * Whether a schema already lets a value be `null`, so a `null` there means `null`
 * rather than a field the model had to fill in.
 *
 * @param {unknown} schema
 * @param {SchemaObject} root
 * @param {number} [depth]
 * @returns {boolean}
 */
function acceptsNull(schema, root, depth = 0) {
  if (schema === true) return true;
  if (!isPlainObject(schema) || depth > 32) return false;
  if (typeof schema['$ref'] === 'string')
    return acceptsNull(resolveReference(schema, root), root, depth + 1);
  const { type } = schema;
  if (type === 'null' || (Array.isArray(type) && type.includes('null'))) return true;
  if (Array.isArray(schema.enum)) return schema.enum.includes(null);
  if ('const' in schema) return schema.const === null;
  for (const keyword of ['anyOf', 'oneOf']) {
    const members = schema[keyword];
    if (Array.isArray(members))
      return members.some((member) => acceptsNull(member, root, depth + 1));
  }
  // With no `type`, JSON Schema accepts any value, `null` included.
  return type === undefined;
}

/**
 * Make a (strict) property schema accept `null` as well.
 *
 * @param {unknown} schema
 * @returns {SchemaObject}
 */
function makeNullable(schema) {
  if (!isPlainObject(schema)) return { anyOf: [schema, { type: 'null' }] };
  const hasValueList = Array.isArray(schema.enum) || 'const' in schema;
  if (!hasValueList && typeof schema.type === 'string' && SIMPLE_TYPES.has(schema.type))
    return { ...schema, type: [schema.type, 'null'] };
  if (!hasValueList && Array.isArray(schema.type) && schema.type.every((name) => name !== 'object'))
    return { ...schema, type: [...schema.type, 'null'] };
  if (Array.isArray(schema.anyOf) && Object.keys(schema).every((key) => key === 'anyOf'))
    return { anyOf: [...schema.anyOf, { type: 'null' }] };
  return { anyOf: [schema, { type: 'null' }] };
}

/**
 * Whether a schema describes an object, so strict mode needs its properties closed.
 *
 * @param {SchemaObject} schema
 */
function describesObject(schema) {
  const { type } = schema;
  return (
    type === 'object' ||
    (Array.isArray(type) && type.includes('object')) ||
    (type === undefined && isPlainObject(schema.properties))
  );
}

/**
 * Convert a JSON Schema to the strict form Codex sends to OpenAI: every object
 * gets `additionalProperties: false` and lists every property in `required`, a
 * property that was optional becomes nullable instead, and keywords strict mode
 * rejects are removed. Returns the copy and what changed; the input is not modified.
 *
 * @param {unknown} schema
 * @returns {StrictSchemaResult}
 */
export function toStrictSchema(schema) {
  const root = isPlainObject(schema) ? schema : {};
  /** @type {StrictSchemaResult} */
  const result = { schema: {}, nullablePaths: [], droppedKeywords: [], rewrites: [] };

  /**
   * @param {unknown} node
   * @param {string} path
   * @returns {unknown}
   */
  const convert = (node, path) => {
    if (!isPlainObject(node)) return node;
    /** @type {SchemaObject} */
    const strict = {};
    const isObject = describesObject(node);
    const originalRequired = Array.isArray(node.required)
      ? node.required.filter((key) => typeof key === 'string')
      : [];

    if (isObject && !isPlainObject(node.properties))
      result.rewrites.push({
        path,
        message: 'an object with no `properties` can only be empty in strict mode',
      });
    if (isObject && node.additionalProperties !== undefined && node.additionalProperties !== false)
      result.rewrites.push({
        path,
        message: '`additionalProperties` became `false`, so the model can’t add other keys',
      });

    for (const [keyword, value] of Object.entries(node)) {
      if (keyword === 'properties' && isPlainObject(value)) {
        /** @type {SchemaObject} */
        const properties = {};
        for (const [key, member] of Object.entries(value)) {
          const childPath = propertyPath(path, key);
          // An optional property becomes required but nullable, unless it already allows null.
          const optional =
            isObject && !originalRequired.includes(key) && !acceptsNull(member, root);
          if (optional) result.nullablePaths.push(childPath);
          const converted = convert(member, childPath);
          properties[key] = optional ? makeNullable(converted) : converted;
        }
        strict.properties = properties;
      } else if (keyword === 'items' && isPlainObject(value)) {
        strict.items = convert(value, `${path}[]`);
      } else if ((keyword === 'anyOf' || keyword === 'oneOf') && Array.isArray(value)) {
        if (keyword === 'oneOf')
          result.rewrites.push({
            path,
            message: '`oneOf` became `anyOf`, so a value may match more than one choice',
          });
        const members = value.map((member) => convert(member, path));
        strict.anyOf = [...(Array.isArray(strict.anyOf) ? strict.anyOf : []), ...members];
      } else if ((keyword === '$defs' || keyword === 'definitions') && isPlainObject(value)) {
        strict[keyword] = Object.fromEntries(
          Object.entries(value).map(([name, member]) => [
            name,
            convert(member, `${keyword}.${name}`),
          ]),
        );
      } else if (keyword === 'format' && !STRICT_FORMATS.has(String(value))) {
        result.droppedKeywords.push({ path, keyword: `format: ${String(value)}` });
      } else if (keyword === 'additionalProperties' || keyword === 'required') {
        // Rebuilt below for objects.
      } else if (STRICT_KEYWORDS.has(keyword)) {
        strict[keyword] = value;
      } else {
        result.droppedKeywords.push({ path, keyword });
      }
    }

    if (!isObject) return strict;
    const properties = isPlainObject(strict.properties) ? strict.properties : {};
    strict.properties = properties;
    strict.required = [
      ...originalRequired.filter((key) => Object.hasOwn(properties, key)),
      ...Object.keys(properties).filter((key) => !originalRequired.includes(key)),
    ];
    strict.additionalProperties = false;
    return strict;
  };

  const converted = convert(schema, '');
  result.schema = isPlainObject(converted) ? converted : {};
  return result;
}

/**
 * The object schemas a value at this point may match: the schema itself and
 * its `anyOf`/`oneOf` members, with local references followed.
 *
 * @param {unknown} schema
 * @param {SchemaObject} root
 * @param {number} [depth]
 * @returns {SchemaObject[]}
 */
function candidateSchemas(schema, root, depth = 0) {
  const resolved = resolveReference(schema, root);
  if (!isPlainObject(resolved) || depth > 32) return [];
  const members = [...(Array.isArray(resolved.anyOf) ? resolved.anyOf : [])];
  if (Array.isArray(resolved.oneOf)) members.push(...resolved.oneOf);
  return [resolved, ...members.flatMap((member) => candidateSchemas(member, root, depth + 1))];
}

/**
 * Remove the `null`s strict mode made the model write: a `null` at a property
 * the ORIGINAL schema left optional and doesn't allow to be `null`. Walks the
 * original schema alongside the value and returns a cleaned copy.
 *
 * @param {unknown} value
 * @param {unknown} schema The schema as the workflow wrote it, not the strict copy.
 * @param {SchemaObject} [root]
 * @returns {unknown}
 */
export function stripIntroducedNulls(value, schema, root) {
  const rootSchema = root ?? (isPlainObject(schema) ? schema : {});
  const candidates = candidateSchemas(schema, rootSchema);

  if (Array.isArray(value)) {
    const itemSchema = candidates.find((candidate) => isPlainObject(candidate.items))?.items;
    return itemSchema === undefined
      ? value
      : value.map((item) => stripIntroducedNulls(item, itemSchema, rootSchema));
  }
  if (!isPlainObject(value)) return value;

  /** @type {SchemaObject} */
  const cleaned = {};
  for (const [key, member] of Object.entries(value)) {
    const declaring = candidates.filter(
      (candidate) =>
        isPlainObject(candidate.properties) && Object.hasOwn(candidate.properties, key),
    );
    const introduced =
      member === null &&
      declaring.length > 0 &&
      declaring.every((candidate) => {
        const required = Array.isArray(candidate.required) ? candidate.required : [];
        const properties = /** @type {SchemaObject} */ (candidate.properties);
        return !required.includes(key) && !acceptsNull(properties[key], rootSchema);
      });
    if (introduced) continue;
    const [first] = declaring;
    cleaned[key] = first
      ? stripIntroducedNulls(
          member,
          /** @type {SchemaObject} */ (first.properties)[key],
          rootSchema,
        )
      : member;
  }
  return cleaned;
}

/**
 * @typedef {object} WorkflowConfig
 * @property {Record<string, string | null>} models
 *   Claude model name to Codex model id; `null` uses Codex's default model.
 *   `inherit` is for agents that set no model.
 * @property {string} sandboxMode `read-only`, `workspace-write`, or `danger-full-access`.
 * @property {string} approvalPolicy
 * @property {string} workingDirectory
 * @property {boolean} skipGitRepoCheck
 * @property {boolean} networkAccessEnabled
 * @property {number} concurrency Agents running at once, 1 to 256.
 * @property {number} structuredOutputAttempts Tries for an agent with a schema before it throws.
 * @property {number | null} budgetTotal What `budget.total` reports.
 *
 * @typedef {object} CodexUsage
 * @property {number} [output_tokens]
 * @property {number} [reasoning_output_tokens]
 *
 * @typedef {object} CodexTurn
 * @property {string} finalResponse
 * @property {CodexUsage | null} usage
 *
 * @typedef {object} CodexThread
 * @property {(input: string, options?: { outputSchema?: unknown }) => Promise<CodexTurn>} run
 *
 * @typedef {object} CodexClient
 * @property {(options?: Record<string, unknown>) => CodexThread} startThread
 *
 * @typedef {{ (data: unknown): boolean; errors?: unknown[] | null }} SchemaValidator
 *
 * @typedef {object} AjvInstance
 * @property {(schema: SchemaObject) => SchemaValidator} compile
 * @property {(errors?: unknown[] | null, options?: { dataVar?: string }) => string} errorsText
 *
 * @typedef {(error: Error | null, stdout: string, stderr: string) => void} ExecFileCallback
 *
 * @typedef {object} RuntimeDependencies
 * @property {new () => CodexClient} Codex The Codex SDK's client class.
 * @property {new (options: Record<string, unknown>) => AjvInstance} Ajv
 * @property {{ execFile: (file: string, args: string[], options: { cwd: string }, callback: ExecFileCallback) => unknown }} childProcess
 * @property {{ promises: { mkdtemp: (prefix: string) => Promise<string> } }} fs
 * @property {{ tmpdir: () => string }} os
 * @property {{ join: (...parts: string[]) => string; basename: (path: string) => string }} path
 *
 * @typedef {object} AgentOptions
 * @property {string} [label] What progress lines call this agent.
 * @property {string} [phase] The progress group, shown in its progress lines.
 * @property {SchemaObject} [schema] A JSON Schema object the reply must match.
 * @property {string} [model] A Claude model name, looked up in `CONFIG.models`.
 * @property {string} [effort] `low`, `medium`, `high`, `xhigh`, or `max`.
 * @property {string} [isolation] `worktree` runs the agent in a new git worktree.
 * @property {string} [agentType] Ignored, with a warning.
 * @property {string[]} [disallowedTools] Ignored, with a warning.
 * @property {string[]} [bashCommandClamp] Ignored, with a warning.
 * @property {number} [stallMs] Ignored, with a warning.
 *
 * @typedef {object} WorkflowBudget
 * @property {number | null} total
 * @property {() => number} spent
 * @property {() => number} remaining
 *
 * @typedef {object} WorkflowRuntime
 * @property {(prompt: string, options?: AgentOptions) => Promise<unknown>} agent
 * @property {(thunks: Array<() => unknown>) => Promise<unknown[]>} parallel
 * @property {(items: unknown[], ...stages: Array<(previous: any, item: any, index: number) => unknown>) => Promise<unknown[]>} pipeline
 * @property {(title: string) => void} phase
 * @property {(message: string) => void} log
 * @property {(reference: unknown, args?: unknown) => Promise<never>} workflow
 * @property {WorkflowBudget} budget
 */

/** @param {unknown} error */
function describeError(error) {
  return error instanceof Error ? error.message : String(error);
}

/** @param {string} line */
function writeProgress(line) {
  process.stderr.write(`${line}\n`);
}

/**
 * @param {unknown} value
 * @param {number} minimum
 * @param {number} maximum
 * @param {number} fallback
 */
function clampWholeNumber(value, minimum, maximum, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(maximum, Math.max(minimum, Math.floor(number)));
}

/**
 * Build the workflow globals on a Codex client.
 *
 * @param {WorkflowConfig} config
 * @param {RuntimeDependencies} dependencies
 * @returns {WorkflowRuntime}
 */
export function createWorkflowRuntime(config, dependencies) {
  const concurrency = clampWholeNumber(config.concurrency, 1, 256, 16);
  const attempts = clampWholeNumber(config.structuredOutputAttempts, 1, 100, 5);
  const ajv = new dependencies.Ajv({ strict: false, allErrors: true, validateFormats: false });

  /** @type {CodexClient | undefined} */
  let client;
  let agentsStarted = 0;
  let outputTokens = 0;
  let running = 0;
  /** @type {Array<() => void>} */
  const waiting = [];
  /** @type {Set<string>} */
  const warned = new Set();
  /** @type {WeakMap<object, { strict: SchemaObject; validate: SchemaValidator }>} */
  const schemas = new WeakMap();

  /**
   * @param {string} key
   * @param {string} message
   */
  const warnOnce = (key, message) => {
    if (warned.has(key)) return;
    warned.add(key);
    writeProgress(`[warning] ${message}`);
  };

  // A semaphore: at most `concurrency` agents hold a slot, and the rest wait in order.
  /** @returns {Promise<void>} */
  const acquire = () => {
    if (running < concurrency) {
      running += 1;
      return Promise.resolve();
    }
    return new Promise((resolve) => waiting.push(resolve));
  };
  const release = () => {
    const next = waiting.shift();
    if (next) next();
    else running -= 1;
  };

  /**
   * The strict copy and validator for a schema, made once per schema object.
   *
   * @param {unknown} schema
   * @param {string} label
   */
  const prepareSchema = (schema, label) => {
    if (!isPlainObject(schema) || schema.type !== 'object' || !isPlainObject(schema.properties))
      throw new Error(
        `The schema for "${label}" must be an object schema with properties, as Claude Code requires.`,
      );
    const cached = schemas.get(schema);
    if (cached) return cached;
    // Ajv doesn't know newer `$schema` dialect URLs; the keywords are what matter here.
    const checked = { ...schema };
    delete checked.$schema;
    let validate;
    try {
      validate = ajv.compile(checked);
    } catch (error) {
      throw new Error(
        `The schema for "${label}" isn't valid JSON Schema: ${describeError(error)}`,
        {
          cause: error,
        },
      );
    }
    const prepared = { strict: toStrictSchema(schema).schema, validate };
    schemas.set(schema, prepared);
    return prepared;
  };

  /**
   * @param {string | undefined} model
   * @returns {string | undefined}
   */
  const resolveModel = (model) => {
    const key = model ?? 'inherit';
    if (Object.hasOwn(config.models, key)) return config.models[key] || undefined;
    warnOnce(
      `model:${key}`,
      `CONFIG.models has no entry for "${key}", so those agents use Codex's default model.`,
    );
    return undefined;
  };

  /**
   * @param {string | undefined} effort
   * @returns {string | undefined}
   */
  const resolveEffort = (effort) => {
    if (effort === undefined) return undefined;
    if (Object.hasOwn(REASONING_EFFORT, effort))
      return REASONING_EFFORT[/** @type {keyof typeof REASONING_EFFORT} */ (effort)];
    warnOnce(`effort:${effort}`, `Unknown effort "${effort}" is ignored.`);
    return undefined;
  };

  /**
   * @param {string} file
   * @param {string[]} args
   * @returns {Promise<void>}
   */
  const execute = (file, args) =>
    new Promise((resolve, reject) => {
      dependencies.childProcess.execFile(
        file,
        args,
        { cwd: config.workingDirectory },
        (error, _stdout, stderr) => {
          if (error) reject(new Error(String(stderr).trim() || error.message));
          else resolve();
        },
      );
    });

  /**
   * Add a git worktree on a new branch in a temporary folder, and leave it there
   * for you to inspect and remove.
   *
   * @param {string} label
   */
  const createWorktree = async (label) => {
    const { fs, os, path } = dependencies;
    const folder = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'codex-workflow-'));
    const directory = path.join(folder, 'worktree');
    const branch = `codex-workflow/${path.basename(folder).replace(/^codex-workflow-/, '')}`;
    try {
      await execute('git', ['worktree', 'add', '-b', branch, directory, 'HEAD']);
    } catch (error) {
      throw new Error(`Couldn't create a worktree for "${label}": ${describeError(error)}`, {
        cause: error,
      });
    }
    writeProgress(`[worktree] ${label}: ${directory} (branch ${branch})`);
    return directory;
  };

  /**
   * Parse and check a structured reply.
   *
   * @param {string} text
   * @param {SchemaObject} schema
   * @param {SchemaValidator} validate
   * @returns {{ ok: true; value: unknown } | { ok: false; message: string }}
   */
  const checkReply = (text, schema, validate) => {
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (error) {
      return { ok: false, message: `the reply wasn't JSON (${describeError(error)})` };
    }
    const value = stripIntroducedNulls(parsed, schema);
    if (validate(value)) return { ok: true, value };
    return { ok: false, message: ajv.errorsText(validate.errors, { dataVar: 'reply' }) };
  };

  /**
   * Spawn one Codex thread. With a `schema`, returns the parsed reply that
   * matches it, asking again up to `CONFIG.structuredOutputAttempts` times and
   * then throwing; without one, returns the final text. Returns `null` when the
   * Codex turn fails or the SDK throws.
   *
   * @param {string} prompt
   * @param {AgentOptions} [options]
   * @returns {Promise<unknown>}
   */
  async function agent(prompt, options) {
    if (typeof prompt !== 'string') throw new TypeError('agent() takes a prompt string first.');
    agentsStarted += 1;
    if (agentsStarted > MAXIMUM_AGENTS)
      throw new Error(
        `This run has already started ${MAXIMUM_AGENTS} agents, the most one run may start.`,
      );

    options ??= {};
    const label = options.label ?? (prompt.split('\n')[0] ?? '').slice(0, 60);
    for (const [option, explanation] of Object.entries(UNSUPPORTED_OPTIONS)) {
      if (Object.hasOwn(options, option))
        warnOnce(`option:${option}`, `agent() option ${option} is ignored. ${explanation}`);
    }
    if (options.isolation !== undefined && options.isolation !== 'worktree')
      throw new Error(`isolation: '${options.isolation}' isn't available; only 'worktree' is.`);

    const prepared =
      options.schema === undefined ? undefined : prepareSchema(options.schema, label);
    const model = resolveModel(options.model);
    const effort = resolveEffort(options.effort);

    await acquire();
    try {
      const workingDirectory =
        options.isolation === 'worktree' ? await createWorktree(label) : config.workingDirectory;
      /** @type {Record<string, unknown>} */
      const threadOptions = {
        sandboxMode: config.sandboxMode,
        approvalPolicy: config.approvalPolicy,
        workingDirectory,
        skipGitRepoCheck: config.skipGitRepoCheck,
        networkAccessEnabled: config.networkAccessEnabled,
      };
      if (model) threadOptions.model = model;
      if (effort) threadOptions.modelReasoningEffort = effort;

      writeProgress(`[agent] ${options.phase ? `(${options.phase}) ` : ''}${label}`);

      // Codex reports a thread's running total at the end of each turn, so a
      // retry on the same thread adds only what grew since the last turn.
      let threadOutputTokens = 0;
      let input = prompt;
      /** @type {CodexThread | undefined} */
      let thread;
      for (let attempt = 1; ; attempt += 1) {
        let turn;
        try {
          client ??= new dependencies.Codex();
          thread ??= client.startThread(threadOptions);
          turn = await thread.run(input, prepared ? { outputSchema: prepared.strict } : undefined);
        } catch (error) {
          writeProgress(`[agent] ${label} failed: ${describeError(error)}`);
          return null;
        }

        const total = Number(turn.usage?.output_tokens ?? 0) || 0;
        outputTokens += total >= threadOutputTokens ? total - threadOutputTokens : total;
        threadOutputTokens = total;

        if (!prepared || !options.schema) return turn.finalResponse;
        const reply = checkReply(turn.finalResponse, options.schema, prepared.validate);
        if (reply.ok) return reply.value;
        if (attempt >= attempts)
          throw new Error(
            `"${label}" didn't return output that matches its schema after ${attempts} attempts: ${reply.message}`,
          );
        writeProgress(`[agent] ${label}: reply ${attempt} didn't match the schema; asking again`);
        input = `Your last reply didn't match the required JSON schema: ${reply.message}. Reply again with only the JSON, matching the schema.`;
      }
    } finally {
      release();
    }
  }

  /**
   * @param {string} name
   * @param {unknown} items
   */
  const checkItems = (name, items) => {
    if (!Array.isArray(items)) throw new TypeError(`${name}() takes an array.`);
    if (items.length > MAXIMUM_ITEMS)
      throw new Error(
        `${name}() got ${items.length} items; one call takes at most ${MAXIMUM_ITEMS}.`,
      );
  };

  /**
   * Run a task, turning a throw into `null` the way Claude Code does.
   *
   * @param {() => unknown} task
   * @param {string} description
   */
  const settle = async (task, description) => {
    try {
      return await task();
    } catch (error) {
      writeProgress(`[warning] ${description} threw and became null: ${describeError(error)}`);
      return null;
    }
  };

  /**
   * Run every function at once and wait for all of them. One that throws gives `null`.
   *
   * @param {Array<() => unknown>} thunks
   * @returns {Promise<unknown[]>}
   */
  async function parallel(thunks) {
    checkItems('parallel', thunks);
    return Promise.all(
      thunks.map((thunk, index) => settle(() => thunk(), `parallel() item ${index}`)),
    );
  }

  /**
   * Run each item through every stage, with no wait between stages. A stage
   * gets the previous stage's result (the item, for the first), the item, and
   * its index. A stage that throws drops that item to `null`.
   *
   * @param {unknown[]} items
   * @param {...(previous: any, item: any, index: number) => unknown} stages
   * @returns {Promise<unknown[]>}
   */
  async function pipeline(items, ...stages) {
    checkItems('pipeline', items);
    return Promise.all(
      items.map((item, index) =>
        settle(async () => {
          /** @type {unknown} */
          let previous = item;
          for (const stage of stages) previous = await stage(previous, item, index);
          return previous;
        }, `pipeline() item ${index}`),
      ),
    );
  }

  /**
   * Start a progress group. Written to stderr, so stdout carries only the result.
   *
   * @param {string} title
   */
  function phase(title) {
    writeProgress(`[phase] ${title}`);
  }

  /**
   * Write a progress message to stderr.
   *
   * @param {string} message
   */
  function log(message) {
    writeProgress(`[log] ${message}`);
  }

  /**
   * Nested workflows aren't converted, so this always throws.
   *
   * @param {unknown} reference
   * @returns {Promise<never>}
   */
  async function workflow(reference) {
    const name =
      typeof reference === 'string'
        ? reference
        : isPlainObject(reference) && typeof reference.scriptPath === 'string'
          ? reference.scriptPath
          : 'that workflow';
    throw new Error(
      `Nested workflows aren't converted. Convert ${name} too, and call it from this script yourself.`,
    );
  }

  const total = typeof config.budgetTotal === 'number' ? config.budgetTotal : null;

  /**
   * `spent()` is the output tokens of every Codex turn this run. Codex's
   * `output_tokens` already include `reasoning_output_tokens` (the Responses
   * API reports reasoning as part of output), so adding them would count
   * reasoning twice. Claude Code counts the whole turn, main loop included.
   *
   * @type {WorkflowBudget}
   */
  const budget = {
    total,
    spent: () => outputTokens,
    remaining: () => (total === null ? Infinity : Math.max(0, total - outputTokens)),
  };

  return { agent, parallel, pipeline, phase, log, workflow, budget };
}
