<script lang="ts">
  import { Plus, X } from '@lucide/svelte';

  import CodeText from '$lib/experiments/editor-fields/code-text.svelte';
  import FieldShell from '$lib/experiments/editor-fields/field-shell.svelte';
  import type { FieldIssue } from '$lib/experiments/editor-fields/field-issue';
  import { controlClasses } from '$lib/experiments/editor-fields/field-styles';

  import {
    asSkillsTable,
    bundledOff,
    disableRule,
    instructionsOff,
    otherSkillKeys,
    ruleMatch,
    ruleTarget,
    setBundledOff,
    setInstructionsOff,
    setRuleMatch,
    setRuleTarget,
    skillRules,
    withRules,
  } from './codex-skills';
  import type { RuleMatch, SkillRule } from './codex-skills';
  import NoEffect from './no-effect.svelte';

  type Props = {
    id: string;
    /** The `[skills]` table as it is in the document. */
    value: unknown;
    onChange: (value: unknown) => void;
    hint: string;
    issues: readonly FieldIssue[];
    disabled: boolean;
  };

  const { id, value, onChange, hint, issues, disabled }: Props = $props();

  const skills = $derived(asSkillsTable(value));
  const rules = $derived(skillRules(skills));
  const others = $derived(otherSkillKeys(skills));

  const setRules = (next: SkillRule[]): void => onChange(withRules(skills, next));
  const replaceRule = (index: number, rule: SkillRule): void =>
    setRules(rules.map((existing, at) => (at === index ? rule : existing)));

  const checkboxClasses =
    'flex cursor-pointer items-start gap-2 text-sm text-slate-800 has-[:disabled]:cursor-not-allowed dark:text-slate-100';
</script>

<FieldShell {id} label="Skills turned off" fieldKey="skills" {hint} {issues} group>
  <div class="space-y-3">
    {#if rules.length > 0}
      <ul class="space-y-2" aria-label="Skill rules">
        {#each rules as rule, index (index)}
          {@const match = ruleMatch(rule)}
          <li class="space-y-1 rounded-md border border-slate-200 p-2 dark:border-slate-700">
            <div class="flex flex-wrap items-center gap-2">
              <select
                id="{id}-rule-{index}-match"
                aria-label="Rule {index + 1} matches by"
                value={match}
                {disabled}
                onchange={(event) =>
                  replaceRule(index, setRuleMatch(rule, event.currentTarget.value as RuleMatch))}
                class="{controlClasses} w-auto flex-none"
              >
                <option value="name">By name</option>
                <option value="path">By path</option>
              </select>
              <input
                id="{id}-rule-{index}-target"
                type="text"
                aria-label="Rule {index + 1} skill {match}"
                value={ruleTarget(rule)}
                {disabled}
                placeholder={match === 'name' ? 'deploy' : '.agents/skills/deploy'}
                oninput={(event) =>
                  replaceRule(index, setRuleTarget(rule, event.currentTarget.value))}
                class="{controlClasses} w-0 min-w-[8rem] flex-1 font-mono"
                autocomplete="off"
                spellcheck="false"
              />
              <button
                type="button"
                {disabled}
                aria-label="Remove rule {index + 1}"
                onclick={() => setRules(rules.filter((_, at) => at !== index))}
                class="focus-visible:outline-primary-600 flex-none cursor-pointer rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-2 disabled:cursor-not-allowed disabled:opacity-60 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              >
                <X aria-hidden="true" class="size-4" />
              </button>
            </div>
            <p class="text-xs text-slate-600 dark:text-slate-300">
              {#if rule['enabled'] === false}
                <CodeText text="Writes `enabled = false`." />
              {:else}
                <CodeText
                  text={rule['enabled'] === undefined
                    ? 'Has no `enabled` key.'
                    : `Has \`enabled = ${String(rule['enabled'])}\`.`}
                />
                <NoEffect />
              {/if}
            </p>
          </li>
        {/each}
      </ul>
    {/if}

    <button
      type="button"
      {disabled}
      onclick={() => setRules([...rules, disableRule('name')])}
      class="focus-visible:outline-primary-600 inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 hover:bg-slate-100 focus-visible:outline-2 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
    >
      <Plus aria-hidden="true" class="size-4" />
      Add a rule
    </button>

    <label class={checkboxClasses}>
      <input
        type="checkbox"
        checked={bundledOff(skills)}
        {disabled}
        onchange={(event) => onChange(setBundledOff(skills, event.currentTarget.checked))}
        class="accent-primary-600 mt-0.5 size-4 flex-none"
      />
      <span>
        Turn off the bundled skills
        <code class="block font-mono text-xs text-slate-500 dark:text-slate-400"
          >bundled.enabled = false</code
        >
      </span>
    </label>
    <label class={checkboxClasses}>
      <input
        type="checkbox"
        checked={instructionsOff(skills)}
        {disabled}
        onchange={(event) => onChange(setInstructionsOff(skills, event.currentTarget.checked))}
        class="accent-primary-600 mt-0.5 size-4 flex-none"
      />
      <span>
        Leave out skill instructions
        <code class="block font-mono text-xs text-slate-500 dark:text-slate-400"
          >include_instructions = false</code
        >
      </span>
    </label>

    {#if others.length > 0}
      <p class="text-sm [overflow-wrap:anywhere] text-slate-600 dark:text-slate-300">
        <CodeText text={`Also kept as-is: ${others.map((key) => `\`${key}\``).join(', ')}.`} />
        <NoEffect />
      </p>
    {/if}
  </div>
</FieldShell>
