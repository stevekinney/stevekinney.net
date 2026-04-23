<script lang="ts">
  import Link from '$lib/components/link.svelte';
  import { merge } from '$merge';
  import type { CourseContentsData } from '@stevekinney/utilities/content-types';

  type Props = {
    data: CourseContentsData;
    courseSlug: string;
  };

  const { data, courseSlug }: Props = $props();

  const resolveHref = (href: string): string => {
    if (href.startsWith('http://') || href.startsWith('https://')) return href;
    return `/courses/${courseSlug}/${href.replace(/\.md$/, '')}`;
  };
</script>

<aside data-markdown-contents>
  {#each data.section as section (section.title)}
    {#if section.title}
      <h2 class={merge('mb-2 font-bold')} data-markdown-heading>{section.title}</h2>
    {/if}
    <ul class={merge('mb-8 space-y-1')} data-markdown-list>
      {#each section.item as item (item.href)}
        <li>
          <Link
            href={resolveHref(item.href)}
            class="font-normal decoration-2 underline-offset-2"
            data-markdown-link
          >
            {item.title}
          </Link>
          {#if item.related?.length}
            ({#each item.related as link (link.href)}<Link
                href={resolveHref(link.href)}
                class="font-normal decoration-2 underline-offset-2"
                data-markdown-link>{link.title}</Link
              >{#if link !== item.related?.at(-1)},
              {/if}{/each})
          {/if}
        </li>
      {/each}
    </ul>
  {/each}
</aside>
