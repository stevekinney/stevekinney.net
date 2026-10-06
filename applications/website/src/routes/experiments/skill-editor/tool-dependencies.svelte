<script lang="ts">
  import { Plus, X } from '@lucide/svelte';

  import { controlClasses, labelClasses } from '$lib/experiments/editor-fields/field-styles';

  import { isMapping } from './skill-document';
  import type { SkillDocument } from './skill-document';
  import {
    addDependency,
    dependencyKeys,
    readDependencies,
    readText,
    removeDependency,
    setDependency,
  } from './skill-fields';
  import type { DependencyKey } from './skill-fields';

  type Props = {
    /** The field's id; each input derives its own from it. */
    id: string;
    skill: SkillDocument;
    onChange: (skill: SkillDocument) => void;
  };

  const { id, skill, onChange }: Props = $props();

  const entries = $derived(readDependencies(skill));

  // The labels are the keys themselves, which is what the file says.
  const inputs: Record<DependencyKey, { placeholder: string; wide?: boolean }> = {
    type: { placeholder: 'mcp' },
    value: { placeholder: 'docs' },
    description: { placeholder: 'What the skill uses it for', wide: true },
    transport: { placeholder: 'Optional' },
    url: { placeholder: 'https://example.com/mcp' },
    command: { placeholder: 'Optional', wide: true },
  };

  const required = (key: DependencyKey): boolean => key === 'type' || key === 'value';

  /** A required key left blank in an entry that has something else filled in. */
  const missing = (entry: Record<string, unknown>, key: DependencyKey): boolean =>
    required(key) &&
    readText(entry[key]).trim() === '' &&
    dependencyKeys.some((other) => readText(entry[other]).trim() !== '');
</script>

<div class="space-y-3">
  {#if entries.length === 0}
    <p class="text-sm text-slate-600 dark:text-slate-300">No tool dependencies.</p>
  {:else}
    <ol class="space-y-3" aria-label="Tool dependencies">
      {#each entries as entry, index (index)}
        {#if isMapping(entry)}
          <li class="space-y-3 rounded-md border border-slate-200 p-3 dark:border-slate-700">
            <div class="flex items-center justify-between gap-3">
              <p class="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Tool {index + 1}
              </p>
              <button
                type="button"
                onclick={() => onChange(removeDependency(skill, index))}
                class="focus-visible:outline-primary-600 flex cursor-pointer items-center gap-1 rounded px-2 py-1 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
              >
                <X class="size-3.5" aria-hidden="true" />
                Remove <span class="sr-only">tool {index + 1}</span>
              </button>
            </div>
            <div class="grid gap-3 sm:grid-cols-2">
              {#each dependencyKeys as key (key)}
                {@const inputId = `${id}-${index}-${key}`}
                {@const invalid = missing(entry, key)}
                <div class={['min-w-0 space-y-1.5', inputs[key].wide && 'sm:col-span-2']}>
                  <label for={inputId} class={labelClasses}>
                    <code class="font-mono">{key}</code>
                    {#if !required(key)}
                      <span class="font-normal text-slate-500 dark:text-slate-400">(optional)</span>
                    {/if}
                  </label>
                  <input
                    id={inputId}
                    value={readText(entry[key])}
                    oninput={(event) =>
                      onChange(setDependency(skill, index, key, event.currentTarget.value))}
                    placeholder={inputs[key].placeholder}
                    required={required(key)}
                    aria-invalid={invalid || undefined}
                    aria-describedby={invalid ? `${id}-issues` : undefined}
                    autocomplete="off"
                    spellcheck="false"
                    class="{controlClasses} {key === 'description' ? '' : 'font-mono'}"
                  />
                </div>
              {/each}
            </div>
          </li>
        {/if}
      {/each}
    </ol>
  {/if}

  <button
    type="button"
    onclick={() => onChange(addDependency(skill))}
    class="focus-visible:outline-primary-600 flex cursor-pointer items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 hover:bg-slate-100 focus-visible:outline-2 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
  >
    <Plus class="size-4" aria-hidden="true" />
    Add a tool dependency
  </button>
</div>
