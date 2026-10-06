<script lang="ts">
  import { untrack } from 'svelte';

  import { formatTokenCount, parseTokenCount } from '$lib/experiments/format';

  type Props = {
    id: string;
    label: string;
    value: number;
    description?: string;
  };

  let { id, label, value = $bindable(), description }: Props = $props();

  let text = $state(untrack(() => formatTokenCount(value)));
  let editing = $state(false);

  const invalid = $derived(parseTokenCount(text) === null);
  const describedBy = $derived(
    invalid ? `${id}-error` : description ? `${id}-description` : undefined,
  );

  // Counts can change from outside, such as when a session loads. Show them,
  // unless the person is in the middle of typing in this field.
  $effect(() => {
    const next = value;

    untrack(() => {
      if (!editing && parseTokenCount(text) !== next) text = formatTokenCount(next);
    });
  });

  const handleInput = (event: Event & { currentTarget: HTMLInputElement }): void => {
    text = event.currentTarget.value;

    const parsed = parseTokenCount(text);
    if (parsed !== null) value = parsed;
  };

  const handleBlur = (): void => {
    editing = false;
    if (!invalid) text = formatTokenCount(value);
  };
</script>

<div class="space-y-1.5">
  <label for={id} class="block text-sm font-semibold text-slate-700 dark:text-slate-200">
    {label}
  </label>
  <input
    {id}
    type="text"
    value={text}
    oninput={handleInput}
    onfocus={() => (editing = true)}
    onblur={handleBlur}
    autocomplete="off"
    spellcheck="false"
    aria-invalid={invalid || undefined}
    aria-describedby={describedBy}
    class="focus-visible:ring-primary-600 dark:focus-visible:ring-primary-400 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 tabular-nums outline-none focus-visible:ring-2 aria-invalid:border-red-600 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:aria-invalid:border-red-400"
  />
  {#if invalid}
    <p id="{id}-error" class="text-sm text-red-700 dark:text-red-400">
      Enter a whole number, such as 250000, 250k, or 1.5M.
    </p>
  {:else if description}
    <p id="{id}-description" class="text-sm text-slate-500 dark:text-slate-400">{description}</p>
  {/if}
</div>
