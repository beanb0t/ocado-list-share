/**
 * Ocado List Share — Payload Schema
 *
 * Shared between the Chrome extension and landing page.
 * Defines the data format for encoded shopping lists.
 */

const CURRENT_VERSION = 1;

/**
 * Validate a decoded payload object.
 * @param {object} payload
 * @returns {{ valid: boolean, error?: string, payload?: object }}
 */
function validatePayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'Invalid payload: not an object' };
  }

  if (typeof payload.v !== 'number' || payload.v < 1) {
    return { valid: false, error: 'Invalid payload: missing or invalid version' };
  }

  if (payload.v > CURRENT_VERSION) {
    return {
      valid: false,
      error: `This link was created with a newer version (v${payload.v}). Please update Ocado List Share.`,
    };
  }

  if (!Array.isArray(payload.i) || payload.i.length === 0) {
    return { valid: false, error: 'This shared list contains no items.' };
  }

  for (let idx = 0; idx < payload.i.length; idx++) {
    const item = payload.i[idx];
    if (!item || typeof item !== 'object') {
      return { valid: false, error: `Invalid item at position ${idx}` };
    }
    if (typeof item.n !== 'string' || item.n.length === 0) {
      return { valid: false, error: `Item at position ${idx} has no name` };
    }
    if (typeof item.q !== 'number' || item.q < 1) {
      return { valid: false, error: `Item at position ${idx} has invalid quantity` };
    }
  }

  return { valid: true, payload };
}

/**
 * Create a payload object from a list of items.
 * @param {Array<{ name: string, quantity: number, sku?: string }>} items
 * @param {string} [listName]
 * @returns {object}
 */
function createPayload(items, listName) {
  return {
    v: CURRENT_VERSION,
    n: listName || '',
    t: Date.now(),
    i: items.map((item) => {
      const encoded = {
        n: item.name.substring(0, 80),
        q: item.quantity || 1,
      };
      if (item.sku) {
        encoded.s = item.sku;
      }
      return encoded;
    }),
  };
}

// Export for both module and script-tag usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CURRENT_VERSION, validatePayload, createPayload };
}
