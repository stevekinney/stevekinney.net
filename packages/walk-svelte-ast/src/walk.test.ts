import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parse } from 'svelte/compiler';

import { walk, type Visitor } from './index';

// Helper function to generate nodes from Svelte templates
const parseMarkup = (template: string) => {
	const { html } = parse(template);
	return html;
};

describe('Walker class', () => {
	let enterMock: ReturnType<typeof vi.fn>;
	let exitMock: ReturnType<typeof vi.fn>;
	let visitor: Visitor;

	beforeEach(() => {
		enterMock = vi.fn();
		exitMock = vi.fn();
		visitor = {
			enter: enterMock,
			exit: exitMock,
		};
	});

	it('should visit the root node from Svelte template', () => {
		const node = parseMarkup('<div></div>');
		walk(node, visitor);

		expect(enterMock).toHaveBeenCalledWith(node);
		expect(exitMock).toHaveBeenCalledWith(node);
	});

	it('should visit child nodes in nested Svelte template', () => {
		const node = parseMarkup('<div><p></p></div>');
		walk(node, visitor);

		expect(enterMock).toHaveBeenCalledTimes(3); // div, p, and text
		expect(exitMock).toHaveBeenCalledTimes(3);
	});

	it('should stop walking when visitor is cancelled', () => {
		enterMock.mockImplementation((node) => {
			if (node.type === 'Element' && node.name === 'p') return false;
		});

		const node = parseMarkup('<div><p><span></span></p></div>');
		walk(node, visitor);

		// Enter should be called for div, but not fully for p
		expect(enterMock).toHaveBeenCalledTimes(3); // root, div and p
		expect(enterMock).not.toHaveBeenCalledWith(expect.objectContaining({ name: 'span' }));
		expect(exitMock).not.toHaveBeenCalledWith(expect.objectContaining({ name: 'p' }));
	});

	it('should visit deeply nested structures', () => {
		const node = parseMarkup('<div><section><p></p></section></div>');
		walk(node, visitor);

		expect(enterMock).toHaveBeenCalledTimes(4); // root, div, section, p
		expect(exitMock).toHaveBeenCalledTimes(4);
	});

	it('should not visit the same node twice', () => {
		const node = parseMarkup('<div><p>Hello</p><p>World</p></div>');
		walk(node, visitor);

		expect(enterMock).toHaveBeenCalledTimes(6); // root, div, two p's, and text nodes
	});
});
