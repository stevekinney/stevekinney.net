<script lang="ts">
  import { Link } from '@lucide/svelte';
  import { onMount, tick } from 'svelte';

  import { replaceState } from '$app/navigation';
  import Button from '$lib/components/button';
  import SEO from '$lib/components/seo.svelte';
  import { url } from '$lib/metadata';
  import { buildBreadcrumbSchema } from '$lib/structured-data';

  import { copyText } from './copy-text';
  import { parseDeck, serializeDeck, toScenario } from './custom-scenarios';
  import type { CustomCard } from './custom-scenarios';
  import { advance, pick, retryMisses, startGame } from './deal';
  import type { GameState } from './deal';
  import { experiment } from './experiment';
  import { bodyClasses, fieldClasses, headingClasses } from './field-styles';
  import LadderStrip from './ladder-strip.svelte';
  import type { RungId } from './ladder';
  import LazySection from './lazy-section.svelte';
  import type { LintItem } from './lint';
  import { lintPresets } from './lint-presets';
  import { classificationLabels, cloneRules } from './lint-rules';
  import type { LintRules } from './lint-rules';
  import MechanismCard from './mechanism-card.svelte';
  import MechanismMap from './mechanism-map.svelte';
  import { findMechanism } from './mechanisms';
  import type { Concern, MechanismId } from './mechanisms';
  import PageFooter from './page-footer.svelte';
  import PredictCard from './predict-card.svelte';
  import { outlineScenarios } from './scenarios';
  import { decodeView, encodeView, modes } from './share-link';
  import type { Mode } from './share-link';

  const { data } = $props();

  const jsonLd = buildBreadcrumbSchema([
    { name: 'Experiments', url: `${url}/experiments` },
    { name: experiment.title, url: `${url}/experiments/mechanism-picker` },
  ]);

  const STORAGE_KEY = 'mechanism-picker:custom-cards';
  // The page is prerendered with this seed. Once it's interactive, a link's seed or a random one replaces it.
  const PRERENDER_SEED = 1;
  const randomSeed = (): number => Math.floor(Math.random() * 999_999) + 1;

  const modeLabels: Record<Mode, string> = { map: 'Map', sort: 'Sort', lint: 'Lint' };
  const samplePreset = lintPresets[0];

  /** What lights the ladder: a mechanism anywhere on the page, or a linted line. */
  type Selection =
    | { kind: 'mechanism'; id: MechanismId }
    | { kind: 'line'; lineNumber: number; rung: RungId | null; label: string };

  // One state object. Everything on the page is derived from it.
  const picker = $state({
    ready: false,
    touched: false,
    mode: 'map' as Mode,
    selection: null as Selection | null,
    map: { selectedId: null as MechanismId | null, concern: null as Concern | null },
    predict: { pick: null as MechanismId | null, revealed: false },
    game: startGame(outlineScenarios, PRERENDER_SEED) as GameState,
    custom: [] as CustomCard[],
    storageAvailable: false,
    lint: {
      text: samplePreset.text,
      fileName: samplePreset.fileName as string | null,
      presetId: samplePreset.id as string | null,
      rules: cloneRules() as LintRules,
      selectedLine: null as number | null,
    },
    link: { message: null as string | null, text: null as string | null },
  });

  const deck = $derived([...outlineScenarios, ...picker.custom.map(toScenario)]);

  const ladder = $derived.by(() => {
    const selection = picker.selection;
    if (!selection) return { lit: null, label: null, note: null };

    if (selection.kind === 'mechanism') {
      const mechanism = findMechanism(selection.id);
      return {
        lit: mechanism.rung,
        label: mechanism.name,
        note: `${mechanism.name} isn’t on the ladder. ${mechanism.enforcement}${mechanism.enforcement.endsWith('.') ? '' : '.'}`,
      };
    }

    return {
      lit: selection.rung,
      label: selection.label,
      note: `${selection.label} doesn’t point to a rung.`,
    };
  });

  const selectedMechanism = $derived(
    picker.map.selectedId ? findMechanism(picker.map.selectedId) : null,
  );

  const touch = (): void => {
    picker.touched = true;
  };

  const selectMode = (mode: Mode, focus = false): void => {
    picker.mode = mode;
    touch();
    if (focus) void tick().then(() => document.getElementById(`tab-${mode}`)?.focus());
  };

  const onTabKey = (event: KeyboardEvent): void => {
    const index = modes.indexOf(picker.mode);
    const next =
      event.key === 'ArrowRight'
        ? modes[(index + 1) % modes.length]
        : event.key === 'ArrowLeft'
          ? modes[(index - 1 + modes.length) % modes.length]
          : event.key === 'Home'
            ? modes[0]
            : event.key === 'End'
              ? modes[modes.length - 1]
              : null;
    if (!next) return;

    event.preventDefault();
    selectMode(next, true);
  };

  const selectMechanism = (id: MechanismId, focusCard = false): void => {
    picker.map.selectedId = id;
    picker.selection = { kind: 'mechanism', id };
    if (focusCard) {
      void tick().then(() => {
        const heading = document.getElementById('card-heading');
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        heading?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
        heading?.focus({ preventScroll: true });
      });
    }
  };

  const saveCustom = (cards: CustomCard[]): void => {
    try {
      if (cards.length === 0) window.localStorage.removeItem(STORAGE_KEY);
      else window.localStorage.setItem(STORAGE_KEY, serializeDeck(cards));
    } catch {
      // Storage is a convenience. The deck still works for this visit.
    }
  };

  const setCustom = (cards: CustomCard[]): void => {
    picker.custom = cards;
    saveCustom(cards);
    // The deck changed, so deal it again with the same seed.
    picker.game = startGame(deck, picker.game.seed);
  };

  const selectLine = (item: LintItem | null): void => {
    picker.lint.selectedLine = item?.lineNumber ?? null;
    picker.selection = item
      ? {
          kind: 'line',
          lineNumber: item.lineNumber,
          rung: item.rung,
          label: `Line ${item.lineNumber} (${classificationLabels[item.primary].toLowerCase()})`,
        }
      : null;
  };

  const setLintText = (text: string, fileName: string | null, presetId: string | null): void => {
    picker.lint.text = text;
    picker.lint.fileName = fileName;
    picker.lint.presetId = presetId;
    selectLine(null);
  };

  const copyLink = async (): Promise<void> => {
    const link = `${window.location.origin}${window.location.pathname}#${encodeView({
      mode: picker.mode,
      seed: picker.game.seed,
    })}`;

    if (await copyText(link)) {
      picker.link = {
        text: null,
        message:
          picker.mode === 'sort'
            ? `Link copied. It deals this game’s order with seed ${picker.game.seed}, and holds nothing you added.`
            : 'Link copied. It opens this mode, and holds nothing you pasted or uploaded.',
      };
    } else {
      picker.link = {
        text: link,
        message: 'Couldn’t reach the clipboard. Press ⌘C on a Mac, or Ctrl+C, to copy the link.',
      };
    }
  };

  onMount(() => {
    let storageAvailable = false;
    let saved: CustomCard[] = [];
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      storageAvailable = true;
      if (stored) saved = parseDeck(stored).cards;
    } catch {
      // Private windows and blocked storage land here. The page works without it.
    }
    picker.storageAvailable = storageAvailable;
    picker.custom = saved;

    // The hash doesn't exist while the page prerenders, so it's read here.
    const shared = decodeView(window.location.hash.slice(1));
    if (shared) picker.mode = shared.mode;
    picker.game = startGame(
      [...outlineScenarios, ...saved.map(toScenario)],
      shared?.seed ?? randomSeed(),
    );

    picker.ready = true;
  });

  // Keep the address bar in step with the mode and seed, once the person has changed something.
  $effect(() => {
    if (!picker.ready || !picker.touched) return;

    const query = encodeView({ mode: picker.mode, seed: picker.game.seed });

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
      Which primitive?
    </h1>
    <p class="text-lg text-slate-600 dark:text-slate-300">
      Should this be a prompt, an instruction, a skill, a subagent, a hook, a workflow, a goal, a
      loop, a routine, or CI? The course outline answers that in a handful of tables. This page puts
      them in one place, lets you test yourself against them, and checks a real instructions file
      for rules that need something stronger than prose.
    </p>
    <p class="text-lg text-slate-600 dark:text-slate-300">
      Writing a rule down doesn’t make it happen. Everything here shows where a choice sits on the
      ladder from “asks” to “refuses.”
    </p>
  </header>

  <section aria-labelledby="predict-heading" class="space-y-4">
    <div class="max-w-3xl space-y-1">
      <h2 id="predict-heading" class={headingClasses}>Predict first</h2>
      <p class={bodyClasses}>Before anything else, where would you put this one?</p>
    </div>
    <PredictCard
      pick={picker.predict.pick}
      revealed={picker.predict.revealed}
      ready={picker.ready}
      onPick={(id) => {
        picker.predict.pick = id;
        picker.selection = { kind: 'mechanism', id };
      }}
      onReveal={() => (picker.predict.revealed = true)}
      onReset={() => {
        picker.predict = { pick: null, revealed: false };
        picker.selection = null;
      }}
    />
  </section>

  <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_15rem]">
    <div class="min-w-0 space-y-6">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="Modes"
          tabindex="-1"
          class="flex gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800"
          onkeydown={onTabKey}
        >
          {#each modes as mode (mode)}
            <button
              type="button"
              role="tab"
              id="tab-{mode}"
              aria-selected={picker.mode === mode}
              aria-controls="panel-{mode}"
              tabindex={picker.mode === mode ? 0 : -1}
              disabled={!picker.ready}
              onclick={() => selectMode(mode)}
              class="focus-visible:outline-primary-600 cursor-pointer rounded-md px-4 py-1.5 text-sm font-semibold text-slate-700 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-1 disabled:cursor-not-allowed aria-selected:bg-white aria-selected:text-slate-900 aria-selected:shadow-sm aria-selected:ring-1 aria-selected:ring-slate-300 dark:text-slate-300 dark:hover:bg-slate-700 dark:aria-selected:bg-slate-600 dark:aria-selected:text-white dark:aria-selected:ring-slate-500"
            >
              {modeLabels[mode]}
            </button>
          {/each}
        </div>
        <Button
          variant="secondary"
          size="small"
          icon={Link}
          disabled={!picker.ready}
          onclick={copyLink}
        >
          Copy link
        </Button>
      </div>
      {#if picker.link.message}
        <div class="space-y-2">
          <p class="text-sm text-slate-600 dark:text-slate-300" aria-live="polite">
            {picker.link.message}
          </p>
          {#if picker.link.text}
            <label class="block">
              <span class="sr-only">Link to this view</span>
              <input
                readonly
                class="{fieldClasses} font-mono text-xs"
                value={picker.link.text}
                onfocus={(event) => event.currentTarget.select()}
              />
            </label>
          {/if}
        </div>
      {/if}

      <div
        id="panel-{picker.mode}"
        role="tabpanel"
        aria-labelledby="tab-{picker.mode}"
        class="space-y-6"
      >
        {#if picker.mode === 'map'}
          <div class="max-w-3xl space-y-1">
            <h2 class={headingClasses}>The map</h2>
            <p class={bodyClasses}>
              Across: who decides it runs. Down: how strongly it enforces, from refusing no matter
              what at the top to only asking. Choose a mechanism to open its card and light its
              rung.
            </p>
          </div>
          <MechanismMap
            selectedId={picker.map.selectedId}
            concern={picker.map.concern}
            ready={picker.ready}
            onSelect={(id) => selectMechanism(id)}
            onConcern={(concern) => (picker.map.concern = concern)}
          />
          {#if selectedMechanism}
            <MechanismCard
              mechanism={selectedMechanism}
              ready={picker.ready}
              onSelect={(id) => selectMechanism(id, true)}
            />
          {/if}
        {:else if picker.mode === 'sort'}
          <div class="max-w-3xl space-y-1">
            <h2 class={headingClasses}>The sorting game</h2>
            <p class={bodyClasses}>
              Place each scenario on the mechanism you’d use. Every answer comes from the course
              outline, and some have more than one defensible answer.
            </p>
          </div>
          <LazySection
            name="the sorting game"
            load={() => import('./sorting-game.svelte')}
            props={{
              deck,
              game: picker.game,
              ready: picker.ready,
              customCards: picker.custom,
              storageAvailable: picker.storageAvailable,
              onPick: (id: MechanismId) => {
                picker.game = pick(picker.game, id);
                picker.selection = { kind: 'mechanism', id };
              },
              onNext: () => (picker.game = advance(picker.game)),
              onRetry: () => (picker.game = retryMisses(picker.game, deck)),
              onShuffle: () => {
                picker.game = startGame(deck, randomSeed());
                touch();
              },
              onRestart: () => (picker.game = startGame(deck, picker.game.seed)),
              onCustomChange: setCustom,
            }}
          />
        {:else}
          <div class="max-w-3xl space-y-1">
            <h2 class={headingClasses}>The instructions linter</h2>
            <p class={bodyClasses}>
              Paste or drop a project instructions file. Each line and bullet is classified with
              simple rules you can read and edit, and each one shows the rule that fired. Headings
              and code blocks are skipped.
            </p>
          </div>
          <LazySection
            name="the linter"
            load={() => import('./instructions-linter.svelte')}
            props={{
              text: picker.lint.text,
              fileName: picker.lint.fileName,
              presetId: picker.lint.presetId,
              rules: picker.lint.rules,
              selectedLine: picker.lint.selectedLine,
              ready: picker.ready,
              onText: setLintText,
              onRules: (rules: LintRules) => (picker.lint.rules = rules),
              onSelectLine: selectLine,
            }}
          />
        {/if}
      </div>
    </div>

    <div class="order-first lg:sticky lg:top-4 lg:order-last lg:self-start">
      <LadderStrip lit={ladder.lit} selectionLabel={ladder.label} offLadderNote={ladder.note} />
    </div>
  </div>

  <PageFooter />
</div>
