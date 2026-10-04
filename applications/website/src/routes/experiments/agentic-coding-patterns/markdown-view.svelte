<script lang="ts">
  import { parseBlocks } from './markdown';
  import type { Block, Inline } from './markdown';
  import type { PatternEntry } from './pattern-types';

  type Props = {
    markdown: string;
    /** Finds the entry a `[[wikilink]]` names, so it can become a link inside the page. */
    resolve: (name: string) => PatternEntry | undefined;
    hrefFor: (id: string) => string;
    onOpen: (id: string, event: MouseEvent) => void;
    class?: string;
  };

  const { markdown, resolve, hrefFor, onOpen, class: className = '' }: Props = $props();

  // The note is parsed into plain data and rendered here as ordinary elements,
  // so Svelte escapes every string. No note text ever reaches `{@html}`.
  const blocks = $derived(parseBlocks(markdown));

  const linkClass =
    'text-primary-700 dark:text-primary-300 underline decoration-1 underline-offset-2 hover:decoration-2';
</script>

{#snippet inline(nodes: Inline[])}
  {#each nodes as node, index (index)}
    {#if node.type === 'text'}
      {node.text}
    {:else if node.type === 'emphasis'}
      <em>{@render inline(node.children)}</em>
    {:else if node.type === 'strong'}
      <strong class="font-semibold text-slate-900 dark:text-white">
        {@render inline(node.children)}
      </strong>
    {:else if node.type === 'delete'}
      <del>{@render inline(node.children)}</del>
    {:else if node.type === 'code'}
      <code
        class="rounded bg-slate-100 px-1 py-0.5 font-mono text-[0.875em] break-words dark:bg-slate-800"
        >{node.text}</code
      >
    {:else if node.type === 'link'}
      <a href={node.href} target="_blank" rel="noopener noreferrer" class={linkClass}
        >{@render inline(node.children)}<span class="sr-only"> (opens in a new tab)</span></a
      >
    {:else if node.type === 'wikilink'}
      {@const target = resolve(node.target)}
      {#if target}
        <a href={hrefFor(target.id)} onclick={(event) => onOpen(target.id, event)} class={linkClass}
          >{node.label}</a
        >
      {:else}
        {node.label}
      {/if}
    {:else if node.type === 'break'}
      <br />
    {/if}
  {/each}
{/snippet}

{#snippet blockList(items: Block[])}
  {#each items as block, index (index)}
    {#if block.type === 'paragraph'}
      <p>{@render inline(block.children)}</p>
    {:else if block.type === 'heading'}
      <h4 class="font-semibold text-slate-900 dark:text-white">{@render inline(block.children)}</h4>
    {:else if block.type === 'list'}
      {#if block.ordered}
        <ol start={block.start} class="list-decimal space-y-1.5 pl-5">
          {#each block.items as item, itemIndex (itemIndex)}
            <li class="space-y-1.5">{@render blockList(item)}</li>
          {/each}
        </ol>
      {:else}
        <ul class="list-disc space-y-1.5 pl-5">
          {#each block.items as item, itemIndex (itemIndex)}
            <li class="space-y-1.5">{@render blockList(item)}</li>
          {/each}
        </ul>
      {/if}
    {:else if block.type === 'blockquote'}
      <blockquote class="space-y-2 border-l-4 border-slate-300 pl-3 dark:border-slate-600">
        {@render blockList(block.children)}
      </blockquote>
    {:else if block.type === 'code'}
      <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
      <pre
        tabindex="0"
        class="focus-visible:outline-primary-600 overflow-x-auto rounded bg-slate-100 p-3 font-mono text-sm focus-visible:outline-2 dark:bg-slate-800"><code
          >{block.text}</code
        ></pre>
    {/if}
  {/each}
{/snippet}

<div class="space-y-3 break-words {className}">
  {@render blockList(blocks)}
</div>
