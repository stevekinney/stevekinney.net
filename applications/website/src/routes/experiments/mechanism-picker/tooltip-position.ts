/**
 * Picks the left edge for a tooltip centered under an anchor, held inside a
 * container `containerWidth` wide. A tooltip that's wider than the container
 * starts at its left edge, so it can never widen the page, however narrow the
 * screen or wherever the anchor is.
 */
export const placeTooltip = (
  anchorCenter: number,
  tooltipWidth: number,
  containerWidth: number,
): number => {
  const preferred = anchorCenter - tooltipWidth / 2;
  const furthest = Math.max(0, containerWidth - tooltipWidth);

  return Math.min(Math.max(0, preferred), furthest);
};
