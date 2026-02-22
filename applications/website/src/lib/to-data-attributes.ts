/**
 * Configuration for the toDataAttributes function
 */
const configuration = {
  // Keys that should be omitted entirely from the output
  keysToOmit: ['data'] as const,

  // Keys that should be preserved as-is without the data- prefix
  keysToPreserve: ['class', 'style'] as const,
};

// Type for preserved keys to ensure type safety
type PreservedKey = (typeof configuration.keysToPreserve)[number];
type OmitKey = (typeof configuration.keysToOmit)[number];

/**
 * Converts object properties to HTML data attributes.
 *
 * Rules:
 * - Normal properties are prefixed with 'data-'
 * - Properties in keysToPreserve ('class', 'style') are kept as-is
 * - Properties in keysToOmit ('data') are excluded
 * - Null and undefined values are excluded
 *
 * @param props - Object containing properties to convert
 * @returns Object with data attributes and preserved properties
 *
 * @example
 * toDataAttributes({ foo: 'bar', class: 'my-class' })
 * // Returns: { 'data-foo': 'bar', 'class': 'my-class' }
 */
export const toDataAttributes = <T extends Record<string, unknown>>(
  props: T,
): Record<string, unknown> => {
  const result: Record<string, unknown> = {};

  Object.entries(props).forEach(([key, value]) => {
    // Skip keys that should be omitted
    if (configuration.keysToOmit.includes(key as OmitKey)) {
      return;
    }

    // Preserve specific keys without adding the data- prefix
    if (configuration.keysToPreserve.includes(key as PreservedKey)) {
      result[key] = value;
      return;
    }

    // Add data- prefix to other keys, excluding null/undefined values
    if (value !== null && value !== undefined) {
      result[`data-${key}`] = value.toString();
    }
  });

  return result;
};
