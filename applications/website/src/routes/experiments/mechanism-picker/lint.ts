import { findRung, rungIds } from './ladder';
import type { RungId } from './ladder';
import { classificationLabels, classifications } from './lint-rules';
import type { Classification, LintRules, RuleClassification } from './lint-rules';

/** How much of a line the rules read. Anything past it is reported, not checked. */
export const MAXIMUM_CHECKED_CHARACTERS = 4000;

/** One line or bullet from the instructions file, with markers stripped. */
export type SourceLine = {
  /** 1-based line number in the file. */
  lineNumber: number;
  text: string;
  kind: 'ordered' | 'bullet' | 'text';
  indent: number;
  /** The nearest heading above the line, if any. */
  heading: string | null;
  /**
   * The line that heading is on, which tells two headings with the same text
   * apart, such as two separate “How to deploy” sections.
   */
  headingLine: number | null;
};

export type RuleMatch = {
  classification: RuleClassification;
  /** The rule that fired, in words, such as "“never” next to a tool-shaped word (“read”)". */
  rule: string;
};

export type LintItem = {
  lineNumber: number;
  text: string;
  primary: Classification;
  /** Every rule that matched, strongest first. The first is the primary. */
  matches: RuleMatch[];
  /** What fired, for the primary classification. */
  rule: string;
  suggestion: string;
  /** The rung the suggestion points to, if any. */
  rung: RungId | null;
  /** Whether the line was longer than the rules read. */
  truncated: boolean;
};

// CommonMark: a fence is a run of three or more backticks or tildes. A backtick fence's
// info string can't contain a backtick, and the closing fence has nothing after it.
const fence = /^\s{0,3}(`{3,}|~{3,})(.*)$/;
const closingFence = /^\s{0,3}(`{3,}|~{3,})[ \t]*$/;
const heading = /^\s{0,3}(#{1,6})(\s+(.*?))?\s*#*\s*$/;
const thematicBreak = /^\s{0,3}([-*_])(\s*\1){2,}\s*$/;
const setextUnderline = /^\s{0,3}(=+|-+)\s*$/;
const orderedMarker = /^(\s*)(\d{1,9})[.)]\s+/;
const bulletMarker = /^(\s*)[-*+]\s+/;
const taskMarker = /^\[[ xX]\]\s+/;
const blockquote = /^\s{0,3}(>\s?)+/;

/**
 * Splits an instructions file into the lines and bullets the rules classify,
 * skipping blank lines, headings, code blocks, HTML comments, front matter, and
 * horizontal rules.
 */
