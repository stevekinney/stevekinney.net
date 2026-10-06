import type { FieldIssue } from '$lib/experiments/editor-fields/field-issue';

import { readBoolean, readList, readText } from './skill-fields';
import type { SkillDocument, Target } from './skill-document';

/**
 * Field-level checks that run as the person types, with no libraries, so they
 * show before the workbench loads. They restate the rules skillset applies to
 * the whole file next to the field each one is about, and add tips skillset
 * doesn't check, from the course lessons on configuring skills.
 */

const NAME_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const VAGUE_NAMES = new Set([
  'helper',
  'helpers',
  'utils',
  'utility',
  'utilities',
  'tool',
  'tools',
  'misc',
  'stuff',
  'data',
  'files',
  'documents',
]);
const WINDOWS_RESERVED_NAME = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;
const POINT_OF_VIEW = /^\s*(i|i'm|i'll|we|you|your)\b/i;
const XML_TAG = /<[^>]+>/;
const SAYS_WHEN =
  /\b(use (it |this )?(when|for|to|if|whenever|after|before)|when(ever)?|if the user|triggers?)\b/i;
const EDITING_TOOLS = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit']);
const DESCRIPTION_LIMIT = 1024;
const LISTING_LIMIT = 1536;

const toolName = (rule: string): string => rule.replace(/\(.*$/, '').trim();

const nameIssues = (name: string, label: string, target: Target): FieldIssue[] => {
  const issues: FieldIssue[] = [];
  if (!name) return issues;

  if (!NAME_PATTERN.test(name)) {
    issues.push({
      severity: 'error',
      message:
        'Use lowercase letters, numbers, and single hyphens between words, such as `release-notes`.',
    });
  }
  if (name.length > 64) {
    issues.push({ severity: 'error', message: `The ${label} is over 64 characters.` });
  }
  if (WINDOWS_RESERVED_NAME.test(name)) {
    issues.push({
      severity: 'warning',
      message: `\`${name}\` is a reserved name on Windows, so the skill can't be installed there.`,
    });
  }
  if (target === 'claude') {
    for (const word of ['anthropic', 'claude']) {
      if (name.includes(word)) {
        issues.push({
          severity: 'warning',
          message: `Claude's platform rejects names containing \`${word}\`.`,
        });
      }
    }
  }

  return issues;
};

/** Issues keyed by field key, plus `directory` for the folder name and `body`. */
export const checkFields = (skill: SkillDocument, target: Target): Record<string, FieldIssue[]> => {
  const issues: Record<string, FieldIssue[]> = {};
  const add = (key: string, issue: FieldIssue): void => {
    (issues[key] ??= []).push(issue);
  };

  const { frontmatter } = skill;
  const name = readText(frontmatter.name).trim();
  const description = readText(frontmatter.description);
  const whenToUse = readText(frontmatter.when_to_use);
  const directory = skill.directoryName ?? '';

  // Name and folder.
  for (const issue of nameIssues(name, 'name', target)) add('name', issue);
  if (VAGUE_NAMES.has(name)) {
    add('name', {
      severity: 'warning',
      message: 'That name is too vague to pick out. Name the skill for what it does.',
    });
  }
  if (name && directory && name !== directory) {
    add('name', {
      severity: 'error',
      message: `It has to match the folder name, \`${directory}\`.`,
    });
  }
  if (!name) {
    for (const issue of nameIssues(directory, 'folder name', target)) add('directory', issue);
  }

  // Description.
  if (description.trim() === '' && target === 'claude') {
    add('description', {
      severity: 'warning',
      message: 'Claude Code decides when to use the skill from this.',
    });
  }
  if (description.length > DESCRIPTION_LIMIT) {
    add('description', {
      severity: 'error',
      message: `Over the ${DESCRIPTION_LIMIT.toLocaleString('en-US')}-character limit.`,
    });
  }
  if (POINT_OF_VIEW.test(description)) {
    add('description', {
      severity: 'warning',
      message:
        'Write it in the third person, such as “Drafts release notes…”, not as I, we, or you.',
    });
  }
  if (target === 'claude' && XML_TAG.test(description)) {
    add('description', {
      severity: 'error',
      message: 'Claude’s platform doesn’t allow XML tags in the description.',
    });
  }
  if (description.trim() !== '' && !SAYS_WHEN.test(description) && whenToUse.trim() === '') {
    add('description', {
      severity: 'tip',
      message:
        'Say when to use it, such as “Use when preparing a release.” The agent decides from the description alone, before it reads the body.',
    });
  }

  const metadata = frontmatter.metadata;
  if (typeof metadata === 'object' && metadata !== null && !Array.isArray(metadata)) {
    for (const [key, value] of Object.entries(metadata)) {
      if (typeof value === 'string') continue;
      add(key === 'short-description' ? 'metadata.short-description' : 'metadata', {
        severity: 'warning',
        message: `\`metadata.${key}\` should be a string. The standard maps strings to strings.`,
      });
    }
  }

  if (target === 'codex') return issues;

  // Everything below is Claude Code only.
  if (description.length + whenToUse.length > LISTING_LIMIT) {
    add('when_to_use', {
      severity: 'warning',
      message: `With \`description\` it's over ${LISTING_LIMIT.toLocaleString('en-US')} characters, so Claude Code truncates it in the skill listing.`,
    });
  }

  const declared = readList(frontmatter.arguments, 'words');
  const usesArguments = /\$(ARGUMENTS\b|\d)/.test(skill.body);
  if (declared.length > 0) {
    const named = declared.some((argument) =>
      new RegExp(`\\$${argument.replace(/[^\w-]/g, '')}\\b`).test(skill.body),
    );
    if (!usesArguments && !named) {
      add('arguments', {
        severity: 'warning',
        message:
          'The body never uses `$ARGUMENTS` or a named input, so whatever is typed after the name is appended to the end of the body.',
      });
    }
  }

  const userInvocable = readBoolean(frontmatter['user-invocable']);
  const modelDisabled = readBoolean(frontmatter['disable-model-invocation']);
  if (
    (declared.length > 0 || usesArguments) &&
    readText(frontmatter['argument-hint']).trim() === '' &&
    userInvocable !== 'false'
  ) {
    add('argument-hint', {
      severity: 'tip',
      message: 'The skill takes arguments. A hint shows what to type after its name.',
    });
  }

  if (modelDisabled === 'true' && userInvocable === 'false') {
    const message =
      'With `disable-model-invocation: true` and `user-invocable: false`, nothing can run the skill.';
    add('disable-model-invocation', { severity: 'warning', message });
    add('user-invocable', { severity: 'warning', message });
  }

  // Each rule's own problems, such as unscoped `Bash`, show beside it in the
  // rule editor; this is the one that needs both lists.
  const allowed = readList(frontmatter['allowed-tools'], 'tools');
  const removed = new Set(readList(frontmatter['disallowed-tools'], 'tools').map(toolName));
  for (const rule of allowed) {
    if (removed.has(toolName(rule))) {
      add('allowed-tools', {
        severity: 'warning',
        message: `\`${toolName(rule)}\` is also removed while the skill runs, so pre-approving \`${rule}\` does nothing.`,
      });
    }
  }

  const context = readText(frontmatter.context);
  const forks = context === 'fork';
  if (readText(frontmatter.agent).trim() !== '' && !forks) {
    add('agent', {
      severity: 'warning',
      message: 'Only applies with `context: fork`, so Claude Code ignores it here.',
    });
  }

  const background = readBoolean(frontmatter.background);
  if (background !== '' && !forks) {
    add('background', {
      severity: 'tip',
      message: 'This sets how a fork runs, so it does nothing without `context: fork`.',
    });
  }
  if (
    forks &&
    background !== 'false' &&
    allowed.some((rule) => EDITING_TOOLS.has(toolName(rule)))
  ) {
    add('background', {
      severity: 'tip',
      message:
        'The skill can edit files, and a background fork’s edits land outside `/rewind` checkpoints. Set this to `false` if you want to undo them.',
    });
  }

  if (readText(frontmatter.model).trim() !== '' && !forks) {
    add('model', {
      severity: 'tip',
      message:
        'Without `context: fork` this switches your conversation’s model, which costs a prompt-cache miss every time the skill runs.',
    });
  }
  if (readText(frontmatter.effort).trim() !== '' && !forks) {
    add('effort', {
      severity: 'tip',
      message:
        'Without `context: fork` this changes your conversation’s effort, which can cost a prompt-cache miss every time the skill runs.',
    });
  }

  return issues;
};
