<script lang="ts">
  import { ChevronRight } from '@lucide/svelte';

  import CodeText from '../editor-fields/code-text.svelte';
  import type { FieldIssue } from '../editor-fields/field-issue';
  import ListField from '../editor-fields/list-field.svelte';

  import { toolGroups } from './claude-tools';
  import type { ClaudeTool } from './claude-tools';
  import {
    accessIssues,
    accessPresets,
    agentRestriction,
    canUseTool,
    isLastTool,
    extraRules,
    ruleIssues,
    setAccessMode,
    setAgentRestriction,
    setToolUse,
    withExtraRules,
  } from './tool-rules';
  import type { ToolAccess } from './tool-rules';

  type Props = {
    id: string;
    access: ToolAccess;
    onChange: (access: ToolAccess) => void;
    /**
     * Whether there's an allowlist to edit. A subagent has `tools`; a skill only
     * has `disallowed-tools`, so it always inherits.
     */
    allowList?: boolean;
    /** The frontmatter keys, shown in the summary of what gets written. */
    allowedKey?: string;
    blockedKey: string;
    /** What a checked box means, such as "The agent can use". */
    checkedMeaning: string;
    /** Issues from the schema for either key. */
    issues?: readonly FieldIssue[];
    /** Subagent types to suggest for `Agent(...)`. */
    agentSuggestions?: readonly string[];
    /**
     * Tools that can't be taken away here, each with the reason shown beside
     * it, such as `EndConversation` in a skill's `disallowed-tools`.
     */
    locked?: Readonly<Record<string, string>>;
    disabled?: boolean;
  };

  const {
    id,
    access,
    onChange,
    allowList = true,
    allowedKey = 'tools',
    blockedKey,
    checkedMeaning,
    issues = [],
    agentSuggestions = [],
    locked = {},
    disabled = false,
  }: Props = $props();

  const dedupe = (list: FieldIssue[]): FieldIssue[] =>
    list.filter(
      (issue, index) =>
        list.findIndex(
          (other) => other.severity === issue.severity && other.message === issue.message,
        ) === index,
    );

  const listing = $derived(allowList && access.mode === 'only');
  const restriction = $derived(listing ? agentRestriction(access) : null);
  const canStartAgents = $derived(listing && canUseTool(access, 'Agent'));

  // The page can pass in an issue this editor also finds, so show each once.
  const allIssues = $derived(
    dedupe([
      ...issues,
      ...accessIssues(access),
      ...(listing ? access.allowed.flatMap((rule) => ruleIssues(rule, 'allowlist')) : []),
      ...access.blocked.flatMap((rule) => ruleIssues(rule, 'remove')),
      ...access.blocked
        .filter((rule) => locked[rule] !== undefined)
        .map((rule): FieldIssue => ({ severity: 'warning', message: locked[rule] ?? '' })),
    ]),
  );

  const commonGroups = $derived(
    toolGroups
      .map((group) => ({ ...group, tools: group.tools.filter((tool) => tool.common) }))
      .filter((group) => group.tools.length > 0),
  );
  const moreTools = $derived(toolGroups.flatMap((group) => group.tools.filter((t) => !t.common)));
  const moreInUse = $derived(moreTools.filter((tool) => canUseTool(access, tool.name)).length);

  const activePreset = $derived(
    accessPresets.find(
      (preset) =>
        preset.access.mode === access.mode &&
        [...preset.access.allowed].sort().join() === [...access.allowed].sort().join() &&
        [...preset.access.blocked].sort().join() === [...access.blocked].sort().join(),
    )?.id ?? null,
  );

  const written = $derived.by(() => {
    const lines: string[] = [];
    if (listing) lines.push(`${allowedKey}: ${access.allowed.join(', ') || '(none)'}`);
    if (access.blocked.length > 0) lines.push(`${blockedKey}: ${access.blocked.join(', ')}`);
    return lines;
  });

  const severityClasses: Record<FieldIssue['severity'], string> = {
    error: 'text-red-700 dark:text-red-400',
    warning: 'text-amber-800 dark:text-amber-300',
    tip: 'text-slate-600 dark:text-slate-300',
  };
  const severityLabels: Record<FieldIssue['severity'], string> = {
    error: 'Error',
    warning: 'Warning',
    tip: 'Tip',
  };

  const toggleClasses =
    'flex min-w-0 cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 hover:bg-slate-50 has-[:disabled]:cursor-not-allowed has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary-600 dark:hover:bg-slate-800/60';
