<script lang="ts">
  import { merge } from '$merge';
  import type { Icon as IconType } from 'lucide-svelte';
  import type { ExtendElement } from '../component.types';

  import Label from '../label';

  type InputProps = ExtendElement<
    'input',
    {
      label: string;
      /** Help text to be displayed below the input */
      details?: string;
      /** Hide label and use it as a placeholder */
      unlabeled?: boolean;
      before?: typeof IconType;
      after?: typeof IconType;
      prefix?: string;
      suffix?: string;
    }
  >;

  let {
    label,
    value = $bindable(''),
    details = undefined,
    required = false,
    disabled = false,
    unlabeled = false,
    placeholder = undefined,
    before = undefined,
    after = undefined,
    prefix = undefined,
    suffix = undefined,
    ...props
  }: InputProps = $props();
</script>

{#snippet icon(iconType: typeof IconType)}
  {@const Icon = iconType}
  <Icon class="pointer-events-none h-4 w-4 dark:text-slate-400" aria-hidden="true" />
{/snippet}

<div>
  <Label {label} {disabled} {required} hidden={unlabeled}>
    <div
      class={merge(
        'flex w-full items-center gap-2 rounded-md bg-white px-3 py-1 text-sm leading-6 text-slate-900 placeholder-slate-400 shadow-sm ring-1 ring-inset ring-slate-500 focus-within:bg-primary-50 focus-within:outline-none focus-within:ring-2 focus-within:ring-primary-600 dark:bg-slate-800 dark:focus-within:bg-slate-700',
        disabled && 'cursor-not-allowed bg-slate-100',
      )}
    >
      {#if before}
        {@render icon(before)}
      {/if}
      {#if prefix}
        <span class="pointer-events-none text-primary-600 dark:text-primary-400">
          {prefix}
        </span>
      {/if}
      <input
        bind:value
        class="block w-full bg-transparent focus:outline-none disabled:cursor-not-allowed dark:text-white"
        placeholder={unlabeled ? placeholder || label : placeholder}
        {required}
        {disabled}
        {...props}
      />
      {#if suffix}
        <span class="pointer-events-none text-primary-600 dark:text-primary-400">
          {suffix}
        </span>
      {/if}
      {#if after}
        {@render icon(after)}
      {/if}
    </div>
    {#if details}<span class="text-xs text-slate-500 dark:text-slate-400">{details}</span>{/if}
  </Label>
</div>
