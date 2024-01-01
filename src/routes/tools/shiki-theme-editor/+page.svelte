<script>
	import ShikiThemeCreator from './shiki-theme-editor.svelte';
</script>

<div class="space-y-10">
	<section class="prose">
		<h1 class="text-xl font-bold">Shiki CSS Variable Theme Editor</h1>

		<p>
			A simple little tool that let's you tweak CSS variables when using the <code>
				css-variables
			</code>
			theme in <a href="https://shiki.matsu.io/">Shiki</a>. You can
			<a href="/writing/creating-custom-shiki-themes">read more about how it works</a>.
		</p>
	</section>

	<ShikiThemeCreator />
</div>
