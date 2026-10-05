<script lang="ts">
  import Button from '$lib/components/button';

  import { defaultCiScenario, describeCiScenario } from './ci-scenarios';
  import type { CiScenario } from './ci-scenarios';
  import { legLabels } from './model';

  type Props = {
    scenario: CiScenario | null;
    ready: boolean;
    onChange: (scenario: CiScenario | null) => void;
  };

  const { scenario, ready, onChange }: Props = $props();

  const effects = $derived(scenario ? describeCiScenario(scenario) : []);

  type Choice<K extends keyof CiScenario> = {
    key: K;
    label: string;
    options: { value: CiScenario[K]; label: string }[];
  };

  const choices: [
    Choice<'trigger'>,
    Choice<'botSuffixAuthorization'>,
    Choice<'credential'>,
    Choice<'defaultTokenCommits'>,
  ] = [
    {
      key: 'trigger',
      label: 'Trigger',
      options: [
        { value: 'pull_request', label: 'pull_request' },
        { value: 'pull_request_target', label: 'pull_request_target' },
      ],
    },
    {
      key: 'botSuffixAuthorization',
      label: 'Who may start it',
      options: [
        { value: false, label: 'A named allowlist' },
        { value: true, label: 'Any name ending in [bot]' },
      ],
    },
    {
      key: 'credential',
      label: 'Credential',
      options: [
        { value: 'static', label: 'Static token' },
        { value: 'oidc', label: 'OIDC' },
      ],
    },
    {
      key: 'defaultTokenCommits',
      label: 'The agent commits with',
      options: [
        { value: false, label: 'A token that triggers CI' },
        { value: true, label: 'The default GITHUB_TOKEN' },
      ],
    },
  ];

  const set = <K extends keyof CiScenario>(key: K, value: CiScenario[K]): void => {
    if (scenario) onChange({ ...scenario, [key]: value });
  };

  const tone = {
    adds: 'bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-100',
    cuts: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100',
    narrows: 'bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-100',
    none: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
  } as const;
</script>

<div class="space-y-4" data-testid="ci">
  {#if scenario}
    <div class="grid gap-4 sm:grid-cols-2">
      {#each choices as choice (choice.key)}
        <div class="space-y-1.5">
          <span
            id="ci-{choice.key}"
            class="block text-sm font-semibold text-slate-700 dark:text-slate-200"
            >{choice.label}</span
          >
          <div
            role="group"
            aria-labelledby="ci-{choice.key}"
            class="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800"
          >
            {#each choice.options as option (option.label)}
              <button
                type="button"
                disabled={!ready}
                aria-pressed={scenario[choice.key] === option.value}
                onclick={() => set(choice.key, option.value)}
                class="focus-visible:outline-primary-600 min-w-0 flex-1 cursor-pointer rounded-md px-2 py-1.5 text-sm font-medium [overflow-wrap:anywhere] text-slate-700 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-1 disabled:cursor-not-allowed disabled:opacity-60 aria-pressed:bg-white aria-pressed:text-slate-900 aria-pressed:shadow-sm aria-pressed:ring-1 aria-pressed:ring-slate-300 dark:text-slate-300 dark:hover:bg-slate-700 dark:aria-pressed:bg-slate-600 dark:aria-pressed:text-white dark:aria-pressed:ring-slate-500"
              >
                {option.label}
              </button>
            {/each}
          </div>
        </div>
      {/each}
    </div>

    <ul class="space-y-2" data-testid="ci-effects">
      {#each effects as effect (effect.id)}
        <li
          class="flex gap-2 text-sm text-slate-700 dark:text-slate-200"
          data-effect={effect.effect}
        >
          <span
            class="h-fit flex-none rounded px-1.5 py-0.5 text-xs font-semibold {tone[
              effect.effect
            ]}"
            >{effect.effect === 'none'
              ? 'no leg'
              : `${effect.effect} ${effect.legs.map((leg) => legLabels[leg].toLowerCase()).join(', ')}`}</span
          >
          <span class="min-w-0"><strong>{effect.title}.</strong> {effect.explanation}</span>
        </li>
      {/each}
    </ul>

    <Button variant="secondary" size="small" disabled={!ready} onclick={() => onChange(null)}>
      Back to a laptop agent
    </Button>
  {:else}
    <Button
      variant="secondary"
      disabled={!ready}
      onclick={() => onChange({ ...defaultCiScenario })}
    >
      Load the CI agent
    </Button>
  {/if}
</div>
