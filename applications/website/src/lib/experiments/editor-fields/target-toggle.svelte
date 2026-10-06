<script lang="ts">
  type Target = 'claude' | 'codex';

  const labels: Record<Target, string> = { claude: 'Claude Code', codex: 'Codex' };
  const targets = Object.keys(labels) as Target[];

  type Props = {
    value: Target;
    onChange: (target: Target) => void;
    /** The radio group's name, which tests and labels can select by. */
    name: string;
    /** The group's label. */
    legend?: string;
    disabled?: boolean;
  };

  const { value, onChange, name, legend = 'Export for', disabled = false }: Props = $props();

  const optionClasses = (selected: boolean): string =>
    selected
      ? 'bg-primary-600 text-white dark:bg-primary-500 dark:text-slate-950'
      : 'bg-white text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700';
</script>

<fieldset class="min-w-0 space-y-1.5">
  <legend class="text-sm font-semibold text-slate-800 dark:text-slate-100">{legend}</legend>
  <div
    class="inline-flex max-w-full overflow-hidden rounded-md border border-slate-300 dark:border-slate-600"
  >
    {#each targets as option (option)}
      <label
        class="has-focus-visible:outline-primary-600 relative cursor-pointer px-4 py-2 text-sm font-semibold whitespace-nowrap transition-colors has-focus-visible:outline-2 has-focus-visible:-outline-offset-2 has-disabled:cursor-not-allowed {optionClasses(
          value === option,
        )}"
      >
        <input
          type="radio"
          {name}
          value={option}
          checked={value === option}
          {disabled}
          onchange={() => onChange(option)}
          class="sr-only"
        />
        {labels[option]}
      </label>
    {/each}
  </div>
</fieldset>
