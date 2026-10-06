<script lang="ts">
  import { fieldClasses, hintClasses, labelClasses } from './field-styles';

  type Props = {
    id: string;
    label: string;
    value: string;
    options: { value: string; label: string }[];
    onChange: (value: string) => void;
    disabled?: boolean;
    hint?: string;
  };

  const { id, label, value, options, onChange, disabled = false, hint }: Props = $props();
</script>

<div class="space-y-1.5">
  <label for={id} class={labelClasses}>{label}</label>
  <select
    {id}
    {value}
    {disabled}
    aria-describedby={hint ? `${id}-hint` : undefined}
    onchange={(event) => onChange(event.currentTarget.value)}
    class={fieldClasses}
  >
    {#each options as option (option.value)}
      <option value={option.value} selected={option.value === value}>{option.label}</option>
    {/each}
  </select>
  {#if hint}
    <p id="{id}-hint" class={hintClasses}>{hint}</p>
  {/if}
</div>
