<script lang="ts">
  import { Link } from '@lucide/svelte';

  import Button from '$lib/components/button';

  import { families, unrecognized } from './models';
  import type { ModelSetting, ModelValue } from './models';
  import { subagentKinds } from './resolve';
  import type { ProviderGroup, ResolverConfiguration, SubagentKind } from './resolve';
  import SelectField from './select-field.svelte';
  import ToggleGroup from './toggle-group.svelte';
  import VersionControl from './version-control.svelte';
  import type { Version, VersionRange } from './versions';

  type Props = {
    configuration: ResolverConfiguration;
    range: VersionRange;
    /** The controls stay disabled until the page can handle them. */
    ready: boolean;
    onChange: (patch: Partial<ResolverConfiguration>) => void;
    /** Why a link can't be copied, or what happened when it was. */
    linkMessage: string | null;
    linkText: string | null;
    onCopyLink: () => void;
  };

  const { configuration, range, ready, onChange, linkMessage, linkText, onCopyLink }: Props =
    $props();

  const familyOptions = families.map((family) => ({ value: family, label: family }));

  const definitionOptions = [
    { value: 'unset', label: 'Not set' },
    { value: 'inherit', label: 'inherit' },
    ...familyOptions,
  ];
  const invocationOptions = [{ value: 'unset', label: 'None' }, ...familyOptions];
  const environmentOptions = [
    { value: 'unset', label: 'Unset' },
    { value: 'inherit', label: 'inherit' },
    ...familyOptions,
  ];
  const mainOptions = [...familyOptions, { value: unrecognized, label: 'Unrecognized model ID' }];

  const locked = $derived(
    configuration.kind === 'skill-inherit'
      ? { value: 'inherit', hint: 'A skill in a subagent runs with model: inherit.' }
      : configuration.kind === 'general-purpose'
        ? { value: 'unset', hint: 'The built-in general-purpose agent has no model: field.' }
        : null,
  );

  const builtInNote = $derived(
    ['explore', 'plan', 'fork'].includes(configuration.kind)
      ? 'Built-ins and forks don’t read this.'
      : undefined,
  );
</script>

<div class="grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
  <SelectField
    id="subagent-kind"
    label="Subagent kind"
    value={configuration.kind}
    options={subagentKinds.map((kind) => ({ value: kind.value, label: kind.label }))}
    disabled={!ready}
    onChange={(value) => onChange({ kind: value as SubagentKind })}
  />
  <SelectField
    id="definition-model"
    label="Definition model: field"
    value={locked?.value ?? configuration.definitionModel}
    options={definitionOptions}
    disabled={!ready || locked !== null}
    hint={locked?.hint ?? builtInNote}
    onChange={(value) => onChange({ definitionModel: value as ModelSetting })}
  />
  <SelectField
    id="invocation-model"
    label="Per-invocation model"
    value={configuration.invocationModel}
    options={invocationOptions}
    disabled={!ready}
    hint={builtInNote}
    onChange={(value) => onChange({ invocationModel: value as ModelSetting })}
  />
  <SelectField
    id="environment-model"
    label="CLAUDE_CODE_SUBAGENT_MODEL"
    value={configuration.environmentModel}
    options={environmentOptions}
    disabled={!ready}
    onChange={(value) => onChange({ environmentModel: value as ModelSetting })}
  />
  <ToggleGroup
    id="force"
    label="CLAUDE_CODE_SUBAGENT_MODEL_FORCE"
    value={configuration.force ? 'on' : 'off'}
    options={[
      { value: 'off', label: 'Unset' },
      { value: 'on', label: '=1' },
    ]}
    disabled={!ready}
    onChange={(value) => onChange({ force: value === 'on' })}
  />
  <SelectField
    id="main-model"
    label="Main conversation model"
    value={configuration.mainModel}
    options={mainOptions}
    disabled={!ready}
    onChange={(value) => onChange({ mainModel: value as ModelValue })}
  />
  <ToggleGroup
    id="provider-group"
    label="Provider group"
    value={configuration.providerGroup}
    options={[
      {
        value: 'capped',
        label: 'Capped',
        tooltip:
          'Explore is capped at Opus. Claude subscription, Anthropic Console, or an LLM gateway reached through ANTHROPIC_BASE_URL.',
      },
      {
        value: 'uncapped',
        label: 'Uncapped',
        tooltip:
          'Explore is not capped. Amazon Bedrock, Google Cloud’s Agent Platform, Microsoft Foundry, Claude Platform on AWS, or a Claude apps gateway.',
      },
    ]}
    disabled={!ready}
    onChange={(value) => onChange({ providerGroup: value as ProviderGroup })}
  />
  <VersionControl
    id="claude-code-version"
    version={configuration.version}
    {range}
    disabled={!ready}
    onChange={(version: Version) => onChange({ version })}
  />
  <ToggleGroup
    id="resumed"
    label="Resumed subagent?"
    value={configuration.resumed ? 'yes' : 'no'}
    options={[
      { value: 'no', label: 'No' },
      { value: 'yes', label: 'Yes' },
    ]}
    disabled={!ready}
    hint="Resuming, or sending a follow-up, behaved differently before 2.1.211."
    onChange={(value) => onChange({ resumed: value === 'yes' })}
  />
</div>

<div class="mt-5 flex flex-wrap items-center gap-3">
  <Button variant="secondary" size="small" icon={Link} disabled={!ready} onclick={onCopyLink}>
    Copy link to this scenario
  </Button>
  <p class="text-sm text-slate-600 dark:text-slate-300" aria-live="polite">{linkMessage}</p>
</div>
{#if linkText}
  <label class="mt-2 block text-sm text-slate-600 dark:text-slate-300">
    <span class="sr-only">Link to this scenario</span>
    <input
      type="text"
      readonly
      value={linkText}
      onfocus={(event) => event.currentTarget.select()}
      class="w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
    />
  </label>
{/if}
