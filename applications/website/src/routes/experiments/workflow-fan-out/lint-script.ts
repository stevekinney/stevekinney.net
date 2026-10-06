/**
 * Heuristic checks for a pasted workflow script. Nothing here parses
 * JavaScript properly: comments and string contents are blanked out first, so
 * `Math.random()` inside a prompt isn't reported, and then each check is a
 * pattern. Every finding says so.
 */

/** The concept on the page that a finding relates to. Each is an anchor in the footer. */
export type LintConcept = 'nulls' | 'models' | 'barriers' | 'script-rules' | 'meta';

export type LintRule =
  | 'filter-boolean'
  | 'agent-without-model'
  | 'parallel-call'
  | 'banned-call'
  | 'type-annotation'
  | 'meta-not-literal'
  | 'meta-missing-field'
  | 'meta-missing'
  | 'phase-not-in-meta';

export type LintFinding = {
  rule: LintRule;
  line: number;
  message: string;
  concept: LintConcept;
  /** A question to consider rather than something that's wrong. */
  question: boolean;
};

/**
 * Replaces comments and the contents of string literals with spaces, keeping
 * every newline, quote, and `${…}` expression in place, so offsets still
 * match the original.
 */
export const maskSource = (source: string): string => {
  const output = source.split('');
  const blank = (index: number): void => {
    if (output[index] !== '\n') output[index] = ' ';
  };
  const length = source.length;
  /** The brace depth at which each open `${` began. */
  const templateDepths: number[] = [];
  let depth = 0;
  let inTemplate = false;
  let index = 0;

  while (index < length) {
    const character = source[index];
    const next = source[index + 1];

    if (inTemplate) {
      if (character === '\\') {
        blank(index);
        if (index + 1 < length) blank(index + 1);
        index += 2;
      } else if (character === '`') {
        inTemplate = false;
        index += 1;
      } else if (character === '$' && next === '{') {
        depth += 1;
        templateDepths.push(depth);
        inTemplate = false;
        index += 2;
      } else {
        blank(index);
        index += 1;
      }
      continue;
    }

    if (character === '/' && next === '/') {
      while (index < length && source[index] !== '\n') blank(index++);
    } else if (character === '/' && next === '*') {
      const close = source.indexOf('*/', index + 2);
      const end = close === -1 ? length : close + 2;
      while (index < end) blank(index++);
    } else if (character === "'" || character === '"') {
      index += 1;
      while (index < length && source[index] !== character && source[index] !== '\n') {
        if (source[index] === '\\' && index + 1 < length) blank(index++);
        blank(index++);
      }
      index += 1;
    } else if (character === '`') {
      inTemplate = true;
      index += 1;
    } else {
      if (character === '{') depth += 1;
      if (character === '}') {
        if (templateDepths.at(-1) === depth) {
          templateDepths.pop();
          inTemplate = true;
        }
        depth -= 1;
      }
      index += 1;
    }
  }

  return output.join('');
};

const OPENERS: Record<string, string> = { '(': ')', '[': ']', '{': '}' };

/** The index of the bracket that closes the one at `open`, in masked source, or -1. */
const findClose = (masked: string, open: number): number => {
  const stack: string[] = [];

  for (let index = open; index < masked.length; index += 1) {
    const character = masked[index];
    if (character in OPENERS) stack.push(OPENERS[character]);
    else if (character === stack.at(-1)) {
      stack.pop();
      if (stack.length === 0) return index;
    }
  }

  return -1;
};

/** Removes everything nested inside brackets, so only the top level of a list is left. */
const topLevel = (text: string): string => {
  let depth = 0;
  let result = '';

  for (const character of text) {
    if (character in OPENERS) {
      depth += 1;
      result += depth === 1 ? character : ' ';
    } else if (character === ')' || character === ']' || character === '}') {
      result += depth === 1 ? character : ' ';
      depth = Math.max(0, depth - 1);
    } else {
      result += depth === 0 ? character : ' ';
    }
  }

  return result;
};

/** Reads the string literal whose opening quote is at `start` in the original source. */
const readStringLiteral = (source: string, start: number): string | null => {
  const quote = source[start];
  let value = '';

  for (let index = start + 1; index < source.length; index += 1) {
    const character = source[index];
    if (character === '\\') {
      value += source[index + 1] ?? '';
      index += 1;
    } else if (character === quote) {
      return quote === '`' && value.includes('${') ? null : value;
    } else if (character === '\n' && quote !== '`') {
      return null;
    } else {
      value += character;
    }
  }

  return null;
};

const LITERAL_WORDS = new Set(['true', 'false', 'null', 'undefined', 'NaN', 'Infinity']);

