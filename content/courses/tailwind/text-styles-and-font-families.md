---
title: Text Styles and Font Families
description: Master typography in Tailwind with utilities for font families, sizes, weights, styles, and text decoration
---

Alright, let's get into how to work with text styles and font families in Tailwind CSS, diving into the capabilities available, particularly with the new features introduced in version 4.0. Tailwind's utility-first approach makes styling typography a streamlined process, allowing you to compose styles directly in your markup using a predefined set of classes. However, the framework is also designed to be highly customizable, so you can easily align it with your project's specific design system.

## Font Families

Tailwind CSS provides utilities to control the font family of an element using the `font-<family-name>` syntax. Out of the box, Tailwind includes a default font theme with three curated font stacks: sans-serif, serif, and monospace.

### Using Default Font Stacks

You can apply these default font stacks using the following utilities:

- `font-sans`: Applies a generic sans-serif font stack (`ui-sans-serif`, `system-ui`, etc.).
- `font-serif`: Applies a generic serif font stack (`ui-serif`, `Georgia`, etc.).
- `font-mono`: Applies a generic monospace font stack (`ui-monospace`, `SFMono-Regular`, etc.).

### Customizing Font Families

In Tailwind, customizing your theme, including font families, is handled through the CSS-first configuration approach using the `@theme` directive. To add or override font families, you define theme variables within the `--font-*` namespace inside your `@theme` block.

For example, to add a custom `display` font family, you would define a variable like this in your main CSS file:

```css
@theme {
  --font-family-display: 'Satoshi', 'sans-serif';
}
```

After defining this theme variable, a corresponding `font-display` utility class becomes available for you to use in your HTML:

```html tailwind
<h1 class="font-display text-4xl">Data to enrich your online business</h1>
```

You can also provide default `font-feature-settings` and `font-variation-settings` values for a font family when defining it in `@theme`.

If you need to load custom fonts, you can use the CSS `@font-face` at-rule. If you're importing a font from a service like Google Fonts, make sure to place the `@import` statement at the very top of your CSS file, above the `@import "tailwindcss";` statement. Browsers require `@import` statements for external resources to come before any other rules, including the Tailwind import which is inlined in the compiled CSS.

### Using Custom Values and Custom Properties

For one-off font family values or to use CSS variables directly, you can use the arbitrary value syntax `font-[<value>]` or the custom property syntax `font-(<custom-property>)`. For instance, `font-['"Times New Roman", serif']` or `font-(--my-custom-font)`.

### Responsive Font Families

Like most utilities in Tailwind CSS, font family utilities can be applied conditionally at different breakpoints using responsive variants (e.g., `md:font-serif`) to create adaptive designs.

## Font Sizes

Tailwind CSS provides a comprehensive scale of font size utilities, ranging from extra-small (`text-xs`) up to monumental (`text-9xl`). These utilities are named semantically and correspond to a predefined scale of values, which can be customized.

### Using Default Font Size Utilities

You can set the font size of an element using utilities like `text-sm` or `text-lg`. Each of these utilities also sets a default line height.

### Setting Font Size and Line Height Together

Tailwind allows you to set both the font size and line height simultaneously using a combined syntax like `text-<size>/<number>`. For example, `text-sm/6` applies the small font size with a specific line height value based on your spacing scale. You can also use arbitrary values or custom properties for the line height in this syntax, such as `text-base/[1.5]` or `text-lg/(--custom-leading)`.

### Using Custom Values and Custom Properties

If you need a font size that isn't part of the default scale, you can use the arbitrary value syntax `text-[<value>]`. This allows you to specify any valid CSS font size value, such as `text-[1.75rem]` or `text-[28px]`. You can also use a custom property with the syntax `text-(length:<custom-property>)` to set the font size using a CSS variable.

### Customizing Font Sizes

You can customize the default font size scale and their associated default line heights, letter spacing, and font weights by defining theme variables in the `--text-*` namespace within your `@theme` block. This approach is particularly useful for establishing a consistent typography scale across your project.

### Responsive Font Sizes

To make your text responsive, you can apply font size utilities conditionally at different breakpoints. For example, `text-base md:text-lg lg:text-xl` would set a base font size for small screens and larger sizes for medium and large screens respectively.

## Font Weights

