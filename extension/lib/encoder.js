/**
 * Ocado List Share — Encoder (Extension-side)
 *
 * Wraps lz-string for encoding shopping list payloads into shareable URLs.
 * Loaded by the popup alongside lz-string.min.js.
 */

const OcadoEncoder = (() => {
  const CURRENT_VERSION = 1;
  // ⚠️ Change this to YOUR GitHub Pages URL after forking
  const LANDING_PAGE_URL = 'https://beanb0t.github.io/ocado-list-share';

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
        if (item.url) {
          encoded.u = item.url;
        }
        return encoded;
      }),
    };
  }

  function encode(payload) {
    const json = JSON.stringify(payload);
    return LZString.compressToEncodedURIComponent(json);
  }

  function generateShareURL(items, listName) {
    const payload = createPayload(items, listName);
    const compressed = encode(payload);
    return `${LANDING_PAGE_URL}/#${compressed}`;
  }

  return { createPayload, encode, generateShareURL, LANDING_PAGE_URL };
})();