export const splitInstructions = (source: string): SourceLine[] => {
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  const result: SourceLine[] = [];
  let fenceMarker: string | null = null;
  /** How many blockquotes deep the open fence started, since leaving one closes the fence. */
  let fenceDepth = 0;
  let inComment = false;
  let currentHeading: string | null = null;
  let currentHeadingLine: number | null = null;
  let previousBlank = true;
  let previousWasCode = false;
  let previousWasList = false;

  let start = 0;
  if (lines[0]?.trim() === '---') {
    const end = lines.findIndex((line, index) => index > 0 && line.trim() === '---');
    if (end > 0) start = end + 1;
  }

  for (let index = start; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = line.trim();
    const lineNumber = index + 1;
    // A fence inside a blockquote, such as `> ```` … `> ````, is still a fence, so
    // fences are found after the quote markers come off, the same as the line's text.
    const quotes = blockquote.exec(line)?.[0] ?? '';
    const unquoted = line.slice(quotes.length);
    const depth = quotes.split('>').length - 1;

    // CommonMark: a line outside the blockquote a fence opened in, blank or not, ends the
    // blockquote and the fence with it, so the line is read as ordinary text.
    if (fenceMarker !== null && depth < fenceDepth) fenceMarker = null;

    if (fenceMarker !== null) {
      // Only the same character, at least as many of it as opened the block, closes it.
      const closing = closingFence.exec(unquoted)?.[1];
      if (closing && closing[0] === fenceMarker[0] && closing.length >= fenceMarker.length) {
        fenceMarker = null;
      }
      continue;
    }

    const fenceMatch = fence.exec(unquoted);
    if (fenceMatch && !(fenceMatch[1][0] === '`' && fenceMatch[2].includes('`'))) {
      fenceMarker = fenceMatch[1];
      fenceDepth = depth;
      previousBlank = false;
      continue;
    }

    if (inComment) {
      if (trimmed.includes('-->')) inComment = false;
      continue;
    }

    if (trimmed.startsWith('<!--')) {
      if (!trimmed.includes('-->')) inComment = true;
      continue;
    }

    if (trimmed === '') {
      previousBlank = true;
      continue;
    }

    // An indented code block starts after a blank line, outside a list.
    const indentedCode = /^( {4}|\t)/.test(line) && !previousWasList;
    if (indentedCode && (previousBlank || previousWasCode)) {
      previousWasCode = true;
      previousBlank = false;
      continue;
    }
    previousWasCode = false;

    const headingMatch = heading.exec(line);
    if (headingMatch) {
      currentHeading = headingMatch[3]?.trim() ?? '';
      currentHeadingLine = lineNumber;
      previousBlank = false;
      previousWasList = false;
      continue;
    }

    if (thematicBreak.test(line) || (setextUnderline.test(line) && !previousBlank)) {
      // A setext underline turns the line above it into a heading.
      const last = result.at(-1);
      if (setextUnderline.test(line) && last && last.lineNumber === lineNumber - 1) {
        result.pop();
        currentHeading = last.text;
        currentHeadingLine = last.lineNumber;
      }
      previousBlank = false;
      previousWasList = false;
      continue;
    }

    let text = unquoted;
    let kind: SourceLine['kind'] = 'text';
    let indent = text.length - text.trimStart().length;

    const ordered = orderedMarker.exec(text);
    const bullet = bulletMarker.exec(text);
    if (ordered) {
      kind = 'ordered';
      indent = ordered[1].length;
      text = text.slice(ordered[0].length);
    } else if (bullet) {
      kind = 'bullet';
      indent = bullet[1].length;
      text = text.slice(bullet[0].length);
    }
    text = text.replace(taskMarker, '').trim();

    previousBlank = false;
    previousWasList = kind !== 'text' || (previousWasList && indent > 0);
    if (text === '') continue;

    result.push({
      lineNumber,
      text,
      kind,
      indent,
      heading: currentHeading,
      headingLine: currentHeadingLine,
    });
  }

  return result;
};

const escapeRegExp = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Finds the first word or phrase from the list that appears as a whole word. */
const findWord = (text: string, words: readonly string[]): string | null => {
  for (const word of words) {
    const trimmed = word.trim();
    if (trimmed === '') continue;

    const pattern = new RegExp(
      `(?<![\\p{L}\\p{N}_])${escapeRegExp(trimmed)}(?![\\p{L}\\p{N}_])`,
      'iu',
    );
    if (pattern.test(text)) return trimmed;
  }

  return null;
};

const codeSpan = /`[^`]+`/;
const pathLike =
  /(?:^|[\s(`"'])(\.{0,2}\/?[\w@.-]+\/[\w@./*-]*|\.[a-z][\w-]*(?:\.[\w*-]+)*)(?=$|[\s`.,;:)"'])/i;
const scriptCommand =
  /\b(npm|pnpm|yarn|bun|bunx|npx|make|cargo|pytest|uv|go|deno)\s+(run\s+)?[\w:.-]+/i;
const markdownLink = /\[[^\]]+\]\([^)]+\)/;
const url = /\bhttps?:\/\/\S+/i;
const documentPath = /[\w./-]+\.(md|mdx|txt|rst|adoc)\b/i;
const digit = /\d/;
const isoDate = /\b\d{4}-\d{2}-\d{2}\b/;
const writtenDate =
  /\b(jan(uary)?|feb(ruary)?|mar(ch)?|apr(il)?|may|june?|july?|aug(ust)?|sep(tember)?|oct(ober)?|nov(ember)?|dec(ember)?)\s+\d{1,2}(st|nd|rd|th)?,?\s+\d{4}\b/i;
const ticket = /\b([A-Z][A-Z0-9]{1,9})-(\d{2,})\b/;
const notTickets = new Set(['ISO', 'UTF', 'RFC', 'SHA', 'ES', 'ECMA', 'CVE']);
const commitHash = /\b(?=[0-9a-f]{7,40}\b)(?=[0-9a-f]*\d)(?=[0-9a-f]*[a-f])[0-9a-f]{7,40}\b/;

// Function words that are common in English, and in the languages most often
// mistaken for it. Words both share, such as "a" or "no", are left out.
const englishWords = new Set(
  'the and or to of in on for with from by is are be this that it after before when if never do not all every each run use files file code always must should your you any'.split(
    ' ',
  ),
);
const otherLanguageWords = new Set(
  'el la los las del que por para con una nunca siempre archivos ejecuta le les des du et est une pour avec jamais toujours fichiers ne pas der die das und ist nicht mit für ein eine niemals immer dateien nach jeder os não com uma arquivos il di che mai sempre ogni'.split(
    ' ',
  ),
);

