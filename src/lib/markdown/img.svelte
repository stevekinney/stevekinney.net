<script lang="ts">
	export let src: string;
	export let alt: string;
</script>

<picture>
	<source
		srcset="{src}?format=avif 768px, {src}?format=webp 768w"
		sizes="(min-width: 640px) 768px, 768px"
		type="image/avif"
	/>
	<img src="{src}?format=avif" {alt} class="rounded-md shadow-md" {...$$restProps} />
</picture>
