<script lang="ts">
  import type { Snippet } from 'svelte';

  import { hintClasses } from './field-styles';

  type Props = {
    id: string;
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    hint?: string;
    disabled?: boolean;
    /** Settings that only matter while this is checked. */
    children?: Snippet;
  };

  const { id, label, checked, onChange, hint, disabled = false, children }: Props = $props();
</script>

<div class="space-y-2">
  <div class="flex items-start gap-2">
    <input
      {id}
      type="checkbox"
      {checked}
      {disabled}
      aria-describedby={hint ? `${id}-hint` : undefined}
      onchange={(event) => onChange(event.currentTarget.checked)}
      class="accent-primary-600 mt-1 size-4 flex-none cursor-pointer disabled:cursor-not-allowed"
    />
    <div class="min-w-0">
      <label for={id} class="cursor-pointer font-semibold text-slate-800 dark:text-slate-100"
        >{label}</label
      >
      {#if hint}<p id="{id}-hint" class={hintClasses}>{hint}</p>{/if}
    </div>
  </div>
  {#if children && checked}
    <div class="pl-6">{@render children()}</div>
  {/if}
</div>
