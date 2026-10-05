<script lang="ts">
  import { untrack } from 'svelte';

  import { fieldClasses } from './field-styles';

  type Props = {
    label: string;
    value: string;
    /** Whether the text is acceptable. Text that isn't leaves the value as it was. */
    validate: (text: string) => string | null;
    onCommit: (text: string) => void;
    numeric?: boolean;
  };

  const { label, value, validate, onCommit, numeric = false }: Props = $props();

  let text = $state(untrack(() => value));
  let editing = $state(false);

  const problem = $derived(validate(text));

  $effect(() => {
    const next = value;

    untrack(() => {
      if (!editing) text = next;
    });
  });
</script>

<input
  type="text"
  value={text}
  aria-label={label}
  aria-invalid={problem !== null || undefined}
  title={problem ?? undefined}
  inputmode={numeric ? 'decimal' : undefined}
  autocomplete="off"
  spellcheck="false"
  onfocus={() => (editing = true)}
  onblur={() => {
    editing = false;
    if (problem === null) text = value;
  }}
  oninput={(event) => {
    text = event.currentTarget.value;
    if (validate(text) === null) onCommit(text);
  }}
  class="{fieldClasses} py-1.5 text-sm {numeric ? 'w-24 text-right' : 'min-w-32'}"
/>
