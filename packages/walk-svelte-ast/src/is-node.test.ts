import { describe, it, expect } from 'vitest';
import { isNode } from './is-node';
import { parse } from 'svelte/compiler';

// Helper function to generate nodes from Svelte templates
const getNode = (template: string) => {
	const { html } = parse(template);
	return (html.children || [])[0];
};

describe('isNode function', () => {
	it('should return true for valid nodes from the Svelte compiler', () => {
		const node = getNode('<div></div>');
		expect(isNode(node)).toBe(true);
	});

	it('should return false for null or non-object values', () => {
		expect(isNode(null)).toBe(false);
		expect(isNode(123)).toBe(false);
		expect(isNode('string')).toBe(false);
	});

	it('should return false for arrays', () => {
		expect(isNode([])).toBe(false);
	});

	it('should return false for objects without the required properties', () => {
		expect(isNode({ type: 'NodeWithoutStart' })).toBe(false);
		expect(isNode({ start: 0 })).toBe(false);
		expect(isNode({ type: 'Node', start: 0 })).toBe(false);
	});

	it('should return false if node properties are of the wrong types', () => {
		const invalidNode = { type: 123, start: 'start', end: 'end' };
		expect(isNode(invalidNode)).toBe(false);
	});
});
