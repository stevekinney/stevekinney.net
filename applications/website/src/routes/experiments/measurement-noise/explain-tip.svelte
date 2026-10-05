<script lang="ts">
  import { tick } from 'svelte';
  import type { Snippet } from 'svelte';

  import { centerTooltip } from './tooltip-position';

  type Props = {
    /** The explanation, in words. */
    text: string;
    /** What the trigger shows, such as a number. */
    children: Snippet;
    /** Extra classes for the trigger. */
    class?: string;
    testId?: string;
  };

  const { text, children, class: className = '', testId }: Props = $props();

  const id = $props.id();

  let open = $state(false);
  let left = $state(0);
  let wrapper = $state<HTMLElement>();
  let tooltip = $state<HTMLElement>();

  /** Places the tooltip under the trigger, held inside the nearest `data-tip-bounds` box. */
  const place = async (): Promise<void> => {
    open = true;
    await tick();
    if (!wrapper || !tooltip) return;

    const bounds = (
      wrapper.closest('[data-tip-bounds]') ?? document.documentElement
    ).getBoundingClientRect();
    const own = wrapper.getBoundingClientRect();
    const anchor = own.left + own.width / 2 - bounds.left;
    const width = Math.min(tooltip.offsetWidth, bounds.width);

    left = centerTooltip(anchor, width, bounds.width) - (own.left - bounds.left);
  };

  const close = (): void => {
    open = false;
  };
</script>

<span bind:this={wrapper} class="relative inline-block">
  <button
    type="button"
    aria-describedby={id}
    data-testid={testId}
    onmouseenter={place}
    onmouseleave={close}
    onfocus={place}
    onblur={close}
    onkeydown={(event) => {
      if (event.key === 'Escape') close();
    }}
    class="focus-visible:outline-primary-600 cursor-help rounded underline decoration-slate-400 decoration-dotted underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 {className}"
  >
    {@render children()}
  </button>
  <span
    bind:this={tooltip}
    {id}
    role="tooltip"
    hidden={!open}
    style:left="{left}px"
    class="absolute top-full z-20 mt-2 w-64 max-w-[calc(100vw-2rem)] rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-sm font-normal text-slate-800 shadow-lg dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
  >
    {text}
  </span>
</span>
