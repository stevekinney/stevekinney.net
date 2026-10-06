<script lang="ts">
  import { settingsScopeLabels } from '$lib/experiments/settings-scope';

  import { controlGroups, controls, kindLabels } from './model';
  import type { Control, ControlId } from './model';
  import type { Prefill } from './settings-import';

  type Props = {
    on: Record<ControlId, boolean>;
    /** What uploaded settings said about each control, or `null` without uploads. */
    prefill: Record<ControlId, Prefill> | null;
    ready: boolean;
    onToggle: (id: ControlId, on: boolean) => void;
    onHover: (id: ControlId | null) => void;
  };

  const { on, prefill, ready, onToggle, onHover }: Props = $props();

  const badge = (control: Control): { text: string; classes: string } => {
    if (control.partial) {
      return {
        text: 'partial',
        classes: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100',
      };
    }

    switch (control.kind) {
      case 'prompt-only':
        return {
          text: 'cuts nothing',
          classes: 'bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-100',
        };
      case 'best-effort':
        return {
          text: 'best-effort, cuts nothing guaranteed',
          classes: 'bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-100',
        };
      case 'partial':
        return {
          text: 'partial',
          classes: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100',
        };
      case 'human-gate':
        return {
          text: 'human gate',
          classes: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100',
        };
      default:
        return {
          text: kindLabels[control.kind],
          classes: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
        };
    }
  };
</script>

<div class="space-y-6" data-testid="controls">
  {#each controlGroups as group (group.title)}
    <section aria-labelledby="group-{group.kind[0]}" class="space-y-2">
      <div>
        <h3 id="group-{group.kind[0]}" class="font-bold text-slate-900 dark:text-white">
          {group.title}
        </h3>
        <p class="text-sm text-slate-600 dark:text-slate-300">{group.note}</p>
      </div>
      <ul class="space-y-2">
        {#each controls.filter( (control) => group.kind.includes(control.kind) ) as control (control.id)}
          {@const kind = badge(control)}
          {@const fromSettings = prefill?.[control.id]}
          <li
            class="group relative rounded-md border border-slate-200 p-2.5 focus-within:z-30 hover:z-30 dark:border-slate-700"
            data-control={control.id}
            onmouseenter={() => onHover(control.id)}
            onmouseleave={() => onHover(null)}
            onfocusin={() => onHover(control.id)}
            onfocusout={() => onHover(null)}
          >
            <label for="control-{control.id}" class="flex cursor-pointer items-start gap-2">
              <input
                id="control-{control.id}"
                type="checkbox"
                checked={on[control.id]}
                disabled={!ready}
                onchange={(event) => onToggle(control.id, event.currentTarget.checked)}
                aria-describedby="control-{control.id}-tooltip"
                class="accent-primary-600 mt-0.5 size-4 flex-none"
              />
              <span class="min-w-0 text-sm [overflow-wrap:anywhere]">
                <span class="font-medium text-slate-900 dark:text-white">{control.label}</span>
                <span
                  class="ml-1 inline-block rounded px-1.5 py-0.5 text-xs font-semibold {kind.classes}"
                  >{kind.text}</span
                >
              </span>
            </label>
            {#if fromSettings}
              <p
                class="mt-1 pl-6 text-xs [overflow-wrap:anywhere] text-slate-600 dark:text-slate-300"
                data-testid="evidence-{control.id}"
              >
                {#if fromSettings.status === 'unknown'}
                  <span class="italic">Not determinable from settings.</span>
                  {#if fromSettings.reason !== 'Not determinable from settings.'}
                    {fromSettings.reason}
                  {/if}
                {:else}
                  From your settings: {fromSettings.reason}
                  {#each fromSettings.evidence as line, index (index)}
                    <span class="mt-0.5 block">
                      {line.file.path} ({settingsScopeLabels[line.file.scope]}){line.line === null
                        ? ''
                        : `, line ${line.line}`}:
                      <code
                        class="rounded bg-slate-100 px-1 font-mono text-[0.95em] text-slate-800 dark:bg-slate-800 dark:text-slate-100"
                        >{line.lineText}</code
                      >
                    </span>
                  {/each}
                {/if}
              </p>
            {/if}
            <span
              id="control-{control.id}-tooltip"
              role="tooltip"
              class="pointer-events-none absolute top-full right-0 left-0 z-20 mt-1 hidden rounded-md bg-slate-900 px-3 py-2 text-xs text-white shadow-lg group-focus-within:block group-hover:block dark:bg-slate-100 dark:text-slate-900"
            >
              Removes: {control.removes}. {control.description}
            </span>
          </li>
        {/each}
      </ul>
    </section>
  {/each}
</div>
