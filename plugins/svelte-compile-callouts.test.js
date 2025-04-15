import { describe, expect, it } from 'vitest';
import { compileCallout, parseCallout } from './svelte-compile-callouts.js';

describe('compileCallout', () => {
  it('should compile a callout object into HTML', () => {
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

  it('should compile a callout object without a description', () => {
    const callout = {
      title: 'Title',
      variant: 'note',
      description: undefined,
      foldable: false,
    };

    expect(compileCallout(callout)).toBe('<Callout title="Title" variant="note" />');
  });
});

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

    /** @type {import('./svelte-compile-callouts.js').Callout */
    const { title, variant, description } = parseCallout(callout);

    expect(title).toBe('Title');
    expect(variant).toBe('note');
    expect(description).toMatchInlineSnapshot(`
			"<p>First paragraph</p>
			      <p>Second paragraph</p>"
		`);
  });
});
