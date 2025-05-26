<script lang="ts">
  import type { ExtendElement } from '../component.types';
  import { merge } from '$merge';
  import Label from '../label';

  type Props = ExtendElement<
    'select',
    {
      label: string;
      options: { label: string; value: string }[];
    }
  >;

  const {
    label,
    options = [],
    disabled = false,
    required = false,
    children,
    ...rest
  }: Props = $props();
</script>

<div>
  <Label {label} {disabled} {required}>
    <div
      class={merge(
        'rounded-md border-0 bg-white px-4 py-1 text-sm leading-6 text-slate-900 placeholder-slate-400 shadow-sm ring-1 ring-slate-500 ring-inset dark:bg-slate-800  dark:focus-within:bg-slate-700',
        !disabled &&
          'focus-within:bg-primary-50 focus-within:ring-primary-600 focus-within:ring-2 focus-within:outline-none',
        disabled && 'cursor-not-allowed bg-slate-100 text-slate-500',
      )}
    >
      <select
        class="w-full bg-transparent outline-none disabled:cursor-not-allowed dark:text-slate-100"
        {required}
        {disabled}
        {...rest}
      >
        {#if children}
          {@render children()}
        {:else}
          <option disabled selected>Select an option...</option>
          {#each options || [] as option}
            <option value={option.value}>{option.label || option.value}</option>
          {/each}
        {/if}
      </select>
    </div>
  </Label>
</div>
