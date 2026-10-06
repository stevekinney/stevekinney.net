import type { FieldIssue } from '$lib/experiments/editor-fields/field-issue';
import { readOnlyTools } from '$lib/experiments/tool-rules/claude-tools';
import {
  accessIssues,
  parseToolRule,
  readToolAccess,
  splitToolList,
} from '$lib/experiments/tool-rules/tool-rules';

import {
  asSkillsTable,
  permissiveSettings,
  ruleMatch,
  ruleTarget,
  skillRules,
} from './codex-skills';
import {
  claudeModelAliases,
  codexCheckedVersion,
  effectiveFileName,
  targetLabels,
} from './document';
import type { AgentDocument, FieldPath, Target } from './document';

/**
 * A best-practice check this page runs itself, beside skillset's. `verdict`
 * puts it in the verdict list too; for Claude Code, skillset's own verdict
 * already covers the rules these field-level copies repeat.
 */
export type OwnIssue = FieldIssue & { field: FieldPath; verdict?: boolean };

/** Skillset's naming rule for agents, which Claude Code's own `name` rules fit inside. */
const NAME_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Names that say nothing about the job, after skillset's list for skills. */
const VAGUE_NAMES = new Set([
  'agent',
  'assistant',
  'helper',
  'helpers',
  'utils',
  'utility',
  'tool',
  'tools',
  'misc',
  'stuff',
  'worker',
]);

/** A description shorter than this rarely says both what the agent does and when to use it. */
const SHORT_DESCRIPTION = 60;

/** Splits a list written as a YAML list or as a comma-separated string. */
export const toList = (value: unknown): string[] => splitToolList(value);

/** Code for a value someone typed, with any backtick in it swapped so it can't end the span. */
export const code = (value: string): string => `\`${value.replaceAll('`', "'")}\``;

/** The tool name of a rule such as `Bash(git push *)`. */
const toolName = (rule: string): string => {
  const parsed = parseToolRule(rule);
  return parsed.kind === 'tool' ? parsed.tool : rule;
};

const isClaudeModel = (model: string): boolean =>
  (claudeModelAliases as readonly string[]).includes(model) || model.startsWith('claude-');

const shared = (document: AgentDocument, target: Target): OwnIssue[] => {
  const issues: OwnIssue[] = [];
  const { name, description, body } = document;
  const fileName = effectiveFileName(document);
  const forCodex = target === 'codex';

  if (name.length > 0 && !NAME_PATTERN.test(name)) {
    issues.push({
      field: 'name',
      severity: forCodex ? 'warning' : 'error',
      message: forCodex
        ? 'Use lowercase letters, digits, and single hyphens, such as `code-reviewer`. Claude Code requires that, so the same name works for both tools.'
        : 'Use lowercase letters, digits, and single hyphens, such as `code-reviewer`.',
      verdict: forCodex,
    });
  }
  if (VAGUE_NAMES.has(name)) {
    issues.push({
      field: 'name',
      severity: 'tip',
      message: 'Name the agent for its job, such as `code-reviewer` or `test-writer`.',
    });
  }
  if (forCodex && name.trim().length === 0) {
    issues.push({ field: 'name', severity: 'warning', message: '`name` is empty.', verdict: true });
  }
  if (document.fileName !== null && fileName !== name) {
    issues.push({
      field: 'fileName',
      severity: forCodex ? 'warning' : 'error',
      message: `The name ${name ? code(name) : '(empty)'} doesn’t match the file name ${code(`${fileName}${forCodex ? '.toml' : '.md'}`)}.`,
      verdict: forCodex,
    });
  }

  if (description.trim().length === 0) {
    if (forCodex) {
      issues.push({
        field: 'description',
        severity: 'warning',
        message: '`description` is empty.',
        verdict: true,
      });
    }
  } else if (!forCodex && description.trim().length < SHORT_DESCRIPTION) {
    issues.push({
      field: 'description',
      severity: 'tip',
      message:
        'Claude Code reads the description to decide when to delegate. Say what the agent does, when to use it, and what it isn’t for.',
    });
  }
  if (!forCodex && /\balways use\b/i.test(description)) {
    issues.push({
      field: 'description',
      severity: 'tip',
      message:
        'Avoid “always use”: when several agents say it, routing becomes a contest between instructions.',
    });
  }

  if (body.trim().length === 0) {
    issues.push({
      field: 'body',
      severity: 'warning',
      message: forCodex
        ? '`developer_instructions` is empty. It’s everything the agent is told about its job.'
        : 'The body is empty. It’s the agent’s system prompt.',
      verdict: forCodex,
    });
  }

  return issues;
};

