<script lang="ts">
  import Button from '$lib/components/button';

  import { fieldClasses, hintClasses, labelClasses } from './field-styles';
  import { classificationLabels, cloneRules, formatWordList, parseWordList } from './lint-rules';
  import type { LintRules } from './lint-rules';

  type Props = {
    rules: LintRules;
    onChange: (rules: LintRules) => void;
  };

  const { rules, onChange }: Props = $props();

  type RuleKey = keyof LintRules;

  /** Applies an edit to a copy of the rules, so the page's state only changes through `onChange`. */
  const edit = (change: (next: LintRules) => void): void => {
    // The rules may be reactive state, which structuredClone can't copy, so take a snapshot first.
    const next = cloneRules($state.snapshot(rules) as LintRules);
    change(next);
    onChange(next);
  };

  const sections: { key: RuleKey; label: string; description: string }[] = [
    {
      key: 'mustHold',
      label: classificationLabels['must-hold'],
      description: 'An absolute word next to a tool-shaped word, a path, or a command.',
    },
    {
      key: 'deterministic',
      label: classificationLabels.deterministic,
      description: 'A formatting or linting word together with an every-edit word.',
    },
    {
      key: 'staleProne',
      label: classificationLabels['stale-prone'],
      description:
        'A phrase about now, a branch prefix, or, always on, a ticket ID, a commit hash, or a date.',
    },
    {
      key: 'skillCandidate',
      label: classificationLabels['skill-candidate'],
      description:
        'A numbered list, or a list or section introduced with a cue, longer than the limit.',
    },
    {
      key: 'vague',
      label: classificationLabels.vague,
      description: 'A virtue word with no command, path, or number in the line.',
    },
    {
      key: 'pointer',
      label: classificationLabels.pointer,
      description: 'A documentation word, a Markdown file, a URL, or a link.',
    },
    {
      key: 'goodFact',
      label: classificationLabels['good-fact'],
      description: 'A command in code formatting, a path, or a script, plus a trigger word.',
    },
  ];
</script>

{#snippet wordList(id: string, label: string, words: string[], apply: (words: string[]) => void)}
  <label class="block space-y-1" for={id}>
    <span class={labelClasses}>{label}</span>
    <textarea
      {id}
      rows="2"
      class="{fieldClasses} font-mono text-sm"
      value={formatWordList(words)}
      onchange={(event) => apply(parseWordList(event.currentTarget.value))}></textarea>
  </label>
{/snippet}

<div class="space-y-4" data-testid="rule-editor">
  <p class={hintClasses}>
    Comma-separated, matched as whole words or phrases, ignoring case. Changes apply when you leave
    a box. The order of strength stays fixed: must hold, deterministic, stale-prone, skill
    candidate, doesn’t change a decision, pointer, good fact.
  </p>
  {#each sections as section (section.key)}
    <fieldset class="space-y-2 rounded-md border border-slate-200 p-3 dark:border-slate-700">
      <legend class="px-1">
        <label class="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
          <input
            type="checkbox"
            class="accent-primary-600"
            checked={rules[section.key].enabled}
            onchange={(event) => {
              const enabled = event.currentTarget.checked;
              edit((next) => {
                next[section.key].enabled = enabled;
              });
            }}
          />
          {section.label}
        </label>
      </legend>
      <p class={hintClasses}>{section.description}</p>
      {#if section.key === 'mustHold'}
        {@render wordList('rule-absolutes', 'Absolute words', rules.mustHold.absolutes, (words) =>
          edit((next) => (next.mustHold.absolutes = words)),
        )}
        {#each rules.mustHold.objects as group, index (group.label)}
          {@render wordList(
            `rule-objects-${index}`,
            `Tool-shaped words: ${group.label}`,
            group.words,
            (words) => edit((next) => (next.mustHold.objects[index].words = words)),
          )}
        {/each}
      {:else if section.key === 'deterministic'}
        {@render wordList('rule-tools', 'Formatting words', rules.deterministic.tools, (words) =>
          edit((next) => (next.deterministic.tools = words)),
        )}
        {@render wordList(
          'rule-frequencies',
          'Every-edit words',
          rules.deterministic.frequencies,
          (words) => edit((next) => (next.deterministic.frequencies = words)),
        )}
      {:else if section.key === 'staleProne'}
        {@render wordList('rule-phrases', 'Phrases about now', rules.staleProne.phrases, (words) =>
          edit((next) => (next.staleProne.phrases = words)),
        )}
        {@render wordList(
          'rule-branches',
          'Branch prefixes',
          rules.staleProne.branchPrefixes,
          (words) => edit((next) => (next.staleProne.branchPrefixes = words)),
        )}
      {:else if section.key === 'skillCandidate'}
        {@render wordList('rule-cues', 'Procedure cues', rules.skillCandidate.cues, (words) =>
          edit((next) => (next.skillCandidate.cues = words)),
        )}
        <label class="block space-y-1" for="rule-longer-than">
          <span class={labelClasses}>Longer than this many lines</span>
          <input
            id="rule-longer-than"
            type="number"
            min="1"
            max="50"
            class="{fieldClasses} max-w-28"
            value={rules.skillCandidate.longerThan}
            onchange={(event) => {
              const value = Math.round(Number(event.currentTarget.value));
              if (Number.isFinite(value) && value >= 1 && value <= 50) {
                edit((next) => (next.skillCandidate.longerThan = value));
              }
            }}
          />
        </label>
      {:else if section.key === 'vague'}
        {@render wordList('rule-virtues', 'Virtue words', rules.vague.words, (words) =>
          edit((next) => (next.vague.words = words)),
        )}
      {:else if section.key === 'pointer'}
        {@render wordList('rule-pointers', 'Documentation words', rules.pointer.words, (words) =>
          edit((next) => (next.pointer.words = words)),
        )}
      {:else if section.key === 'goodFact'}
        {@render wordList('rule-triggers', 'Trigger words', rules.goodFact.triggers, (words) =>
          edit((next) => (next.goodFact.triggers = words)),
        )}
      {/if}
    </fieldset>
  {/each}
  <Button variant="secondary" size="small" onclick={() => onChange(cloneRules())}>
    Reset the rules
  </Button>
</div>