const TYPE_PATTERNS: RegExp[] = [
  // const total: number = …
  /\b(?:const|let|var)\s+[A-Za-z_$][\w$]*\s*:\s*[A-Za-z_$[{(]/g,
  // interface Finding { … }
  /\binterface\s+[A-Za-z_$][\w$]*\s*(?:<[^>]*>)?\s*\{/g,
  // type Finding = …
  /\btype\s+[A-Za-z_$][\w$]*\s*(?:<[^>]*>)?\s*=/g,
  // ): Promise<Fix> => or ): string {
  /\)\s*:\s*[A-Za-z_$][\w$.]*(?:<[^>]*>)?(?:\[\])?\s*(?:=>|\{)/g,
  // value as Finding, or as const
  /[\w$)\]]\s+as\s+(?:const\b|[A-Z][\w$]*)/g,
];

/** Parameter lists of arrow functions and function declarations. */
const PARAMETER_PATTERNS: RegExp[] = [
  /\(([^()]*)\)\s*(?::[^=;{}]*)?=>/g,
  /\bfunction\b[^(]*\(([^()]*)\)/g,
];

export const lintScript = (source: string): LintFinding[] => {
  const masked = maskSource(source);
  const lineStarts = [0];
  for (let index = 0; index < source.length; index += 1) {
    if (source[index] === '\n') lineStarts.push(index + 1);
  }
  const lineAt = (offset: number): number => {
    let low = 0;
    let high = lineStarts.length - 1;
    while (low < high) {
      const middle = Math.ceil((low + high) / 2);
      if (lineStarts[middle] <= offset) low = middle;
      else high = middle - 1;
    }

    return low + 1;
  };

  const findings: LintFinding[] = [];
  const seen = new Set<string>();
  const add = (
    rule: LintRule,
    offset: number,
    message: string,
    concept: LintConcept,
    question = false,
  ): void => {
    const line = lineAt(offset);
    const key = `${rule}:${line}:${message}`;
    if (seen.has(key)) return;
    seen.add(key);
    findings.push({ rule, line, message, concept, question });
  };
  const each = (
    pattern: RegExp,
    text: string,
    callback: (match: RegExpExecArray) => void,
  ): void => {
    const global = new RegExp(
      pattern.source,
      pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`,
    );
    for (let match = global.exec(text); match !== null; match = global.exec(text)) {
      callback(match);
      if (match[0] === '') global.lastIndex += 1;
    }
  };

  each(/\.filter\(\s*Boolean\s*\)/g, masked, (match) =>
    add(
      'filter-boolean',
      match.index,
      '.filter(Boolean) drops every null result, and the run still reports success. Was dropping failures intended?',
      'nulls',
      true,
    ),
  );

  each(/(?<![\w$.])agent\s*\(/g, masked, (match) => {
    const open = match.index + match[0].length - 1;
    const close = findClose(masked, open);
    const argumentsText = masked.slice(open + 1, close === -1 ? masked.length : close);
    if (/(?<![\w$])model\s*:/.test(argumentsText)) return;

    add(
      'agent-without-model',
      match.index,
      'agent() with no model: unless an agent definition or CLAUDE_CODE_SUBAGENT_MODEL sets one, these inherit your session model.',
      'models',
    );
  });

  each(/(?<![\w$.])parallel\s*\(/g, masked, (match) =>
    add(
      'parallel-call',
      match.index,
      'parallel() waits for every item before the next stage. Does this stage need every result from the one before, or could it be a pipeline()?',
      'barriers',
      true,
    ),
  );

  const banned: [RegExp, string][] = [
    [/\bDate\s*\.\s*now\s*\(/g, 'Date.now()'],
    [/\bMath\s*\.\s*random\s*\(/g, 'Math.random()'],
    [/\bnew\s+Date\s*\(\s*\)/g, 'new Date() with no arguments'],
    [/(?<![\w$.])import\s*\(/g, 'import()'],
  ];
  for (const [pattern, name] of banned) {
    each(pattern, masked, (match) =>
      add(
        'banned-call',
        match.index,
        `${name} isn’t allowed in a workflow script: it would break resume, so the runtime throws.`,
        'script-rules',
      ),
    );
  }

  const typeMessage =
    'This looks like a type annotation. Workflow scripts are JavaScript, not TypeScript.';
  for (const pattern of TYPE_PATTERNS) {
    each(pattern, masked, (match) => {
      const lineStart = lineStarts[lineAt(match.index) - 1];
      // `import { a as b }` and `export { a as b }` rename, they don't annotate.
      if (/^\s*(?:import|export)\b/.test(masked.slice(lineStart, match.index))) return;
      add('type-annotation', match.index, typeMessage, 'script-rules');
    });
  }
  for (const pattern of PARAMETER_PATTERNS) {
    each(pattern, masked, (match) => {
      const parameters = topLevel(match[1]);
      const annotated = /(?:^|,)\s*(?:\.\.\.)?[A-Za-z_$][\w$]*\??\s*:/.exec(parameters);
      if (annotated) add('type-annotation', match.index, typeMessage, 'script-rules');
    });
  }

  lintMeta(source, masked, add);

  return findings.sort((first, second) => first.line - second.line);
};

type AddFinding = (
  rule: LintRule,
  offset: number,
  message: string,
  concept: LintConcept,
  question?: boolean,
) => void;

const lintMeta = (source: string, masked: string, add: AddFinding): void => {
  const declaration = /(?<![\w$.])meta\s*=\s*\{/.exec(masked);
  if (!declaration) {
    add(
      'meta-missing',
      0,
      'No meta object found. Export one with a name and a description.',
      'meta',
    );
    // Without meta there are no phases, so every phase() title is unmatched.
    lintPhases(source, masked, new Set(), add);
    return;
  }

  const open = declaration.index + declaration[0].length - 1;
  const close = findClose(masked, open);
  const end = close === -1 ? masked.length : close;
  const body = masked.slice(open + 1, end);
  const offset = open + 1;

  if (body.includes('...')) {
    add(
      'meta-not-literal',
      offset + body.indexOf('...'),
      'meta can’t use spreads. It has to be a plain literal.',
      'meta',
    );
  }
  for (let index = body.indexOf('${'); index !== -1; index = body.indexOf('${', index + 2)) {
    add(
      'meta-not-literal',
      offset + index,
      'meta can’t use template interpolation. It has to be a plain literal.',
      'meta',
    );
  }

  const identifier = /(?<![\w$.])[A-Za-z_$][\w$]*/g;
  for (let match = identifier.exec(body); match !== null; match = identifier.exec(body)) {
    const after = body.slice(match.index + match[0].length).match(/^\s*(.)/)?.[1];
    if (after === ':' || LITERAL_WORDS.has(match[0])) continue;
    // The `$` that opens a `${…}`.
    if (match[0] === '$' && body[match.index + 1] === '{') continue;
    // Inside `${…}`, interpolation is already reported.
    if (insideInterpolation(body, match.index)) continue;

    if (after === '(') {
      add(
        'meta-not-literal',
        offset + match.index,
        `meta can’t call ${match[0]}(). It has to be a plain literal.`,
        'meta',
      );
    } else {
      add(
        'meta-not-literal',
        offset + match.index,
        `meta can’t refer to the variable ${match[0]}. It has to be a plain literal.`,
        'meta',
      );
    }
  }

  // Keys at the top level of meta, read from the original source so quoted keys count.
  const keys = new Set<string>();
  const level = topLevel(body);
  let entryStart = 0;
  for (let index = 0; index <= level.length; index += 1) {
    if (index === level.length || level[index] === ',') {
      const entry = source.slice(offset + entryStart, offset + index).trim();
      const key = /^(?:([A-Za-z_$][\w$]*)|(['"])(.*?)\2)\s*(?::|$)/.exec(entry);
      if (key) keys.add(key[1] ?? key[3]);
      entryStart = index + 1;
    }
  }
  for (const field of ['name', 'description']) {
    if (!keys.has(field)) {
      add(
        'meta-missing-field',
        declaration.index,
        `meta has no ${field}. Both name and description are required.`,
        'meta',
      );
    }
  }

  const titles = new Set<string>();
  const phases = /(?<![\w$.])phases\s*:\s*\[/.exec(body);
  if (phases) {
    const arrayOpen = offset + phases.index + phases[0].length - 1;
    const arrayClose = findClose(masked, arrayOpen);
    const arrayMasked = masked.slice(arrayOpen, arrayClose === -1 ? end : arrayClose + 1);

    // `title: 'Scan'` inside an entry, or a bare string entry.
    const title = /(?<![\w$])title\s*:\s*(['"`])/g;
    for (let match = title.exec(arrayMasked); match !== null; match = title.exec(arrayMasked)) {
      const value = readStringLiteral(source, arrayOpen + match.index + match[0].length - 1);
      if (value !== null) titles.add(value);
    }
    const entries = topLevel(arrayMasked.slice(1, -1));
    const bare = /(?:^|,)\s*(['"`])/g;
    for (let match = bare.exec(entries); match !== null; match = bare.exec(entries)) {
      const value = readStringLiteral(source, arrayOpen + 1 + match.index + match[0].length - 1);
      if (value !== null) titles.add(value);
    }
  }

  lintPhases(source, masked, titles, add);
};

const insideInterpolation = (body: string, index: number): boolean => {
  const before = body.slice(0, index);
  const open = before.lastIndexOf('${');
  if (open === -1) return false;

  return findClose(body, open + 1) === -1 || findClose(body, open + 1) > index;
};

const lintPhases = (source: string, masked: string, titles: Set<string>, add: AddFinding): void => {
  const call = /(?<![\w$.])phase\s*\(\s*(['"`])/g;
  for (let match = call.exec(masked); match !== null; match = call.exec(masked)) {
    const quote = match.index + match[0].length - 1;
    const title = readStringLiteral(source, quote);
    if (title === null || titles.has(title)) continue;

    add(
      'phase-not-in-meta',
      match.index,
      `phase('${title}') has no matching title in meta.phases, so it gets its own progress group.`,
      'meta',
    );
  }
};