Controlling the thickness of text is handled by font weight utilities. Tailwind CSS includes utilities for a standard range of font weights, from thin to black.

### Using Default Font Weight Utilities

You can apply these font weights using utilities like `font-thin`, `font-bold`, or `font-black`. These correspond to numerical values like 100, 700, and 900 respectively.

### Using Custom Values and Custom Properties

For specific numerical font weights not included in the default scale, or to use a CSS variable, you can use the arbitrary value syntax `font-[<value>]` or the custom property syntax `font-(<custom-property>)`. For example, `font-` or `font-(--my-font-weight)`.

### Customizing Font Weights

Similar to font families and sizes, you can customize the default font weight scale by defining theme variables in the `--font-*` namespace within your `@theme` block.

### Responsive Font Weights

Font weight utilities are responsive, allowing you to adjust the weight of text at different breakpoints (e.g., `md:font-semibold`).

## Font Styles (Italic)

Tailwind provides simple utilities for controlling whether text is italicized or displayed normally.

### Using Font Style Utilities

- `italic`: Applies `font-style: italic;` to make text italic.
- `not-italic`: Applies `font-style: normal;` to ensure text is displayed normally, often used to override italicization inherited from a parent element or applied at a different breakpoint.

### Responsive Font Styles

You can apply these utilities conditionally at breakpoints (e.g., `md:not-italic`) to change the font style responsively.

## Font Smoothing

Utilities for controlling font smoothing can help fine-tune the appearance of text, especially on different operating systems and screen types.

### Using Font Smoothing Utilities

- `antialiased`: Applies grayscale antialiasing (`-webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;`).
- `subpixel-antialiased`: Applies subpixel antialiasing (`-webkit-font-smoothing: auto; -moz-osx-font-smoothing: auto;`).

### Responsive Font Smoothing

These utilities can be applied responsively (e.g., `md:subpixel-antialiased`).

## Font Stretch

The `font-stretch` property controls the width of a font face, which is particularly relevant for variable fonts that offer different width variations.

### Using Font Stretch Utilities

Tailwind includes utilities for standard font stretch values like `font-stretch-condensed` and `font-stretch-expanded`, which correspond to percentage values like 75% and 125%. Applying these utilities affects fonts that support multiple width variations; otherwise, the browser selects the closest match.

You can also set the font stretch using percentage utilities like `font-stretch-50%` or `font-stretch-125%`.

### Using Custom Values and Custom Properties

Custom font stretch values can be applied using the arbitrary value syntax `font-stretch-[<value>]` or the custom property syntax `font-stretch-(<custom-property>)`.

### Responsive Font Stretch

Font stretch utilities can be applied responsively (e.g., `md:font-stretch-normal`).

## Font Variant Numeric

Utilities for controlling the variant of numbers allow you to apply specific typographical features for numbers in fonts that support them.

### Using Numeric Variant Utilities

Tailwind provides utilities for various numeric variants:

- `ordinal`: Enables special glyphs for ordinal markers (e.g., 1st, 2nd).
- `slashed-zero`: Forces a zero with a slash.
- `lining-nums`: Uses numeric glyphs aligned by their baseline.
- `oldstyle-nums`: Uses numeric glyphs where some numbers have descenders.
- `proportional-nums`: Uses numeric glyphs with proportional widths.
- `tabular-nums`: Uses numeric glyphs with uniform/tabular widths.
- `diagonal-fractions`: Replaces numbers separated by a slash with common diagonal fractions.
- `stacked-fractions`: Replaces numbers separated by a slash with common stacked fractions.
- `normal-nums`: Resets numeric font variants to the default behavior.

These utilities are composable, allowing you to combine multiple variants.

### Responsive Numeric Variants

Numeric variant utilities can be applied responsively (e.g., `md:tabular-nums`).

## Text Color

Setting the color of text is fundamental to styling. Tailwind provides utilities based on its comprehensive color palette for this purpose.

### Using Text Color Utilities

You can set the text color using utilities like `text-blue-600` or `text-sky-400`. These colors are derived from your theme's color palette, which includes a wide range of colors and shades.

### Adjusting Opacity

You can easily adjust the opacity of the text color using the color opacity modifier syntax, for example `text-black/75`, where `/75` sets the alpha channel to 75%. This syntax also supports arbitrary values and the CSS variable shorthand for opacity.

