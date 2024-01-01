<script lang="ts">
	import { page } from '$app/stores';
	import { Github, Instagram, Twitter, Linkedin, Youtube } from 'lucide-svelte';

	import SocialLink from '$lib/components/social-link.svelte';
	import Navigation from '$lib/components/navigation.svelte';
	import { openGraphUrl, title, description, url } from '$lib/get-metadata';

	import '../app.css';
</script>

<svelte:head>
	<title>{$title}</title>
	<link rel="image_src" href={$openGraphUrl} />
	<meta name="description" content={$description} />
	<meta property="og:type" content="website" />
	<meta property="og:title" content={$title} />
	<meta property="og:description" content={$description} />
	<meta property="og:url" content={$url} />
	<meta property="og:image" content={$openGraphUrl} />
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content="Steve Kinney" />
	<meta name="twitter:site" content="@stevekinney" />
	<meta property="twitter:description" content={$description} />
	<meta property="twitter:image" content={$openGraphUrl} />
	{#if $page.data.meta?.published && $page.data.meta?.date}
		<meta name="date" content={String($page.data.meta?.date)} />
		<meta name="article:published_time" content={String($page.data.meta?.date)} />
	{/if}
	{#if $page.data.meta?.published && $page.data.meta?.modified}
		<meta name="last-modified" content={String($page.data.meta?.modified)} />
		<meta name="article:modified_time" content={String($page.data.meta?.modified)} />
	{/if}
</svelte:head>

<main
	class="container my-6 grid grid-cols-1 items-center gap-6 p-4 sm:my-10 sm:grid-cols-2 lg:grid-cols-3"
>
	<header>
		<h1 class="whitespace-nowrap lg:order-1">
			<a
				href="/"
				class="font-header text-6xl text-black decoration-primary-700 hover:underline dark:text-white"
				>Steve Kinney</a
			>
		</h1>
	</header>

	<div
		class="order-1 flex items-center justify-between gap-4 sm:order-none sm:justify-end lg:order-3"
	>
		<SocialLink href="https://github.com/stevekinney" icon={Github} />
		<SocialLink href="https://instagram.com/stevekinney" icon={Instagram} />
		<SocialLink href="https://twitter.com/stevekinney" icon={Twitter} />
		<SocialLink href="https://linkedin.com/in/stevekinney" icon={Linkedin} />
		<SocialLink href="https://www.youtube.com/channel/UChXe-1_Jh91Z_CM3ppH39Xg" icon={Youtube} />
	</div>

	<Navigation class="sm:col-start-2 sm:justify-end lg:order-2 lg:justify-center" />

	<div class="my-10 sm:col-span-full lg:order-3">
		<slot />
	</div>
</main>
