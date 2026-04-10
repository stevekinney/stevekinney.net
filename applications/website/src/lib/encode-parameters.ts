/**
 * Encodes parameter object into a URL query string
 * @param values - Object containing key-value pairs to encode
 * @returns Encoded URL query string
 */
export const encodeParameters = (values: Record<string, unknown>): string => {
  const encoded = new URLSearchParams();

  Object.entries(values).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      encoded.append(key, String(value));
    } else if (Array.isArray(value)) {
      if (value.length === 0) {
        // Skip empty arrays to keep the original behavior
        return;
      }

      value.forEach((item) => {
        encoded.append(key, item === undefined || item === null ? String(item) : String(item));
      });
    } else {
      encoded.append(key, String(value));
    }
  });

  return encoded.toString();
};
