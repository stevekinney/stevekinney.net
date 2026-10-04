/**
 * Picks the left edge for a tooltip anchored at `anchor` inside a container that is
 * `containerWidth` wide. The tooltip sits on the right of the anchor when it fits there, flips
 * to the left when it doesn't, and is always held inside the container so it can never widen the
 * page, however narrow the screen or wherever the pointer is.
 */
export const placeTooltip = (
  anchor: number,
  tooltipWidth: number,
  containerWidth: number,
  gap = 12,
): number => {
  const rightEdge = anchor + gap;
  const preferred =
    rightEdge + tooltipWidth <= containerWidth ? rightEdge : anchor - gap - tooltipWidth;
  const furthest = Math.max(0, containerWidth - tooltipWidth);

  return Math.min(Math.max(0, preferred), furthest);
};
