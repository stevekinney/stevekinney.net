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
	import { Trash, Download, ListRestart } from 'lucide-svelte';

	import README from './README.md';
	import SEO from '$lib/components/seo.svelte';
	import { generateFigmaSpacingVariables } from './generate-variables';

	export let data;

	$: collection = generateFigmaSpacingVariables('Spacing', data.variables);
</script>

<SEO {title} {description} />

<main class="grid grid-cols-1 gap-8 md:grid-cols-2">
	<section class="space-y-8">
		<README class="prose dark:prose-invert" />
		<form
			method="POST"
			action="?/reset"
			class="flex items-start justify-center gap-2 md:justify-start"
			use:enhance
		>
			<button type="submit"><ListRestart />Reset to Defaults</button>
			<a
				class="button"
				href="data:text/json;charset=utf-8,{JSON.stringify(collection, null, 2)}"
				download="Spacing.json"
			>
				<Download class="h-4" />
				Download
			</a>
		</form>
	</section>

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

	<table class="text-sm md:col-span-2">
		<thead>
			<tr>
				<th>Variable</th>
				<th colspan="2">Value (Pixels)</th>
				<th>Code Syntax</th>
				<th><span class="sr-only">Remove</span></th>
			</tr>
		</thead>
		<tbody>
			{#each collection.variables as variable}
				{@const [value] = Object.values(variable.valuesByMode)}
				<tr>
					<th class="flex">
						{variable.name}
					</th>
					<td class="text-right">{value}</td>
					<td>
						<div
							class=" h-4 bg-primary-300"
							class:hidden={!variable.codeSyntax.WEB.includes('rem')}
							style="width: {variable.codeSyntax.WEB};"
						/>
					</td>
					<td><code>{variable.codeSyntax.WEB}</code></td>
					<td class="text-center">
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