### Using Custom Values and Custom Properties

To use a custom text color value not present in your theme, you can use the arbitrary value syntax `text-[<value>]`. This could be a hex code, RGB value, or any other valid color value. You can also use a custom property with the syntax `text-(<custom-property>)` to set the text color using a CSS variable.

### Customizing Text Colors

Customizing your text colors is part of customizing your color palette, which is done by defining theme variables in the `--color-*` namespace within your `@theme` block. For example, you can add a new color `neon-pink` or override a default shade. You can also completely disable the default color palette and define your own.

### Responsive Text Colors

Text color utilities are responsive, allowing you to change text color at different breakpoints (e.g., `md:text-green-500`).

## Text Alignment

Controlling the horizontal alignment of text within its container is done with text alignment utilities.

### Using Text Alignment Utilities

- `text-left`: Aligns text to the left.
- `text-center`: Centers text.
- `text-right`: Aligns text to the right.
- `text-justify`: Justifies text, distributing space between words so that lines are flush with both edges.
- `text-start`: Aligns text to the start of the line, which is left in LTR contexts and right in RTL contexts.
- `text-end`: Aligns text to the end of the line, which is right in LTR contexts and left in RTL contexts.

### Responsive Text Alignment

These utilities are responsive (e.g., `md:text-center`).

## Text Decoration

Tailwind provides utilities to control the line, style, thickness, and color of text decorations like underlines, overlines, and line-throughs.

### Text Decoration Line

Utilities control the presence and type of text decoration lines:

- `underline`: Adds a single underline.
- `overline`: Adds a single overline.
- `line-through`: Adds a line through the text.
- `no-underline`: Removes any text decoration lines, often used to remove default browser underlines from links or to reset decoration at a breakpoint.

These utilities are responsive (e.g., `hover:underline md:no-underline`).

### Text Decoration Style

Utilities control the visual style of the text decoration line:

- `decoration-solid`
- `decoration-double`
- `decoration-dotted`
- `decoration-dashed`
- `decoration-wavy`

These utilities are responsive (e.g., `md:decoration-dotted`).

### Text Decoration Thickness

Utilities control the thickness of the text decoration line:

- `decoration-<number>`: Sets the thickness in pixels (e.g., `decoration-2`, `decoration-4`).
- `decoration-from-font`: Sets thickness based on the font.
- `decoration-auto`: Allows the browser to determine the thickness.

You can use arbitrary values `decoration-[<value>]` or custom properties `decoration-(length:<custom-property>)` for thickness. These utilities are responsive (e.g., `md:decoration-4`).

### Text Decoration Color

Utilities control the color of the text decoration line:

- `decoration-inherit`, `decoration-current`, `decoration-transparent`
- `decoration-<color-name>`: Uses a color from your theme (e.g., `decoration-sky-500`, `decoration-pink-500`).

You can adjust the opacity using the color opacity modifier (e.g., `decoration-red-500/50`). Custom values `decoration-[<value>]` and custom properties `decoration-(<custom-property>)` are supported. These utilities are responsive (e.g., `hover:decoration-blue-400`). Customizing text decoration colors is part of customizing your color palette.

## Text Underline Offset

Utilities control the distance between the text and the underline.

### Using Underline Offset Utilities

- `underline-offset-<number>`: Sets the offset in pixels (e.g., `underline-offset-2`, `underline-offset-4`).
- `-underline-offset-<number>`: Sets a negative offset.
- `underline-offset-auto`: Allows the browser to determine the offset.

You can use arbitrary values `underline-offset-[<value>]` or custom properties `underline-offset-(<custom-property>)`. These utilities are responsive (e.g., `md:underline-offset-4`).

## Text Transform

Utilities control the capitalization of text.

### Using Text Transform Utilities

- `uppercase`: Transforms text to uppercase.
- `lowercase`: Transforms text to lowercase.
- `capitalize`: Capitalizes the first letter of each word.
- `normal-case`: Prevents any text transformation, useful for resetting casing at breakpoints.

These utilities are responsive (e.g., `md:normal-case`).

## Text Indent

Utilities control the amount of horizontal empty space before the first line of text in a block.

### Using Text Indent Utilities

