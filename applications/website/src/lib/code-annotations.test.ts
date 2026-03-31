import { describe, expect, it } from 'vitest';
import { extractAnnotations, injectAnnotations, renderAnnotationHtml } from './code-annotations.js';

describe('code annotations', () => {
  it('renders backtick-delimited segments as inline code', () => {
    expect(renderAnnotationHtml('Use `s3:GetObject` on `arn:aws:s3:::bucket/*`.')).toBe(
      'Use <code>s3:GetObject</code> on <code>arn:aws:s3:::bucket/*</code>.',
    );
  });

  it('escapes unsafe text while preserving inline code markup', () => {
    expect(renderAnnotationHtml('Avoid <script> and use `<b>` instead.')).toBe(
      'Avoid &lt;script&gt; and use <code>&lt;b&gt;</code> instead.',
    );
  });

  it('injects rendered annotations after the matching code line', () => {
    const { cleanedCode, annotations } = extractAnnotations(
      "const action = 's3:GetObject';\n// [!note Use `s3:GetObject` on `arn:aws:s3:::bucket/*`.]",
    );

    expect(cleanedCode).toBe("const action = 's3:GetObject';");

    const html = `<pre><code><span class="line">const action = 's3:GetObject';</span></code></pre>`;

    expect(injectAnnotations(html, annotations)).toBe(
      `<pre><code><span class="line">const action = 's3:GetObject';</span><span class="code-annotation"><span class="code-annotation-indicator">Note</span> Use <code>s3:GetObject</code> on <code>arn:aws:s3:::bucket/*</code>.</span></code></pre>`,
    );
  });
});
