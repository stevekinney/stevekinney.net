<script lang="ts">
  import { X } from '@lucide/svelte';

  import CodeText from '../editor-fields/code-text.svelte';
  import type { FieldIssue } from '../editor-fields/field-issue';
  import { controlClasses, labelClasses } from '../editor-fields/field-styles';

  import { claudeTools, findClaudeTool, specifierGuides, toolGroups } from './claude-tools';
  import { formatMcpRule, formatToolRule, ruleIssues } from './tool-rules';

  type Props = {
    id: string;
    rules: readonly string[];
    onChange: (rules: string[]) => void;
    /** Issues from the schema for the whole field. */
    issues?: readonly FieldIssue[];
    disabled?: boolean;
  };

  const { id, rules, onChange, issues = [], disabled = false }: Props = $props();

  const MCP = 'mcp';
  const OTHER = 'other';

  let tool = $state('Bash');
  let specifier = $state('');
  let server = $state('');
  let mcpTool = $state('');
  let other = $state('');

  const family = $derived(findClaudeTool(tool)?.family);
  const guide = $derived(family ? specifierGuides[family] : null);

  const draft = $derived.by(() => {
    if (tool === MCP) return server.trim() ? formatMcpRule(server, mcpTool || null) : '';
    if (tool === OTHER) return other.trim();
    return formatToolRule(tool, family ? specifier : null);
  });

  const draftIssues = $derived(draft ? ruleIssues(draft, 'pre-approve') : []);
  const duplicate = $derived(rules.includes(draft));
  const canAdd = $derived(
    draft !== '' && !duplicate && !draftIssues.some((issue) => issue.severity === 'error'),
  );

  const add = (): void => {
    if (!canAdd) return;
    onChange([...rules, draft]);
    specifier = '';
    mcpTool = '';
    other = '';
  };

  const commonTools = toolGroups.flatMap((group) => group.tools.filter((t) => t.common));
  const moreTools = claudeTools.filter((t) => !t.common);

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
</script>

