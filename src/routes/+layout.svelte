<script lang="ts">
	import { Github, Instagram, Linkedin, Twitter, Youtube } from 'lucide-svelte';

	import Navigation from '$lib/components/navigation.svelte';
	import SocialLink from '$lib/components/social-link.svelte';

	import '../app.css';

	interface Props {
		children?: import('svelte').Snippet;
	}

	const { children }: Props = $props();
</script>

<main
	class="container my-6 grid grid-cols-1 items-center gap-6 sm:my-10 sm:grid-cols-2 lg:grid-cols-3"
>
	<header>
		<h1 class="whitespace-nowrap lg:order-1">
			<a
				href="/"
				class="font-header text-6xl text-black decoration-primary-700 hover:underline dark:text-white"
			>
				Steve Kinney
			</a>
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

	<div class="my-6 sm:col-span-full lg:order-3">
		{@render children?.()}
	</div>
</main>