/** Why a line looks like it isn't English, or `null` when it does. */
export const notEnglishReason = (text: string): string | null => {
  const letters = text.match(/\p{L}/gu) ?? [];
  const latin = text.match(/\p{Script=Latin}/gu) ?? [];
  if (letters.length >= 4 && latin.length / letters.length < 0.5) {
    return 'Most of the letters aren’t in the Latin alphabet, so it’s probably not English.';
  }

  const words =
    text
      .replace(/`[^`]*`/g, ' ')
      .toLowerCase()
      .match(/\p{L}+/gu) ?? [];
  const english = words.filter((word) => englishWords.has(word)).length;
  const other = words.filter((word) => otherLanguageWords.has(word)).length;

  return other >= 2 && other > english
    ? 'It has more common words from other languages than from English.'
    : null;
};

const strength = (classification: RuleClassification): number =>
  classifications.indexOf(classification);

const strongestRung = (candidates: RungId[]): RungId | null =>
  candidates.reduce<RungId | null>(
    (strongest, rung) =>
      strongest === null || rungIds.indexOf(rung) > rungIds.indexOf(strongest) ? rung : strongest,
    null,
  );

type Context = {
  /** Lines that are part of a procedure longer than the threshold, with why. */
  procedures: Map<number, string>;
};

/** Finds the runs of list items that read as multi-step procedures. */
const findProcedures = (lines: readonly SourceLine[], rules: LintRules): Map<number, string> => {
  const procedures = new Map<number, string>();
  const { cues, longerThan } = rules.skillCandidate;

  // Runs of consecutive list items, with the text line or heading that introduces them.
  let index = 0;
  while (index < lines.length) {
    if (lines[index].kind === 'text') {
      index += 1;
      continue;
    }

    const first = index;
    while (
      index < lines.length &&
      (lines[index].kind !== 'text' || lines[index].indent > 0) &&
      lines[index].headingLine === lines[first].headingLine
    ) {
      index += 1;
    }

    const run = lines.slice(first, index);
    const ordered = run.filter((line) => line.kind === 'ordered' && line.indent === 0).length;
    const intro = first > 0 ? lines[first - 1] : null;
    const introCue =
      intro && intro.kind === 'text' && intro.headingLine === run[0].headingLine
        ? findWord(intro.text, cues)
        : null;
    const headingCue = run[0].heading ? findWord(run[0].heading, cues) : null;
    const length = run.length + (introCue ? 1 : 0);

    if (length > longerThan && (ordered > longerThan || introCue || headingCue)) {
      const why = introCue
        ? `Part of a ${length}-line procedure introduced with “${introCue}”, longer than ${longerThan} lines.`
        : headingCue
          ? `Part of a ${length}-line procedure under a heading with “${headingCue}”, longer than ${longerThan} lines.`
          : `Part of ${ordered} numbered steps, longer than ${longerThan} lines.`;
      for (const line of run) procedures.set(line.lineNumber, why);
      if (introCue && intro) procedures.set(intro.lineNumber, why);
    }
  }

  // A section whose heading names a procedure, such as "How to investigate a failed test".
  // Sections are keyed by the heading's line, so two headings with the same text stay apart.
  const sections = new Map<number, SourceLine[]>();
  for (const line of lines) {
    if (!line.heading || line.headingLine === null) continue;
    const section = sections.get(line.headingLine) ?? [];
    section.push(line);
    sections.set(line.headingLine, section);
  }
  for (const section of sections.values()) {
    const title = section[0].heading ?? '';
    const cue = findWord(title, cues);
    if (!cue || section.length <= longerThan) continue;

    for (const line of section) {
      if (!procedures.has(line.lineNumber)) {
        procedures.set(
          line.lineNumber,
          `Part of a ${section.length}-line section under “${title}”, which names a procedure.`,
        );
      }
    }
  }

  return procedures;
};

type Classified = { matches: RuleMatch[]; mustHoldRung: RungId | null };

const classifyText = (
  text: string,
  lineNumber: number,
  rules: LintRules,
  context: Context,
): Classified => {
  const matches: RuleMatch[] = [];
  const hasCode = codeSpan.test(text);
  const hasPath = pathLike.test(text);
  const hasScript = scriptCommand.test(text);
  let mustHoldRung: RungId | null = null;

  if (rules.mustHold.enabled) {
    const absolute = findWord(text, rules.mustHold.absolutes);
    if (absolute) {
      const groups = rules.mustHold.objects
        .map((group) => ({ group, word: findWord(text, group.words) }))
        .filter((entry) => entry.word !== null);
      const shaped = groups.length > 0 || hasCode || hasPath;

      if (shaped) {
        mustHoldRung = strongestRung(groups.map((entry) => entry.group.rung)) ?? 'permission';
        const objects =
          groups.length > 0
            ? groups.map((entry) => `${entry.group.label} (“${entry.word}”)`).join(', ')
            : 'a command or path';
        matches.push({
          classification: 'must-hold',
          rule: `Absolute language (“${absolute}”) about a tool-shaped object: ${objects}.`,
        });
      }
    }
  }

  if (rules.deterministic.enabled) {
    const tool = findWord(text, rules.deterministic.tools);
    const frequency = tool ? findWord(text, rules.deterministic.frequencies) : null;
    if (tool && frequency) {
      matches.push({
        classification: 'deterministic',
        rule: `Formatting or linting (“${tool}”) on every edit (“${frequency}”).`,
      });
    }
  }

  if (rules.staleProne.enabled) {
    const phrase = findWord(text, rules.staleProne.phrases);
    const prefix = rules.staleProne.branchPrefixes.find(
      (entry) =>
        entry.trim() !== '' &&
        new RegExp(`(?<![\\w/])${escapeRegExp(entry.trim())}[\\w.-]+`, 'i').test(text),
    );
    const ticketMatch = ticket.exec(text);
    const ticketId = ticketMatch && !notTickets.has(ticketMatch[1]) ? ticketMatch[0] : null;
    const commit = commitHash.exec(text)?.[0] ?? null;
    const date = isoDate.exec(text)?.[0] ?? writtenDate.exec(text)?.[0] ?? null;

    const reason = prefix
      ? `a branch name (“${prefix}…”)`
      : ticketId
        ? `a ticket ID (“${ticketId}”)`
        : commit
          ? `a commit (“${commit}”)`
          : date
            ? `a date (“${date}”)`
            : phrase
              ? `a phrase about now (“${phrase}”)`
              : null;
    if (reason) {
      matches.push({ classification: 'stale-prone', rule: `A changing fact: ${reason}.` });
    }
  }

  if (rules.skillCandidate.enabled) {
    const why = context.procedures.get(lineNumber);
    if (why) matches.push({ classification: 'skill-candidate', rule: why });
  }

  if (rules.vague.enabled) {
    const word = findWord(text, rules.vague.words);
    if (word && !hasCode && !hasPath && !hasScript && !digit.test(text)) {
      matches.push({
        classification: 'vague',
        rule: `A virtue word (“${word}”) with no command, path, or checkable condition.`,
      });
    }
  }

  if (rules.pointer.enabled) {
    const word = findWord(text, rules.pointer.words);
    const target = documentPath.exec(text)?.[0] ?? url.exec(text)?.[0] ?? null;
    if (word || target || markdownLink.test(text)) {
      matches.push({
        classification: 'pointer',
        rule: `Refers to documentation (“${target ?? word ?? 'a link'}”).`,
      });
    }
  }

  if (rules.goodFact.enabled) {
    const trigger = findWord(text, rules.goodFact.triggers);
    if (trigger && (hasCode || hasPath || hasScript)) {
      const what = hasCode ? 'a command in code formatting' : hasScript ? 'a script' : 'a path';
      matches.push({
        classification: 'good-fact',
        rule: `Has ${what} and a trigger (“${trigger}”).`,
      });
    }
  }

  matches.sort((first, second) => strength(first.classification) - strength(second.classification));

  return { matches, mustHoldRung };
};

const mustHoldSuggestion = (text: string, rung: RungId): string => {
  if (findWord(text, ['.env'])) {
    return 'Move it to a permission rule: deny `Read(**/.env*)`, and ideally keep the credentials out of the agent’s reach. Likely rung: permission rule.';
  }

  const name = findRung(rung)?.name.toLowerCase() ?? 'permission rule';
  const where: Record<string, string> = {
    permission: 'a permission deny rule, or a `PreToolUse` hook if it needs code to decide',
    hook: 'a hook',
    ci: 'a required CI check and branch protection',
    sandbox: 'the credentials boundary: the OS, sandbox, or network rules',
  };

  return `Move it to ${where[rung] ?? 'a permission rule, hook, CI check, or credentials boundary'}. Likely rung: ${name}.`;
};

const pointerSuggestion = (text: string, rules: LintRules): string =>
  findWord(text, rules.goodFact.triggers)
    ? 'It says when to read it, so keep it.'
    : 'Keep it only if it says when to read it, such as “Before editing billing code, read …”.';

const suggestionFor = (
  classification: Classification,
  text: string,
  rules: LintRules,
  mustHoldRung: RungId | null,
): { suggestion: string; rung: RungId | null } => {
  switch (classification) {
    case 'must-hold': {
      const rung = mustHoldRung ?? 'permission';
      return { suggestion: mustHoldSuggestion(text, rung), rung };
    }
    case 'deterministic':
      return {
        suggestion: 'Hand it to the formatter or a hook, such as `PostToolUse`. Prose only asks.',
        rung: 'hook',
      };
    case 'stale-prone':
      return {
        suggestion:
          'Move it to the task prompt, or have a `SessionStart` bootstrapper look it up each time.',
        rung: 'chat',
      };
    case 'skill-candidate':
      return {
        suggestion: 'Move the procedure to a skill, and keep a one-line pointer here.',
        rung: 'skill',
      };
    case 'vague':
      return {
        suggestion: 'Rewrite it as “When $trigger, do $action, then verify $result”, or delete it.',
        rung: null,
      };
    case 'pointer':
      return { suggestion: pointerSuggestion(text, rules), rung: 'instructions' };
    case 'good-fact':
      return { suggestion: 'Keep it.', rung: 'instructions' };
    case 'unknown':
      return {
        suggestion: 'The rules only read English, so this line is left for you to judge.',
        rung: null,
      };
    case 'no-match':
      return {
        suggestion: 'Keep it if it changes a decision the agent makes. Otherwise, delete it.',
        rung: null,
      };
  }
};

/** Classifies every line and bullet in an instructions file. Pure: the same text and rules give the same result. */
export const lintInstructions = (source: string, rules: LintRules): LintItem[] => {
  const lines = splitInstructions(source);
  const context: Context = { procedures: findProcedures(lines, rules) };

  return lines.map((line) => {
    const truncated = line.text.length > MAXIMUM_CHECKED_CHARACTERS;
    const checked = truncated ? line.text.slice(0, MAXIMUM_CHECKED_CHARACTERS) : line.text;
    const foreign = notEnglishReason(checked);

    if (foreign) {
      return {
        lineNumber: line.lineNumber,
        text: line.text,
        primary: 'unknown',
        matches: [],
        rule: foreign,
        ...suggestionFor('unknown', checked, rules, null),
        truncated,
      };
    }

    const { matches, mustHoldRung } = classifyText(checked, line.lineNumber, rules, context);
    const primary: Classification = matches[0]?.classification ?? 'no-match';

    return {
      lineNumber: line.lineNumber,
      text: line.text,
      primary,
      matches,
      rule: matches[0]?.rule ?? 'None of the rules matched this line.',
      ...suggestionFor(primary, checked, rules, mustHoldRung),
      truncated,
    };
  });
};

export type LintCounts = Record<Classification, number>;

export const countClassifications = (items: readonly LintItem[]): LintCounts => {
  const counts = Object.fromEntries(
    Object.keys(classificationLabels).map((key) => [key, 0]),
  ) as LintCounts;
  for (const item of items) counts[item.primary] += 1;

  return counts;
};

const plural = (count: number, one: string, many: string): string =>
  `${count} ${count === 1 ? one : many}`;

/** The one-sentence summary, such as "5 lines: 1 must-hold rule written as a request, …". */
export const summarize = (items: readonly LintItem[]): string => {
  const counts = countClassifications(items);
  const parts = [
    plural(
      counts['must-hold'],
      'must-hold rule written as a request',
      'must-hold rules written as requests',
    ),
    `${counts.vague} that ${counts.vague === 1 ? 'doesn’t' : 'don’t'} change a decision`,
    plural(counts['skill-candidate'], 'skill candidate', 'skill candidates'),
    plural(counts['good-fact'], 'good fact', 'good facts'),
    `${counts['stale-prone']} stale-prone`,
    `${counts.deterministic} deterministic`,
  ];
  if (counts.pointer > 0) parts.push(plural(counts.pointer, 'pointer', 'pointers'));
  if (counts.unknown > 0) parts.push(`${counts.unknown} unknown`);
  if (counts['no-match'] > 0) parts.push(`${counts['no-match']} with no rule match`);

  return `${plural(items.length, 'line', 'lines')}: ${parts.join(', ')}.`;
};
