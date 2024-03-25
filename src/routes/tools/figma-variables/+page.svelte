<script context="module" lang="ts">
	const title = 'Figma Spacing Variable Generator';
	const description = 'Generate Figma variables for spacing in your design system.';

	export const metadata = {
		title,
		description,
	};
</script>

<script lang="ts">
	import { enhance } from '$app/forms';
	import { Trash } from 'lucide-svelte';

	import README from './README.md';
	import SEO from '$lib/components/seo.svelte';
	import { generateFigmaSpacingVariables } from './generate-variables';

	export let data;

	$: collection = generateFigmaSpacingVariables('Spacing', data.variables);
</script>

<SEO {title} {description} />

<main class="grid grid-cols-2 gap-8">
	<header class="col-span-2">
		<h1 class="text-4xl font-bold">Generate Figma Variables for Spacing</h1>
	</header>

	<form class="space-y-4" method="POST" action="?/add" use:enhance>
		<h2 class="font-semibold">Create a New Variable</h2>
		<label class="sr-only" for="new-spacing-name">Variable Name</label>
		<input class="w-full" id="new-spacing-name" name="key" placeholder="Variable Name" required />
		<div class="flex items-center gap-4">
			<label class="sr-only" for="new-spacing-value">Value</label>
			<input
				class="w-full"
				id="new-spacing-value"
				type="number"
				name="value"
				placeholder="Value"
				required
			/>
			<select name="unit">
				<option value="rem">rem</option>
				<option value="px">px</option>
			</select>
		</div>
		<div class="flex gap-2">
			<button class="w-full" type="submit">Add</button>
		</div>
	</form>

	<section class="space-y-8">
		<README class="prose dark:prose-invert" />
		<form method="POST" action="?/reset" class="flex items-start gap-2" use:enhance>
			<button>Reset to Defaults</button>
			<a
				class="button"
				href="data:text/json;charset=utf-8,{JSON.stringify(collection, null, 2)}"
				download="Spacing.json"
			>
				Download
			</a>
		</form>
	</section>

	<table class="col-span-2 text-sm">
		<thead>
			<tr>
				<th>Variable</th>
				<th>Value (Pixels)</th>
				<th>Code Syntax</th>
				<th class="max-w-8"><span class="sr-only">Remove</span></th>
			</tr>
		</thead>
		<tbody>
			{#each collection.variables as variable}
				{@const [value] = Object.values(variable.valuesByMode)}
				<tr>
					<td class="flex items-center gap-2">
						{variable.name}
					</td>
					<td>{value}</td>
					<td><code>{variable.codeSyntax.WEB}</code></td>
					<td class="max-w-8 text-center">
						<form method="post" action="?/remove" use:enhance>
							<label class="sr-only" for="remove-spacing-name">Remove {variable.name}</label>
							<input type="hidden" name="key" value={variable.name} />
							<button class="ghost small"><Trash class="h-4" /></button>
						</form>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</main>
