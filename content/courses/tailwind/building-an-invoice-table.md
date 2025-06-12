---
title: Building an Invoice Table with Subgrid
description: Let's build a responsive invoice table that uses CSS Subgrid and container queries to create perfectly aligned columns that adapt to any container size.
---

Let's start with our basic HTML structure for an invoice table with line items.

```html tailwind
<div>
  <div>
    <div>Description</div>
    <div>Qty</div>
    <div>Rate</div>
    <div>Amount</div>
  </div>
  <div>
    <div>Website Design</div>
    <div>1</div>
    <div>$2,500.00</div>
    <div>$2,500.00</div>
  </div>
  <div>
    <div>Logo Design</div>
    <div>1</div>
    <div>$800.00</div>
    <div>$800.00</div>
  </div>
  <div>
    <div>Content Writing</div>
    <div>5</div>
    <div>$150.00</div>
    <div>$750.00</div>
  </div>
</div>
```

It's a basic invoice table structure, but the columns don't align and there's no visual hierarchy. Let's transform this into a professional invoice table where the header and rows share perfectly aligned column tracks, and the entire component adapts intelligently to its container size.

## Setting Up Container Query Context

First, let's establish our container as a query context and create the CSS Grid foundation, building on what we learned in our [statistics card tutorial](building-a-statistics-card.md).

```html tailwind
<div class="@container">
  <div class="grid grid-cols-[1fr_auto_auto_auto] gap-x-4">
    <div class="contents">
      <div>Description</div>
      <div>Qty</div>
      <div>Rate</div>
      <div>Amount</div>
    </div>
    <div class="contents">
      <div>Website Design</div>
      <div>1</div>
      <div>$2,500.00</div>
      <div>$2,500.00</div>
    </div>
    <div class="contents">
      <div>Logo Design</div>
      <div>1</div>
      <div>$800.00</div>
      <div>$800.00</div>
    </div>
    <div class="contents">
      <div>Content Writing</div>
      <div>5</div>
      <div>$150.00</div>
      <div>$750.00</div>
    </div>
  </div>
</div>
```

Foundation setup:

- `@container`: Establishes this element as a container query context—child elements can respond to this container's size
- `grid grid-cols-[1fr_auto_auto_auto]`: Creates a 4-column grid where the description column takes available space and the other columns size to their content
- `gap-x-4`: Adds 16px horizontal spacing between columns for readability
- `contents`: Makes the row divs "transparent" to the grid, so their children become direct grid items

The `contents` utility is key here—it removes the wrapper divs from the visual layout while keeping them in the HTML for semantic structure.

## Introducing CSS Subgrid

Now comes the magic—let's use CSS Subgrid to ensure perfect alignment between header and data rows while adding proper visual hierarchy.

```html tailwind
<div class="@container">
  <div class="grid grid-cols-[1fr_auto_auto_auto] gap-x-4">
    <div class="col-span-4 grid grid-cols-subgrid border-b border-slate-200 pb-2">
      <div class="text-sm font-semibold text-slate-900">Description</div>
      <div class="text-sm font-semibold text-slate-900">Qty</div>
      <div class="text-sm font-semibold text-slate-900">Rate</div>
      <div class="text-right text-sm font-semibold text-slate-900">Amount</div>
    </div>
    <div class="col-span-4 grid grid-cols-subgrid py-3">
      <div class="text-slate-900">Website Design</div>
      <div class="text-slate-900">1</div>
      <div class="text-slate-900">$2,500.00</div>
      <div class="text-right font-medium text-slate-900">$2,500.00</div>
    </div>
    <div class="col-span-4 grid grid-cols-subgrid py-3">
      <div class="text-slate-900">Logo Design</div>
      <div class="text-slate-900">1</div>
      <div class="text-slate-900">$800.00</div>
      <div class="text-right font-medium text-slate-900">$800.00</div>
    </div>
    <div class="col-span-4 grid grid-cols-subgrid py-3">
      <div class="text-slate-900">Content Writing</div>
      <div class="text-slate-900">5</div>
      <div class="text-slate-900">$150.00</div>
      <div class="text-right font-medium text-slate-900">$750.00</div>
    </div>
  </div>
</div>
```

Subgrid implementation:

- `col-span-4`: Each row spans all 4 columns of the parent grid
- `grid grid-cols-subgrid`: Creates a subgrid that inherits the exact column tracks from the parent—this ensures perfect alignment
- Header styling with `font-semibold` and bottom border separation
- `text-right` on amount columns for proper financial formatting
- `py-3`: 12px vertical padding creates comfortable row height

CSS Subgrid ensures that no matter how the content changes, the columns will always align perfectly between header and rows.

