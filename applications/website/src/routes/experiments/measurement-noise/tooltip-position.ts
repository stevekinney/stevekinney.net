/** How far in from each side of the container the tooltip has to stay, such as an axis gutter. */
export type TooltipInset = { left: number; right: number };

/**
 * Picks the left edge for a tooltip anchored at `anchor` inside a container that is
 * `containerWidth` wide. The tooltip sits on the right of the anchor when it fits there, flips
 * to the left when it doesn't, and is always held between the insets, which a chart sets to its
 * plot margins so the tooltip never covers the axis labels. With no insets that is the whole
 * container, so it can never widen the page, however narrow the screen or wherever the pointer is.
 */
export const placeTooltip = (
  anchor: number,
  tooltipWidth: number,
  containerWidth: number,
  gap = 12,
  inset: TooltipInset = { left: 0, right: 0 },
): number => {
  const closest = Math.max(0, inset.left);
  const boundary = containerWidth - Math.max(0, inset.right);
  const rightEdge = anchor + gap;
  const preferred = rightEdge + tooltipWidth <= boundary ? rightEdge : anchor - gap - tooltipWidth;
  const furthest = Math.max(closest, boundary - tooltipWidth);

  return Math.min(Math.max(closest, preferred), furthest);
};

/**
 * Picks the left edge for a tooltip centered under an anchor, held inside a
 * container of `containerWidth`. Used for the explanations under each number.
 */
export const centerTooltip = (
  anchor: number,
  tooltipWidth: number,
  containerWidth: number,
): number => Math.max(0, Math.min(anchor - tooltipWidth / 2, containerWidth - tooltipWidth));
