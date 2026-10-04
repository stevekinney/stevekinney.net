<script lang="ts">
  import { hintClasses, labelClasses } from './field-styles';

  type Option = {
    value: string;
    label: string;
    /** Extra text shown on hover and focus, such as the providers in a group. */
    tooltip?: string;
  };

  type Props = {
    id: string;
    label: string;
    value: string;
    options: Option[];
    onChange: (value: string) => void;
    disabled?: boolean;
    hint?: string;
  };

  const { id, label, value, options, onChange, disabled = false, hint }: Props = $props();
</script>

<div class="space-y-1.5">
  <span id="{id}-label" class={labelClasses}>{label}</span>
  <div
    role="group"
    aria-labelledby="{id}-label"
    aria-describedby={hint ? `${id}-hint` : undefined}
    class="flex gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800"
  >
    {#each options as option (option.value)}
      <div class="group relative flex-1">
        <button
          type="button"
          {disabled}
          aria-pressed={value === option.value}
          aria-describedby={option.tooltip ? `${id}-${option.value}-tooltip` : undefined}
          onclick={() => onChange(option.value)}
          class="focus-visible:outline-primary-600 w-full cursor-pointer rounded-md px-2 py-1.5 text-sm font-medium text-slate-700 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-1 disabled:cursor-not-allowed disabled:opacity-60 aria-pressed:bg-white aria-pressed:text-slate-900 aria-pressed:shadow-sm aria-pressed:ring-1 aria-pressed:ring-slate-300 dark:text-slate-300 dark:hover:bg-slate-700 dark:aria-pressed:bg-slate-600 dark:aria-pressed:text-white dark:aria-pressed:ring-slate-500"
        >
          {option.label}
        </button>
        {#if option.tooltip}
          <span
            id="{id}-{option.value}-tooltip"
            role="tooltip"
            class="pointer-events-none absolute top-full left-0 z-20 mt-1 hidden w-64 max-w-[calc(100vw-2rem)] rounded-md bg-slate-900 px-3 py-2 text-xs text-white shadow-lg group-focus-within:block group-hover:block dark:bg-slate-100 dark:text-slate-900"
          >
            {option.tooltip}
          </span>
        {/if}
      </div>
    {/each}
  </div>
  {#if hint}
    <p id="{id}-hint" class={hintClasses}>{hint}</p>
  {/if}
</div>
