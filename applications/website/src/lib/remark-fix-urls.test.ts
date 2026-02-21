import { describe, expect, it } from 'vitest';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { visit } from 'unist-util-visit';
import { VFile } from 'vfile';
import type { Root } from 'mdast';
import { fixMarkdownUrls } from '@stevekinney/plugins/remark-fix-urls';

const collectUrls = (tree: Root): string[] => {
  const urls: string[] = [];
  visit(tree, 'link', (node) => {
    urls.push(node.url);
  });
  return urls;
};

const collectDefinitionUrls = (tree: Root): string[] => {
  const urls: string[] = [];
  visit(tree, 'definition', (node) => {
    urls.push(node.url);
  });
  return urls;
};

const apply = (
  markdown: string,
  filePath = '/repo/content/writing/post.md',
  contentPath = 'content',
  cwd = '/repo',
): string[] => {
  const tree = fromMarkdown(markdown) as Root;
  const file = new VFile({ path: filePath, cwd });
  fixMarkdownUrls(contentPath)(tree, file, () => {});
  return collectUrls(tree);
};

const applyDefinitions = (
  markdown: string,
  filePath = '/repo/content/writing/post.md',
  contentPath = 'content',
  cwd = '/repo',
): string[] => {
  const tree = fromMarkdown(markdown) as Root;
  const file = new VFile({ path: filePath, cwd });
  fixMarkdownUrls(contentPath)(tree, file, () => {});
  return collectDefinitionUrls(tree);
};

describe('fixMarkdownUrls', () => {
  it('rewrites relative markdown links to routes', () => {
    const [url] = apply('[Next](./next.md)');
    expect(url).toBe('/writing/next');
  });

  it('preserves query strings and hashes', () => {
    const [url] = apply('[Next](next.md?utm=1#section)');
    expect(url).toBe('/writing/next?utm=1#section');
  });

  it('resolves parent directories against the file path', () => {
    const [url] = apply('[About](../about.md)', '/repo/content/writing/subdir/page.md');
    expect(url).toBe('/writing/about');
  });

  it('handles README and index variants as directory roots', () => {
    const [readme] = apply('[Readme](./README.md)');
    const [index] = apply('[Index](./index.md)');
    const [underscore] = apply('[Index](./_index.md)');
    expect(readme).toBe('/writing/');
    expect(index).toBe('/writing/');
    expect(underscore).toBe('/writing/');
  });

  it('supports markdown extension variants and casing', () => {
    const [mdx] = apply('[Page](./page.mdx)');
    const [markdown] = apply('[Page](./page.markdown)');
    const [upper] = apply('[Page](./PAGE.MD)');
    expect(mdx).toBe('/writing/page');
    expect(markdown).toBe('/writing/page');
    expect(upper).toBe('/writing/PAGE');
  });

  it('trims trailing slashes after markdown filenames', () => {
    const [url] = apply('[Next](./next.md/)');
    expect(url).toBe('/writing/next');
  });

  it('rewrites absolute internal markdown paths', () => {
    const [url] = apply('[Storybook](/courses/storybook/README.md)');
    expect(url).toBe('/courses/storybook/');
  });

  it('skips links without markdown extensions', () => {
    const [url] = apply('[About](./about)');
    expect(url).toBe('./about');
  });

  it('skips links where the extension appears only in query or hash', () => {
    const [query] = apply('[Query](./about?ref=readme.md)');
    const [hash] = apply('[Hash](./about#readme.md)');
    expect(query).toBe('./about?ref=readme.md');
    expect(hash).toBe('./about#readme.md');
  });

  it('skips external and protocol-relative links', () => {
    const urls = apply(
      '[HTTP](https://example.com/file.md) [Proto](//cdn.example.com/file.md) [Mail](mailto:hey@example.com)',
    );
    expect(urls).toEqual([
      'https://example.com/file.md',
      '//cdn.example.com/file.md',
      'mailto:hey@example.com',
    ]);
  });

  it('skips additional external schemes', () => {
    const urls = apply(
      '[Tel](tel:+15551231234) [Data](data:text/plain,hello) [Blob](blob:https://example.com/1) [JS](javascript:void(0)) [FTP](ftp://example.com/file.md) [File](file:///tmp/readme.md)',
    );
    expect(urls).toEqual([
      'tel:+15551231234',
      'data:text/plain,hello',
      'blob:https://example.com/1',
      'javascript:void(0)',
      'ftp://example.com/file.md',
      'file:///tmp/readme.md',
    ]);
  });

  it('leaves hash-only links alone', () => {
    const [url] = apply('[Jump](#section)');
    expect(url).toBe('#section');
  });

  it('normalizes Windows separators in link paths', () => {
    const tree: Root = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            {
              type: 'link',
              url: '..\\storybook\\README.md',
              title: null,
              children: [{ type: 'text', value: 'Storybook' }],
            },
          ],
        },
      ],
    };
    const file = new VFile({
      path: 'C:\\repo\\content\\courses\\figma\\page.md',
      cwd: 'C:\\repo',
    });
    fixMarkdownUrls()(tree, file, () => {});
    const [url] = collectUrls(tree);
    expect(url).toBe('/courses/storybook/');
  });

  it('treats Windows absolute URLs as external', () => {
    const [url] = apply(String.raw`[Doc](C:\docs\readme.md)`);
    expect(url).toBe(String.raw`C:\docs\readme.md`);
  });

  it('normalizes UNC-style paths as rooted URLs', () => {
    const [url] = apply(String.raw`[Share](\\server\share\readme.md)`);
    expect(url).toBe('/server/share/');
  });

  it('treats leading backslashes as rooted URLs', () => {
    const [url] = apply(String.raw`[Root](\courses\storybook\README.md)`);
    expect(url).toBe('/courses/storybook/');
  });

  it('rewrites reference-style definitions', () => {
    const [url] = applyDefinitions('[Next][ref]\n\n[ref]: ./next.md');
    expect(url).toBe('/writing/next');
  });

  it('normalizes content paths with leading or trailing slashes', () => {
    const [url] = apply('[Next](./next.md)', '/repo/content/writing/post.md', '/content/');
    expect(url).toBe('/writing/next');
  });

  it('skips rewriting when file is outside the content path', () => {
    const [url] = apply('[Next](./next.md)', '/repo/notes/post.md');
    expect(url).toBe('./next.md');
  });
});
