<script lang="ts">
  import Button from '$lib/components/button';
  import { ChevronLeft, ChevronRight } from 'lucide-svelte';

  type Props = {
    currentPage: number;
    totalPages: number;
    buildHref: (page: number) => string;
    class?: string;
  };

  const { currentPage, totalPages, buildHref, class: className = '' }: Props = $props();

  const hasPreviousPage = $derived(currentPage > 1);
  const hasNextPage = $derived(currentPage < totalPages);
  const pages = $derived(Array.from({ length: totalPages }, (_, index) => index + 1));
</script>

{#if totalPages > 1}
  <nav aria-label="Pagination" class={className}>
    <ul class="flex items-center gap-2">
      <li>
        {#if hasPreviousPage}
          <Button
            href={buildHref(currentPage - 1)}
            variant="ghost"
            size="small"
            icon={ChevronLeft}
            label="Previous"
          />
        {/if}
      </li>

      {#each pages as page (page)}
        <li>
          <Button
            href={buildHref(page)}
            variant={page === currentPage ? 'primary' : 'secondary'}
            size="small"
            label={String(page)}
            aria-current={page === currentPage ? 'page' : undefined}
          />
        </li>
      {/each}

      <li>
        {#if hasNextPage}
          <Button
            href={buildHref(currentPage + 1)}
            variant="ghost"
            size="small"
            icon={ChevronRight}
            iconPosition="right"
            label="Next"
          />
        {/if}
      </li>
    </ul>
  </nav>
{/if}
