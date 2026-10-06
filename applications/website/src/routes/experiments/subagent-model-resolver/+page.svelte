<script lang="ts">
  import { onMount } from 'svelte';
  import type { Component } from 'svelte';

  import { replaceState } from '$app/navigation';
  import SEO from '$lib/components/seo.svelte';
  import { url } from '$lib/metadata';
  import { buildBreadcrumbSchema } from '$lib/structured-data';

  import { resolveAcrossVersions } from './across-versions';
  import AnswerBanner from './answer-banner.svelte';
  import BoundaryTable from './boundary-table.svelte';
  import { decodeConfiguration, encodeConfiguration } from './configuration-link';
  import { experiment } from './experiment';
  import { fieldClasses, hintClasses, labelClasses } from './field-styles';
  import { describeFlags } from './flags';
  import FooterNotes from './footer-notes.svelte';
  import PresetPicker from './preset-picker.svelte';
  import { configurationsEqual, findPreset, presets } from './presets';
  import { resolve } from './resolve';
  import type { ResolverConfiguration } from './resolve';
  import ResolutionLadder from './resolution-ladder.svelte';
  import ResolverControls from './resolver-controls.svelte';
  import { initialSetup } from './setup-state';
  import type { SetupState } from './setup-state';
  import VersionStrip from './version-strip.svelte';
  import {
    clampVersion,
    defaultRange,
    formatVersion,
    isValidRange,
    MAXIMUM_RANGE_LENGTH,
    parseVersion,
  } from './versions';
  import type { Version, VersionRange } from './versions';

  const { data } = $props();

  const jsonLd = buildBreadcrumbSchema([
    { name: 'Experiments', url: `${url}/experiments` },
    { name: experiment.title, url: `${url}/experiments/subagent-model-resolver` },
  ]);

  const firstPreset = presets[0];

  // One state object. Everything on the page is derived from it.
  const resolver = $state({
    configuration: { ...firstPreset.configuration } as ResolverConfiguration,
    presetId: firstPreset.id as string | null,
    range: { ...defaultRange } as VersionRange,
    rangeFirstText: formatVersion(defaultRange.first),
    rangeLastText: formatVersion(defaultRange.last),
    ready: false,
    touched: false,
    linkMessage: null as string | null,
    linkText: null as string | null,
    setup: initialSetup() as SetupState,
  });

  const version = $derived(clampVersion(resolver.configuration.version, resolver.range));
  const effective = $derived<ResolverConfiguration>({ ...resolver.configuration, version });
  const resolution = $derived(resolve(effective));
  const flags = $derived(describeFlags(effective, resolution));
  const across = $derived(resolveAcrossVersions(effective, resolver.range));

  const rangeFirst = $derived(parseVersion(resolver.rangeFirstText));
  const rangeLast = $derived(parseVersion(resolver.rangeLastText));
  const rangeError = $derived(
    rangeFirst && rangeLast
      ? isValidRange({ first: rangeFirst, last: rangeLast })
        ? null
        : `Both versions need to be in the same 2.x line, with the second after the first and no more than ${MAXIMUM_RANGE_LENGTH} versions apart.`
      : 'Enter both versions like 2.1.190.',
  );

  const change = (patch: Partial<ResolverConfiguration>): void => {
    resolver.configuration = { ...resolver.configuration, ...patch };
    resolver.presetId = null;
    resolver.touched = true;
  };

  const selectPreset = (id: string): void => {
    const preset = findPreset(id);
    if (!preset) return;

    resolver.configuration = { ...preset.configuration };
    resolver.presetId = preset.id;
    resolver.touched = true;
  };

  const editRange = (side: 'first' | 'last', text: string): void => {
    if (side === 'first') resolver.rangeFirstText = text;
    else resolver.rangeLastText = text;

    const first = parseVersion(resolver.rangeFirstText);
    const last = parseVersion(resolver.rangeLastText);
    if (first && last && isValidRange({ first, last })) {
      resolver.range = { first, last };
      resolver.touched = true;
    }
  };

  const scrollToAnswer = (): void => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document
      .getElementById('answer')
      ?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  };

  const loadConfiguration = (configuration: ResolverConfiguration): void => {
    resolver.configuration = { ...configuration };
    resolver.presetId = null;
    resolver.touched = true;
    scrollToAnswer();
  };

  const selectVersion = (next: Version): void => change({ version: next });

  const sharedLink = (): string => {
    const query = encodeConfiguration({
      configuration: resolver.configuration,
      presetId: resolver.presetId,
      range: resolver.range,
    });

    return `${window.location.origin}${window.location.pathname}#${query}`;
  };

  const copyLink = async (): Promise<void> => {
    const link = sharedLink();

    try {
      await navigator.clipboard.writeText(link);
      resolver.linkText = null;
      resolver.linkMessage = 'Link copied. It holds these controls and nothing you uploaded.';
    } catch {
      resolver.linkText = link;
      resolver.linkMessage = 'Couldn’t reach the clipboard. Press ⌘/Ctrl+C to copy the link.';
    }
  };

  // The setup section is heavy, so it loads after the page is interactive.
  let SetupCheck = $state.raw<Component<{
    setup: SetupState;
    controls: ResolverConfiguration;
    range: VersionRange;
    ready: boolean;
    onLoadConfiguration: (configuration: ResolverConfiguration) => void;
  }> | null>(null);
  let setupFailed = $state(false);

  onMount(() => {
    // The hash doesn't exist while the page prerenders, so it's read here.
    const decoded = decodeConfiguration(window.location.hash.slice(1), {
      configuration: resolver.configuration,
      presetId: resolver.presetId,
      range: resolver.range,
    });
    if (decoded) {
      resolver.configuration = decoded.configuration;
      resolver.range = decoded.range;
      resolver.rangeFirstText = formatVersion(decoded.range.first);
      resolver.rangeLastText = formatVersion(decoded.range.last);

      const preset = findPreset(decoded.presetId);
      resolver.presetId =
        preset && configurationsEqual(preset.configuration, decoded.configuration)
          ? preset.id
          : null;
    }

    resolver.ready = true;

    import('./setup-check.svelte')
      .then((module) => {
        SetupCheck = module.default;
      })
      .catch(() => {
        setupFailed = true;
      });
  });

  // Keep the address bar in step with the controls, once the person has changed one.
  $effect(() => {
    if (!resolver.ready || !resolver.touched) return;

    const query = encodeConfiguration({
      configuration: resolver.configuration,
      presetId: resolver.presetId,
      range: resolver.range,
    });

    try {
      // SvelteKit's own replaceState, because writing to window.history directly
      // conflicts with its router.
      replaceState(`#${query}`, {});
    } catch {
      // The address bar is a convenience. The page works without it.
    }
  });