const claudeChecks = (document: AgentDocument, codexModels: readonly string[]): OwnIssue[] => {
  const issues: OwnIssue[] = [];
  const { claude, model } = document;

  if (codexModels.includes(model) || /^gpt-/.test(model)) {
    issues.push({
      field: 'model',
      severity: 'warning',
      message: `${code(model)} is an OpenAI model. Claude Code runs Claude models.`,
    });
  }

  // The shared tool editor checks each rule and the overlap between the two
  // lists; these are the least-privilege tips on top of that.
  // A list where nothing resolves to a tool stops the agent from launching,
  // so that one belongs in the verdict, not just under the field.
  for (const issue of accessIssues(readToolAccess(claude['tools'], claude['disallowedTools']))) {
    if (issue.severity === 'error') issues.push({ ...issue, field: 'claude.tools', verdict: true });
  }

  const tools = toList(claude['tools']).map(toolName);
  if (tools.length === 0) {
    issues.push({
      field: 'claude.tools',
      severity: 'tip',
      message: `With no \`tools\` listed, the agent gets every tool the main conversation has. List only what it needs; a reviewer needs ${readOnlyTools.map((tool) => `\`${tool}\``).join(', ')}.`,
    });
  }
  if (tools.includes('Bash')) {
    issues.push({
      field: 'claude.tools',
      severity: 'tip',
      message:
        'A shell can write files, so an agent with `Bash` isn’t read-only. Back it with a deny rule in your settings, a `PreToolUse` hook, or the sandbox.',
    });
  }
  if (tools.includes('Agent')) {
    issues.push({
      field: 'claude.tools',
      severity: 'tip',
      message: 'With `Agent` listed, this agent can start subagents of its own.',
    });
  }

  if (claude['permissionMode'] === 'bypassPermissions') {
    issues.push({
      field: 'claude.permissionMode',
      severity: 'warning',
      message: '`bypassPermissions` skips every permission prompt for this agent.',
    });
  }

  return issues;
};

const codexChecks = (document: AgentDocument): OwnIssue[] => {
  const issues: OwnIssue[] = [];
  const { codex, model } = document;

  if (model.length > 0 && isClaudeModel(model)) {
    issues.push({
      field: 'model',
      severity: 'warning',
      message: `${code(model)} is a Claude Code model name, and Codex won’t recognize it. Pick a Codex model, or clear the field to leave \`model\` out of the file.`,
    });
  }
  if (codex['sandbox_mode'] === 'danger-full-access') {
    issues.push({
      field: 'codex.sandbox_mode',
      severity: 'warning',
      message: `\`danger-full-access\` asks for no sandbox. Codex ${codexCheckedVersion} drops \`sandbox_mode\` from an agent file, but the file says something you may not mean.`,
      verdict: true,
    });
  }

  const skills = asSkillsTable(codex['skills']);
  skillRules(skills).forEach((rule, index) => {
    const label = `Skill rule ${index + 1}`;
    if (ruleTarget(rule).trim() === '') {
      issues.push({
        field: 'codex.skills',
        severity: 'warning',
        message: `${label} has no \`${ruleMatch(rule)}\`, so it turns nothing off.`,
        verdict: true,
      });
    }
    if (rule['enabled'] !== false) {
      issues.push({
        field: 'codex.skills',
        severity: 'warning',
        message: `${label} doesn’t set \`enabled = false\`. No effect in an agent file (Codex ${codexCheckedVersion}): only rules that turn a skill off apply.`,
      });
    }
  });
  for (const setting of permissiveSettings(skills)) {
    issues.push({
      field: 'codex.skills',
      severity: 'tip',
      message: `${setting} has no effect in an agent file (Codex ${codexCheckedVersion}). It’s kept so the file writes back unchanged.`,
    });
  }

  return issues;
};

const derivedChecks = (document: AgentDocument, target: Target): OwnIssue[] =>
  document.derived
    .filter((field) => field.startsWith(`${target}.`))
    .map((field) => ({
      field,
      severity: 'tip',
      message: `Copied from ${targetLabels[target === 'claude' ? 'codex' : 'claude']} when you switched. Change it to give ${targetLabels[target]} its own value.`,
    }));

/** Every check this page runs itself for one tool. */
export const ownChecks = (
  document: AgentDocument,
  target: Target,
  { codexModels = [] }: { codexModels?: readonly string[] } = {},
): OwnIssue[] => [
  ...shared(document, target),
  ...(target === 'claude' ? claudeChecks(document, codexModels) : codexChecks(document)),
  ...derivedChecks(document, target),
];
