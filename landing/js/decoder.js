/**
 * Landing Page — Decoder
 *
 * Reads the URL hash fragment and decodes the shopping list payload.
 * Uses the same schema validation as the extension.
 */

const CURRENT_VERSION = 1;

function validatePayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'This link appears to be invalid or corrupted. Ask the sender to share a new link.' };
  }

  if (typeof payload.v !== 'number' || payload.v < 1) {
    return { valid: false, error: 'This link appears to be invalid. Ask the sender to share a new link.' };
  }

  if (payload.v > CURRENT_VERSION) {
    return {
      valid: false,
      error: `This link was created with a newer version of Ocado List Share. Please try refreshing the page.`,
    };
  }

  if (!Array.isArray(payload.i) || payload.i.length === 0) {
    return { valid: false, error: 'This shared list contains no items.' };
  }

  for (let idx = 0; idx < payload.i.length; idx++) {
    const item = payload.i[idx];
    if (!item || typeof item !== 'object' || typeof item.n !== 'string' || !item.n) {
      return { valid: false, error: 'This link contains invalid data. Ask the sender to share a new link.' };
    }
  }

  return { valid: true };
}

function decodeFromHash() {
  const hash = window.location.hash.replace(/^#/, '');
  if (!hash) return { empty: true };

  const json = LZString.decompressFromEncodedURIComponent(hash);
  if (!json) {
    return { error: 'This link appears to be invalid or corrupted. Ask the sender to share a new link.' };
  }

  let payload;
  try {
    payload = JSON.parse(json);
  } catch {
    return { error: 'This link appears to be invalid or corrupted. Ask the sender to share a new link.' };
  }

  const validation = validatePayload(payload);
  if (!validation.valid) {
    return { error: validation.error };
  }

  return { payload };
}