## Adding Container-Responsive Typography

Let's make the table adapt its typography and spacing based on the container size, creating a more refined experience in larger spaces.

```html tailwind
<div class="@container">
  <div class="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 @lg:gap-x-6">
    <div class="col-span-4 grid grid-cols-subgrid border-b border-slate-200 pb-2 @lg:pb-3">
      <div class="text-sm font-semibold text-slate-900 @lg:text-base">Description</div>
      <div class="text-sm font-semibold text-slate-900 @lg:text-base">Qty</div>
      <div class="text-sm font-semibold text-slate-900 @lg:text-base">Rate</div>
      <div class="text-right text-sm font-semibold text-slate-900 @lg:text-base">Amount</div>
    </div>
    <div class="col-span-4 grid grid-cols-subgrid py-3 @lg:py-4">
      <div class="text-slate-900 @lg:text-lg">Website Design</div>
      <div class="text-slate-900 @lg:text-lg">1</div>
      <div class="text-slate-900 @lg:text-lg">$2,500.00</div>
      <div class="text-right font-medium text-slate-900 @lg:text-lg">$2,500.00</div>
    </div>
    <div class="col-span-4 grid grid-cols-subgrid py-3 @lg:py-4">
      <div class="text-slate-900 @lg:text-lg">Logo Design</div>
      <div class="text-slate-900 @lg:text-lg">1</div>
      <div class="text-slate-900 @lg:text-lg">$800.00</div>
      <div class="text-right font-medium text-slate-900 @lg:text-lg">$800.00</div>
    </div>
    <div class="col-span-4 grid grid-cols-subgrid py-3 @lg:py-4">
      <div class="text-slate-900 @lg:text-lg">Content Writing</div>
      <div class="text-slate-900 @lg:text-lg">5</div>
      <div class="text-slate-900 @lg:text-lg">$150.00</div>
      <div class="text-right font-medium text-slate-900 @lg:text-lg">$750.00</div>
    </div>
  </div>
</div>
```

Container-responsive refinements:

- `@lg:gap-x-6`: Increases column gaps to 24px when container is large (512px+)
- `@lg:text-base` on headers: Larger 16px font size for headers in spacious layouts
- `@lg:text-lg` on data: Larger 18px font for better readability in wide containers
- `@lg:py-4`: More generous 16px vertical padding when space allows

The table automatically becomes more spacious and readable when placed in larger containers, while staying compact in constrained spaces.

## Adding Alternating Row Backgrounds

Let's add professional alternating row backgrounds using the `even:` selector for better scannability across wide tables.

```html tailwind
<div class="@container">
  <div class="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 @lg:gap-x-6">
    <div class="col-span-4 grid grid-cols-subgrid border-b border-slate-200 pb-2 @lg:pb-3">
      <div class="text-sm font-semibold text-slate-900 @lg:text-base">Description</div>
      <div class="text-sm font-semibold text-slate-900 @lg:text-base">Qty</div>
      <div class="text-sm font-semibold text-slate-900 @lg:text-base">Rate</div>
      <div class="text-right text-sm font-semibold text-slate-900 @lg:text-base">Amount</div>
    </div>
    <div class="col-span-4 grid grid-cols-subgrid py-3 even:bg-slate-50 @lg:py-4">
      <div class="text-slate-900 @lg:text-lg">Website Design</div>
      <div class="text-slate-900 @lg:text-lg">1</div>
      <div class="text-slate-900 @lg:text-lg">$2,500.00</div>
      <div class="text-right font-medium text-slate-900 @lg:text-lg">$2,500.00</div>
    </div>
    <div class="col-span-4 grid grid-cols-subgrid py-3 even:bg-slate-50 @lg:py-4">
      <div class="text-slate-900 @lg:text-lg">Logo Design</div>
      <div class="text-slate-900 @lg:text-lg">1</div>
      <div class="text-slate-900 @lg:text-lg">$800.00</div>
      <div class="text-right font-medium text-slate-900 @lg:text-lg">$800.00</div>
    </div>
    <div class="col-span-4 grid grid-cols-subgrid py-3 even:bg-slate-50 @lg:py-4">
      <div class="text-slate-900 @lg:text-lg">Content Writing</div>
      <div class="text-slate-900 @lg:text-lg">5</div>
      <div class="text-slate-900 @lg:text-lg">$150.00</div>
      <div class="text-right font-medium text-slate-900 @lg:text-lg">$750.00</div>
    </div>
  </div>
</div>
```

Row styling enhancement:

- `even:bg-slate-50`: Adds a subtle gray background to every even-numbered row (2nd, 4th, etc.)

