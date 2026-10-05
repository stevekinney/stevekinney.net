<script lang="ts" generics="Value extends string">
  import { hintClasses, labelClasses } from './field-styles';

  type Props = {
    id: string;
    label: string;
    value: Value;
    options: { value: Value; label: string }[];
    onChange: (value: Value) => void;
    hint?: string;
    disabled?: boolean;
  };

  const { id, label, value, options, onChange, hint, disabled = false }: Props = $props();
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
      <button
        id="{id}-{option.value}"
        type="button"
        {disabled}
        aria-pressed={value === option.value}
        onclick={() => onChange(option.value)}
        class="focus-visible:outline-primary-600 min-w-0 flex-1 cursor-pointer rounded-md px-2 py-1.5 text-sm font-medium text-slate-700 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-1 disabled:cursor-not-allowed disabled:opacity-60 aria-pressed:bg-white aria-pressed:text-slate-900 aria-pressed:shadow-sm aria-pressed:ring-1 aria-pressed:ring-slate-300 dark:text-slate-300 dark:hover:bg-slate-700 dark:aria-pressed:bg-slate-600 dark:aria-pressed:text-white dark:aria-pressed:ring-slate-500"
      >
        {option.label}
      </button>
    {/each}
  </div>
  {#if hint}<p id="{id}-hint" class={hintClasses}>{hint}</p>{/if}
</div>
