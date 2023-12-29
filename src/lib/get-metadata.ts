import { page } from '$app/stores';
import { derived } from 'svelte/store';

export const openGraphUrl = derived(page, ($page) => {
	const url = new URL('/open-graph.svg', $page.url);

	const title = $page.data.meta?.title;
	const description = $page.data.meta?.description;

	if (title) url.searchParams.set('title', encodeURIComponent(title));
	if (description) url.searchParams.set('description', encodeURIComponent(description));

	return `${url.pathname}${url.search}`;
});
