import { page } from '$app/stores';
import { derived } from 'svelte/store';

export const title = derived(page, ($page) => {
	if ($page.data.meta?.title) {
		return `${$page.data.meta.title} | Steve Kinney`;
	}

	return 'Steve Kinney';
});

export const description = derived(page, ($page) => {
	if ($page.data.meta?.description) {
		return $page.data.meta.description;
	}

	return 'Steve Kinney is a teacher, artist, and software engineer out of Denver, Colorado, USA.';
});

export const openGraphUrl = derived(page, ($page) => {
	const url = new URL('/open-graph.jpg', $page.url);

	const title = $page.data.meta?.title;
	const description = $page.data.meta?.description;

	if (title) url.searchParams.set('title', encodeURIComponent(title));
	if (description) url.searchParams.set('description', encodeURIComponent(description));

	return `${url.pathname}${url.search}`;
});

export const url = derived(page, ($page) => {
	return $page.url.href;
});
