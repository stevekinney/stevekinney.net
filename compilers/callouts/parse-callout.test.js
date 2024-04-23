import { describe, it, expect } from 'vitest';
import { parseCallout } from './parse-callout.js';

describe('compilers/callouts/parse-callout', () => {
	it('should parse callout text into an object', () => {
		const callout = `
      <blockquote>
        <p>[!NOTE] Title\nDescription</p>
      </blockquote>
    `.trim();

		expect(parseCallout(callout)).toEqual({
			title: 'Title',
			variant: 'note',
			description: '<p>Description</p>',
			foldable: false,
		});
	});

	it('should parse callout text without a description', () => {
		const callout = `
      <blockquote>
        <p>[!NOTE] Title</p>
      </blockquote>
    `.trim();

		expect(parseCallout(callout)).toEqual({
			title: 'Title',
			variant: 'note',
			description: undefined,
			foldable: false,
		});
	});

	it('should parse a callout with a lowecase variant', () => {
		const callout = `
      <blockquote>
        <p>[!note] Title\nDescription</p>
      </blockquote>
    `.trim();

		expect(parseCallout(callout)).toEqual({
			title: 'Title',
			variant: 'note',
			description: '<p>Description</p>',
			foldable: false,
		});
	});

	it('should parse a callout with a variant that has whitespace', () => {
		const callout = `
      <blockquote>
        <p>[! NOTE ] Title\nDescription</p>
      </blockquote>
    `.trim();

		expect(parseCallout(callout)).toEqual({
			title: 'Title',
			variant: 'note',
			description: '<p>Description</p>',
			foldable: false,
		});
	});

	it('should parse a callout with punctuation in the title', () => {
		const callout = `
      <blockquote>
        <p>[!NOTE] This vs. That\nDescription</p>
      </blockquote>
    `.trim();

		expect(parseCallout(callout)).toEqual({
			title: 'This vs. That',
			variant: 'note',
			description: '<p>Description</p>',
			foldable: false,
		});
	});

	it('should return null if no matches are found', () => {
		const callout = `
      <blockquote>
        <p>Some random text</p>
      </blockquote>
    `.trim();

		expect(parseCallout(callout)).toBe(null);
	});

	it('should return a foldable prop if the callout is foldable with a "+"', () => {
		const callout = `
      <blockquote>
        <p>[!NOTE]+ Title\nDescription</p>
      </blockquote>
    `.trim();

		expect(parseCallout(callout)).toEqual({
			title: 'Title',
			variant: 'note',
			description: '<p>Description</p>',
			foldable: true,
		});
	});

	it('should return a foldable prop if the callout is foldable with a "-"', () => {
		const callout = `
      <blockquote>
        <p>[!NOTE]- Title\nDescription</p>
      </blockquote>
    `.trim();

		expect(parseCallout(callout)).toEqual({
			title: 'Title',
			variant: 'note',
			description: '<p>Description</p>',
			foldable: true,
		});
	});

	it('should support multi-line descriptions', () => {
		const callout = `
      <blockquote>
      <p>[!NOTE] Title
      First paragraph</p>
      <p>Second paragraph</p>
      </blockquote>
    `.trim();

		const { title, variant, description } = parseCallout(callout);
		expect(title).toBe('Title');
		expect(variant).toBe('note');
		expect(description).toBe('<p>First paragraph</p>' + '<p>Second paragraph</p>');
	});

	it('should support titles with markup', () => {
		const callout = `
      <blockquote>
      <p>[!NOTE] A <strong>Title</strong>
      Description</p>
      </blockquote>
    `.trim();

		expect(parseCallout(callout)).toEqual({
			title: 'A <strong>Title</strong>',
			variant: 'note',
			description: '<p>Description</p>',
			foldable: false,
		});
	});
});