{#snippet issueList(list: readonly FieldIssue[])}
  {#if list.length > 0}
    <ul class="space-y-1 text-sm">
      {#each list as issue, index (index)}
        <li class="[overflow-wrap:anywhere] {severityClasses[issue.severity]}">
          <span class="font-semibold">{severityLabels[issue.severity]}:</span>
          <CodeText text={issue.message} />
        </li>
      {/each}
    </ul>
  {/if}
{/snippet}

<div class="space-y-4">
  {#if rules.length > 0}
    <ul class="space-y-2" aria-label="Pre-approved rules">
      {#each rules as rule, index (rule)}
        {@const ruleProblems = ruleIssues(rule, 'pre-approve')}
        <li class="space-y-1">
          <div
            class="flex max-w-full items-center gap-1 rounded-md bg-slate-100 py-1 pr-1 pl-2 dark:bg-slate-700"
          >
            <code
              class="min-w-0 flex-1 font-mono text-sm [overflow-wrap:anywhere] text-slate-900 dark:text-white"
              >{rule}</code
            >
            <button
              type="button"
              {disabled}
              aria-label="Remove {rule}"
              onclick={() => onChange(rules.filter((_, position) => position !== index))}
              class="focus-visible:outline-primary-600 shrink-0 cursor-pointer rounded p-1 text-slate-500 hover:bg-slate-200 hover:text-slate-900 focus-visible:outline-2 disabled:cursor-not-allowed dark:text-slate-300 dark:hover:bg-slate-600 dark:hover:text-white"
            >
              <X class="size-3.5" aria-hidden="true" />
            </button>
          </div>
          {@render issueList(ruleProblems)}
        </li>
      {/each}
    </ul>
  {:else}
    <p class="text-sm text-slate-600 dark:text-slate-300">
      Nothing is pre-approved, so every tool that normally asks still asks.
    </p>
  {/if}

  <form
    class="space-y-3 rounded-md border border-slate-200 p-3 dark:border-slate-700"
    aria-label="Add a rule"
    onsubmit={(event) => {
      event.preventDefault();
      add();
    }}
  >
    <div class="grid gap-3 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
      <div class="space-y-1.5">
        <label for="{id}-tool" class={labelClasses}>Tool</label>
        <select id="{id}-tool" bind:value={tool} {disabled} class="{controlClasses} font-mono">
          <optgroup label="Common">
            {#each commonTools as option (option.name)}
              <option value={option.name}>{option.name}</option>
            {/each}
          </optgroup>
          <optgroup label="MCP and other">
            <option value={MCP}>An MCP tool</option>
            <option value={OTHER}>Type a rule</option>
          </optgroup>
          <optgroup label="More tools">
            {#each moreTools as option (option.name)}
              <option value={option.name}>{option.name}</option>
            {/each}
          </optgroup>
        </select>
      </div>

      {#if tool === MCP}
        <div class="grid gap-3 sm:grid-cols-2">
          <div class="space-y-1.5">
            <label for="{id}-server" class={labelClasses}>Server</label>
            <input
              id="{id}-server"
              bind:value={server}
              {disabled}
              placeholder="github"
              autocomplete="off"
              spellcheck="false"
              class="{controlClasses} font-mono"
            />
          </div>
          <div class="space-y-1.5">
            <label for="{id}-mcp-tool" class={labelClasses}>Tool (blank for all)</label>
            <input
              id="{id}-mcp-tool"
              bind:value={mcpTool}
              {disabled}
              placeholder="create_issue"
              autocomplete="off"
              spellcheck="false"
              class="{controlClasses} font-mono"
            />
          </div>
        </div>
      {:else if tool === OTHER}
        <div class="space-y-1.5">
          <label for="{id}-other" class={labelClasses}>Rule</label>
          <input
            id="{id}-other"
            bind:value={other}
            {disabled}
            placeholder="Tool(specifier)"
            autocomplete="off"
            spellcheck="false"
            class="{controlClasses} font-mono"
          />
        </div>
      {:else if guide}
        <div class="space-y-1.5">
          <label for="{id}-specifier" class={labelClasses}>
            Scope <span class="font-normal text-slate-500 dark:text-slate-400">(blank for any)</span
            >
          </label>
          <input
            id="{id}-specifier"
            bind:value={specifier}
            {disabled}
            placeholder={guide.placeholder}
            aria-describedby="{id}-specifier-hint"
            autocomplete="off"
            spellcheck="false"
            class="{controlClasses} font-mono"
          />
        </div>
      {:else}
        <p class="self-end text-sm text-slate-600 dark:text-slate-300">
          <CodeText text={`\`${tool}\` takes no scope; it's pre-approved whole.`} />
        </p>
      {/if}
    </div>

    {#if guide && tool !== MCP && tool !== OTHER}
      <p id="{id}-specifier-hint" class="text-sm text-slate-600 dark:text-slate-300">
        <CodeText text={guide.hint} />
        {#each guide.examples as example (example)}
          <button
            type="button"
            {disabled}
            onclick={() => (specifier = example)}
            class="text-primary-700 dark:text-primary-300 focus-visible:outline-primary-600 ml-1 cursor-pointer font-mono text-xs underline underline-offset-2 focus-visible:outline-2"
            >{example}</button
          >
        {/each}
      </p>
    {/if}

    <div class="flex flex-wrap items-center gap-3">
      <button
        type="submit"
        disabled={disabled || !canAdd}
        class="bg-primary-600 dark:bg-primary-500 focus-visible:outline-primary-600 cursor-pointer rounded-md px-3 py-1.5 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-950"
      >
        Add rule
      </button>
      {#if draft}
        <span class="min-w-0 text-sm text-slate-600 dark:text-slate-300">
          {duplicate ? 'Already listed:' : 'Adds'}
          <code class="font-mono [overflow-wrap:anywhere] text-slate-900 dark:text-white"
            >{draft}</code
          >
        </span>
      {/if}
    </div>
    {@render issueList(draftIssues)}
  </form>

  {@render issueList(issues)}
</div>