</script>

<SEO title={data.title} description={data.description} {jsonLd} />

<div class="space-y-12">
  <header class="max-w-3xl space-y-3">
    <h1 class="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
      Which model actually runs your subagent.
    </h1>
    <p class="text-lg text-slate-600 dark:text-slate-300">
      Setting <code
        class="rounded bg-slate-100 px-1 py-0.5 font-mono text-[0.9em] dark:bg-slate-800"
        >model: opus</code
      > on a subagent isn’t the whole story. Four things compete to decide, and which one wins changed
      in Claude Code 2.1.251. The same unedited configuration resolved to Haiku before that release and
      Opus after it, and nothing in the file says which one you got.
    </p>
    <p class="text-lg text-slate-600 dark:text-slate-300">
      Start with a scenario, then change anything. This page has no server and sends nothing
      anywhere.
    </p>
  </header>

  <section aria-labelledby="start-heading" class="space-y-4">
    <h2 id="start-heading" class="text-xl font-bold text-slate-900 dark:text-white">Start here</h2>
    <PresetPicker selectedId={resolver.presetId} ready={resolver.ready} onSelect={selectPreset} />
  </section>

  <div id="answer" class="scroll-mt-6">
    <AnswerBanner configuration={effective} {version} {resolution} {flags} />
  </div>

  <section aria-labelledby="configuration-heading" class="space-y-4">
    <h2 id="configuration-heading" class="text-xl font-bold text-slate-900 dark:text-white">
      Your configuration
    </h2>
    <ResolverControls
      configuration={resolver.configuration}
      range={resolver.range}
      ready={resolver.ready}
      onChange={change}
      linkMessage={resolver.linkMessage}
      linkText={resolver.linkText}
      onCopyLink={copyLink}
    />
  </section>

  <section aria-labelledby="ladder-heading" class="space-y-4">
    <h2 id="ladder-heading" class="text-xl font-bold text-slate-900 dark:text-white">
      How it resolved
    </h2>
    <div class="max-w-3xl">
      <ResolutionLadder steps={resolution.steps} />
    </div>
  </section>

  <section aria-labelledby="strip-heading" class="space-y-4">
    <div class="space-y-1">
      <h2 id="strip-heading" class="text-xl font-bold text-slate-900 dark:text-white">
        The same config across every version
      </h2>
      <p class="max-w-3xl text-sm text-slate-600 dark:text-slate-300">
        Every other control stays put while the version changes. Darker means more expensive.
      </p>
    </div>
    <VersionStrip
      {across}
      range={resolver.range}
      current={version}
      ready={resolver.ready}
      onSelectVersion={selectVersion}
    />
    <details class="max-w-xl">
      <summary
        class="cursor-pointer text-sm font-semibold text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white"
      >
        Change the version range
      </summary>
      <div class="mt-3 grid gap-4 sm:grid-cols-2">
        <div class="space-y-1.5">
          <label for="range-first" class={labelClasses}>First version</label>
          <input
            id="range-first"
            type="text"
            value={resolver.rangeFirstText}
            disabled={!resolver.ready}
            oninput={(event) => editRange('first', event.currentTarget.value)}
            aria-invalid={rangeError ? true : undefined}
            aria-describedby="range-hint"
            autocomplete="off"
            spellcheck="false"
            class="{fieldClasses} font-mono tabular-nums"
          />
        </div>
        <div class="space-y-1.5">
          <label for="range-last" class={labelClasses}>Last version</label>
          <input
            id="range-last"
            type="text"
            value={resolver.rangeLastText}
            disabled={!resolver.ready}
            oninput={(event) => editRange('last', event.currentTarget.value)}
            aria-invalid={rangeError ? true : undefined}
            aria-describedby="range-hint"
            autocomplete="off"
            spellcheck="false"
            class="{fieldClasses} font-mono tabular-nums"
          />
        </div>
      </div>
      <p
        id="range-hint"
        class="mt-2 text-sm {rangeError ? 'text-red-700 dark:text-red-400' : hintClasses}"
      >
        {rangeError ??
          `The rules are verified through 2.1.289. A longer range assumes nothing changes after that.`}
      </p>
    </details>
  </section>

  <section aria-labelledby="setup-heading" class="space-y-4">
    <div class="max-w-3xl space-y-1">
      <h2 id="setup-heading" class="text-xl font-bold text-slate-900 dark:text-white">
        Check your own setup
      </h2>
      <p class="text-slate-600 dark:text-slate-300">
        Drop your agent folders and settings files, or paste a few commands’ output, and see which
        of your agents change across 2.1.251. This page has no server and sends nothing anywhere.
      </p>
    </div>
    {#if SetupCheck}
      <SetupCheck
        bind:setup={resolver.setup}
        controls={effective}
        range={resolver.range}
        ready={resolver.ready}
        onLoadConfiguration={loadConfiguration}
      />
    {:else if setupFailed}
      <p role="alert" class="text-sm text-red-700 dark:text-red-400">
        The setup checker didn’t load. Reload the page to try again.
      </p>
    {:else}
      <p class="text-sm text-slate-500 dark:text-slate-400">Loading the setup checker…</p>
    {/if}
  </section>

  <section aria-labelledby="boundaries-heading" class="space-y-4">
    <div class="space-y-1">
      <h2 id="boundaries-heading" class="text-xl font-bold text-slate-900 dark:text-white">
        Releases that change the answer
      </h2>
      <p class="max-w-3xl text-sm text-slate-600 dark:text-slate-300">
        The Source column says where each rule was verified. A rule marked “docs only” is in the
        documentation but not the changelog.
      </p>
    </div>
    <BoundaryTable />
  </section>

  <FooterNotes />
</div>