This creates the classic "zebra stripe" pattern that helps users track across wide tables. The alternating backgrounds work automatically regardless of how many rows you add or remove.

## Adding Polish and Totals Section

Finally, let's add a totals section and professional polish to complete our invoice table.

```html tailwind
<div class="@container">
  <div class="rounded-lg border border-slate-200 bg-white p-4 @lg:p-6">
    <div class="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 @lg:gap-x-6">
      <div class="col-span-4 grid grid-cols-subgrid border-b border-slate-200 pb-2 @lg:pb-3">
        <div class="text-sm font-semibold text-slate-900 @lg:text-base">Description</div>
        <div class="text-sm font-semibold text-slate-900 @lg:text-base">Qty</div>
        <div class="text-sm font-semibold text-slate-900 @lg:text-base">Rate</div>
        <div class="text-right text-sm font-semibold text-slate-900 @lg:text-base">Amount</div>
      </div>
      <div class="col-span-4 grid grid-cols-subgrid py-3 even:bg-slate-50 @lg:py-4">
        <div class="text-slate-900 @lg:text-lg">Website Design</div>
        <div class="text-slate-900 @lg:text-lg">1</div>
        <div class="text-slate-900 @lg:text-lg">$2,500.00</div>
        <div class="text-right font-medium text-slate-900 @lg:text-lg">$2,500.00</div>
      </div>
      <div class="col-span-4 grid grid-cols-subgrid py-3 even:bg-slate-50 @lg:py-4">
        <div class="text-slate-900 @lg:text-lg">Logo Design</div>
        <div class="text-slate-900 @lg:text-lg">1</div>
        <div class="text-slate-900 @lg:text-lg">$800.00</div>
        <div class="text-right font-medium text-slate-900 @lg:text-lg">$800.00</div>
      </div>
      <div class="col-span-4 grid grid-cols-subgrid py-3 even:bg-slate-50 @lg:py-4">
        <div class="text-slate-900 @lg:text-lg">Content Writing</div>
        <div class="text-slate-900 @lg:text-lg">5</div>
        <div class="text-slate-900 @lg:text-lg">$150.00</div>
        <div class="text-right font-medium text-slate-900 @lg:text-lg">$750.00</div>
      </div>
      <div class="col-span-4 grid grid-cols-subgrid border-t border-slate-200 pt-3 @lg:pt-4">
        <div></div>
        <div></div>
        <div class="text-sm font-semibold text-slate-900 @lg:text-base">Total:</div>
        <div class="text-right text-lg font-bold text-slate-900 @lg:text-xl">$4,050.00</div>
      </div>
    </div>
  </div>
</div>
```

Final polish additions:

- `rounded-lg border border-slate-200 bg-white`: Wraps the entire table in a professional card container
- `p-4 @lg:p-6`: Container padding that grows with available space
- Totals row with `border-t border-slate-200`: Clear separation from line items
- `text-lg font-bold @lg:text-xl`: Prominent total that scales with container size
- Empty cells in totals row maintain perfect column alignment through subgrid

## Why This Approach is Revolutionary

This invoice table demonstrates the pinnacle of modern CSS layout techniques working in harmony:

**CSS Subgrid Magic**: The header and every row share exactly the same column tracks. If you change the content in any cell, all other rows automatically adjust to maintain perfect alignment. No manual column width calculations needed.

**Container Query Intelligence**: The table adapts to its container, not the viewport. Whether it's in a narrow sidebar, main content area, or full-width dashboard, it always looks proportional and readable.

**Semantic Foundation**: Despite the sophisticated layout, the HTML remains clean and accessible. Screen readers understand the table structure perfectly.

**Maintenance Benefits**: Adding new rows or columns requires no layout recalculation—the subgrid automatically maintains alignment and the container queries handle responsive behavior.

**Performance**: This is all CSS-driven with zero JavaScript, making it lightweight and fast while providing sophisticated adaptive behavior.

## Real-World Applications

This pattern solves common problems in:

- **Financial applications**: Invoice tables, expense reports, pricing tables
- **Data dashboards**: Analytics tables that need to fit various widget sizes
- **Admin interfaces**: User tables, product catalogs, order management
- **Content management**: Post listings, media libraries, any tabular data

The combination of subgrid and container queries creates truly modular components that work anywhere in your application without modification.

## Challenges

Try building these variations:

1. **Expandable Invoice Items**: Add detailed line item descriptions that appear/disappear using the techniques from our [details disclosure tutorial](building-details-disclosure.md), while maintaining subgrid alignment

2. **Multi-Section Table**: Create sections for "Design Services" and "Development Services" with subheadings that span all columns, demonstrating how subgrid handles complex table structures
