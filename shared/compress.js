/**
 * Ocado List Share — Compression Utilities
 *
 * Wraps lz-string for encoding/decoding shopping list payloads
 * into URL-safe compressed strings.
 */

/**
 * Get the LZString library depending on the environment.
 * Works in both Node.js (for tests) and browser (extension/landing page).
 */
function getLZString() {
  if (typeof LZString !== 'undefined') return LZString;
  if (typeof require !== 'undefined') return require('lz-string');
  throw new Error('LZString library not available');
}

/**
 * Encode a payload object into a compressed, URL-safe string.
 * @param {object} payload - The validated payload object
 * @returns {string} Compressed, URI-component-safe string
 */
function encodePayload(payload) {
  const json = JSON.stringify(payload);
  return getLZString().compressToEncodedURIComponent(json);
}

/**
 * Decode a compressed string back into a payload object.
 * @param {string} compressed - The compressed string from the URL hash
 * @returns {object|null} The decoded payload, or null if decompression fails
 */
function decodePayload(compressed) {
  const lz = getLZString();
  const json = lz.decompressFromEncodedURIComponent(compressed);
  if (!json) return null;
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/**
 * Generate a full share URL from a payload.
 * @param {object} payload - The payload object
 * @param {string} baseURL - The landing page base URL
 * @returns {string} The full shareable URL
 */
function generateShareURL(payload, baseURL) {
  const compressed = encodePayload(payload);
  const base = baseURL.replace(/\/+$/, '');
  return `${base}/#${compressed}`;
}

/**
 * Extract and decode a payload from a URL's hash fragment.
 * @param {string} hash - The URL hash (with or without leading #)
 * @returns {object|null} The decoded payload, or null
 */
function decodeFromHash(hash) {
  const compressed = hash.replace(/^#/, '');
  if (!compressed) return null;
  return decodePayload(compressed);
}

// Export for both module and script-tag usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { encodePayload, decodePayload, generateShareURL, decodeFromHash };
}