- `indent-<number>`: Sets the indentation based on the spacing scale (e.g., `indent-2`, `indent-8`).
- `indent-px`: Sets a 1px indentation.
- `-indent-<number>`: Sets a negative indentation.
- `-indent-px`: Sets a -1px indentation.

You can use arbitrary values `indent-[<value>]` or custom properties `indent-(<custom-property>)`. These utilities are responsive (e.g., `md:indent-4`).

## Text Overflow

Utilities control how text that overflows its container is displayed, including truncation.

### Using Text Overflow Utilities

- `truncate`: A composite utility that prevents text from wrapping (`white-space: nowrap`), hides overflowing content (`overflow: hidden`), and displays an ellipsis (`text-overflow: ellipsis`) for truncated text.
- `text-ellipsis`: Displays an ellipsis to represent clipped text. Requires `overflow: hidden` and `white-space: nowrap` to function correctly.
- `text-clip`: Clips the text at the edge of the element's content box (the default browser behavior).

These utilities are responsive (e.g., `md:truncate`).

## Text Wrap

Utilities control how text wraps within an element.

### Using Text Wrap Utilities

- `text-wrap`: Allows text to wrap onto multiple lines at logical points.
- `text-nowrap`: Prevents text from wrapping, potentially causing overflow. This utility replaces the deprecated `whitespace-nowrap` utility from v3.
- `text-balance`: Attempts to balance the text length across lines, distributing text evenly. Primarily suitable for headings due to browser performance limitations on longer text blocks.
- `text-pretty`: Aims to improve readability by preventing orphans (single words on a line).

These utilities are responsive (e.g., `md:text-balance`).

## Text Shadow

Utilities apply shadows to text elements. These are different from `box-shadow` utilities (`shadow-*`) which apply shadows to the element's box.

### Using Text Shadow Utilities

Tailwind includes utilities for predefined text shadow sizes like `text-shadow-xs`, `text-shadow-sm`, and `text-shadow-lg`. It also includes `text-shadow-none` to remove a text shadow.

### Adjusting Opacity

You can adjust the opacity of the text shadow using the opacity modifier (e.g., `text-shadow-sm/50`).

### Setting Shadow Color

You can change the color of the text shadow using color utilities like `text-shadow-indigo-500`. This can be combined with the color opacity modifier (e.g., `text-shadow-cyan-500/50`).

### Using Custom Values and Custom Properties

Custom text shadow values can be applied using the arbitrary value syntax `text-shadow-[<value>]` or custom properties `text-shadow-(<custom-property>)`. Custom shadow colors can be set using `text-shadow-(color:<custom-property>)` or `text-shadow-[<color>]`.

### Customizing Text Shadows

You can customize the default text shadow sizes and colors by defining theme variables in the `--text-shadow-*` and `--tw-text-shadow-color` namespaces within your `@theme` block.

### Responsive Text Shadows

Text shadow utilities are responsive (e.g., `md:text-shadow-lg`).

## White Space

Utilities control how white space within an element is handled, affecting line breaks and spacing.

### Using White Space Utilities

- `whitespace-normal`: Text wraps normally, spaces and newlines are collapsed.
- `whitespace-nowrap`: Prevents text wrapping; spaces and newlines are collapsed. (Note: The `text-nowrap` utility is generally preferred for preventing wrapping).
- `whitespace-pre`: Preserves spaces and newlines; text does not wrap.
- `whitespace-pre-line`: Preserves newlines but collapses spaces; text wraps normally.
- `whitespace-pre-wrap`: Preserves spaces and newlines; text wraps normally.
- `whitespace-break-spaces`: Preserves spaces and newlines; text wraps normally, and spaces at the end of lines wrap to the next line.

These utilities are responsive (e.g., `md:whitespace-pre-wrap`).

## Overflow Wrap

Utilities control whether the browser can break words to prevent overflow.

### Using Overflow Wrap Utilities

- `wrap-break-word`: Allows line breaks between letters if necessary to prevent overflow.
- `wrap-anywhere`: Similar to `wrap-break-word`, but the browser considers mid-word breaks when calculating intrinsic size, useful for flexible containers like flexbox where children might need to shrink below their content size without a `min-width: 0` explicit style.
- `wrap-normal`: Only allows line breaks at natural breaking points (spaces, hyphens, punctuation).

These utilities are responsive (e.g., `md:wrap-anywhere`).
