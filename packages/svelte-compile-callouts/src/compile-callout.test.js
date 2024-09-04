import { describe, expect, test } from 'vitest';
import { compileCallout } from './compile-callout.js';

describe('compilers/callouts/compile-callout', () => {
	test('should compile a callout object into HTML', () => {
		const callout = {
			title: 'Title',
			variant: 'note',
			description: '<p>Description</p>',
			foldable: false,
		};

		expect(compileCallout(callout)).toBe(
			`<Callout title="Title" variant="note"><p>Description</p></Callout>`,
		);
	});

	test('should compile a callout object without a description', () => {
		const callout = {
			title: 'Title',
			variant: 'note',
			description: undefined,
			foldable: false,
		};

		expect(compileCallout(callout)).toBe('<Callout title="Title" variant="note" />');
	});
});