</script>

{#snippet toolToggle(tool: ClaudeTool)}
  {@const reason =
    (canUseTool(access, tool.name) ? locked[tool.name] : undefined) ??
    (isLastTool(access, tool.name)
      ? 'The last tool stays on: Claude Code won’t launch a subagent with none.'
      : null)}
  <label class={toggleClasses}>
    <input
      type="checkbox"
      checked={canUseTool(access, tool.name)}
      disabled={disabled || reason !== null}
      aria-describedby={reason ? `${id}-${tool.name}-reason` : undefined}
      onchange={(event) => onChange(setToolUse(access, tool.name, event.currentTarget.checked))}
      class="accent-primary-600 mt-1 size-4 flex-none"
    />
    <span class="min-w-0">
      <code class="font-mono text-sm text-slate-900 dark:text-white">{tool.name}</code>
      <span class="block text-xs text-slate-600 dark:text-slate-300">{tool.summary}</span>
      {#if reason}
        <span id="{id}-{tool.name}-reason" class="block text-xs text-amber-800 dark:text-amber-300">
          <CodeText text={reason} />
        </span>
      {/if}
    </span>
  </label>
{/snippet}

<div class="space-y-4" role="group" aria-labelledby="{id}-heading">
  {#if allowList}
    <div class="space-y-2">
      <p class="text-sm font-semibold text-slate-800 dark:text-slate-100">Start from</p>
      <div class="flex flex-wrap gap-2">
        {#each accessPresets as preset (preset.id)}
          <button
            type="button"
            {disabled}
            aria-pressed={activePreset === preset.id}
            title={preset.description}
            onclick={() =>
              onChange({
                mode: preset.access.mode,
                allowed: [...preset.access.allowed],
                blocked: [...preset.access.blocked],
              })}
            class="focus-visible:outline-primary-600 cursor-pointer rounded-md border px-3 py-1.5 text-sm font-semibold focus-visible:outline-2 disabled:cursor-not-allowed disabled:opacity-60 {activePreset ===
            preset.id
              ? 'border-primary-600 bg-primary-600 dark:bg-primary-500 dark:border-primary-500 text-white dark:text-slate-950'
              : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700'}"
          >
            {preset.label}
          </button>
        {/each}
      </div>
    </div>

    <fieldset class="space-y-2">
      <legend class="text-sm font-semibold text-slate-800 dark:text-slate-100">
        Which tools it gets
      </legend>
      <label
        class="flex cursor-pointer items-start gap-2 text-sm text-slate-800 dark:text-slate-100"
      >
        <input
          type="radio"
          name="{id}-mode"
          checked={access.mode === 'inherit'}
          {disabled}
          onchange={() => onChange(setAccessMode(access, 'inherit'))}
          class="accent-primary-600 mt-0.5 size-4 flex-none"
        />
        <span>
          Every tool the session has, minus the ones you uncheck
          <span class="block text-slate-600 dark:text-slate-300">
            <CodeText text={`Leaves out \`${allowedKey}\`, so it also inherits MCP tools.`} />
          </span>
        </span>
      </label>
      <label
        class="flex cursor-pointer items-start gap-2 text-sm text-slate-800 dark:text-slate-100"
      >
        <input
          type="radio"
          name="{id}-mode"
          checked={access.mode === 'only'}
          {disabled}
          onchange={() => onChange(setAccessMode(access, 'only'))}
          class="accent-primary-600 mt-0.5 size-4 flex-none"
        />
        <span>
          Only the tools you check
          <span class="block text-slate-600 dark:text-slate-300">
            <CodeText
              text={`Writes them to \`${allowedKey}\`. Anything unlisted, including MCP tools, is off.`}
            />
          </span>
        </span>
      </label>
    </fieldset>
  {/if}

  <div class="space-y-3">
    <p id="{id}-heading" class="text-sm text-slate-600 dark:text-slate-300">
      {checkedMeaning}
    </p>
    {#each commonGroups as group (group.title)}
      <div class="space-y-1">
        <p class="text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
          {group.title}
        </p>
        <div class="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
          {#each group.tools as tool (tool.name)}
            {@render toolToggle(tool)}
          {/each}
        </div>
      </div>
    {/each}

    <details class="group rounded-md border border-slate-200 dark:border-slate-700">
      <summary
        class="focus-visible:outline-primary-600 flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-2 text-sm font-semibold text-slate-800 focus-visible:outline-2 dark:text-slate-100"
      >
        <ChevronRight
          aria-hidden="true"
          class="size-4 flex-none transition-transform group-open:rotate-90"
        />
        More tools
        <span class="font-normal text-slate-500 dark:text-slate-400">
          {moreInUse} of {moreTools.length} on
        </span>
      </summary>
      <div
        class="grid gap-1 border-t border-slate-200 p-2 sm:grid-cols-2 lg:grid-cols-3 dark:border-slate-700"
      >
        {#each moreTools as tool (tool.name)}
          {@render toolToggle(tool)}
        {/each}
      </div>
    </details>
  </div>

  {#if canStartAgents}
    <ListField
      id="{id}-agents"
      label="Subagents it can start"
      values={restriction ?? []}
      onChange={(agents) => onChange(setAgentRestriction(access, agents))}
      hint="Leave it empty for any. Written as `Agent(a, b)`, which Claude Code only enforces when this agent runs the whole session with `--agent`."
      placeholder="Explore"
      suggestions={agentSuggestions}
      {disabled}
    />
  {/if}

  <div class="grid gap-4 sm:grid-cols-2">
    {#if listing}
      <ListField
        id="{id}-extra-allowed"
        label="Also allow"
        values={extraRules(access.allowed)}
        onChange={(extras) =>
          onChange({ ...access, allowed: withExtraRules(access.allowed, extras) })}
        hint="MCP tools: `mcp__server` for every tool a server supplies, or `mcp__server__tool` for one."
        placeholder="mcp__github"
        {disabled}
      />
    {/if}
    <ListField
      id="{id}-extra-blocked"
      label="Also remove"
      values={extraRules(access.blocked)}
      onChange={(extras) =>
        onChange({ ...access, blocked: withExtraRules(access.blocked, extras) })}
      hint="Tool names or patterns, such as `mcp__*` for every MCP tool or `mcp__github__delete_repo` for one."
      placeholder="mcp__*"
      {disabled}
    />
  </div>

  {#if allIssues.length > 0}
    <ul class="space-y-1 text-sm">
      {#each allIssues as issue, index (index)}
        <li class="[overflow-wrap:anywhere] {severityClasses[issue.severity]}">
          <span class="font-semibold">{severityLabels[issue.severity]}:</span>
          <CodeText text={issue.message} />
        </li>
      {/each}
    </ul>
  {/if}

  <div class="rounded-md bg-slate-100 px-3 py-2 text-sm dark:bg-slate-800">
    <p class="font-semibold text-slate-800 dark:text-slate-100">Written as</p>
    {#if written.length > 0}
      {#each written as line (line)}
        <code
          class="block font-mono text-xs [overflow-wrap:anywhere] text-slate-700 dark:text-slate-200"
          >{line}</code
        >
      {/each}
    {:else}
      <p class="text-slate-600 dark:text-slate-300">
        <CodeText
          text={allowList
            ? `Nothing: with no \`${allowedKey}\` or \`${blockedKey}\`, it gets every tool the session has.`
            : `Nothing: no tools are removed while it runs.`}
        />
      </p>
    {/if}
  </div>
</div>
