/**
 * Ocado List Share — Network Injector (MAIN world)
 *
 * Runs at document_start in the page's JS context.
 * Monkey-patches fetch to intercept API responses containing product data.
 * Sends intercepted data to the content script via window.postMessage.
 */

(function () {
  const INTERCEPT_KEY = '__ocado_list_share__';

  // Avoid double-injection
  if (window[INTERCEPT_KEY]) return;
  window[INTERCEPT_KEY] = true;

  const interceptedData = [];

  function looksLikeProductArray(arr) {
    if (!Array.isArray(arr) || arr.length === 0) return false;
    const sample = arr[0];
    if (typeof sample !== 'object' || sample === null) return false;

    // Check for common product-like fields
    const hasId = 'sku' in sample || 'id' in sample || 'productId' in sample || 'skuId' in sample;
    const hasName =
      'name' in sample ||
      'title' in sample ||
      'productName' in sample ||
      'displayName' in sample;

    return hasId && hasName;
  }

  function findProductArrays(obj, depth) {
    if (depth > 5 || !obj || typeof obj !== 'object') return [];
    const results = [];

    if (Array.isArray(obj)) {
      if (looksLikeProductArray(obj)) results.push(obj);
    } else {
      for (const key of Object.keys(obj)) {
        try {
          results.push(...findProductArrays(obj[key], depth + 1));
        } catch {
          // Skip circular refs or access errors
        }
      }
    }
    return results;
  }

  function processResponseData(url, data) {
    const productArrays = findProductArrays(data, 0);
    for (const products of productArrays) {
      const items = products
        .map((p) => ({
          sku: p.sku || p.skuId || p.id || p.productId || '',
          name: p.name || p.title || p.productName || p.displayName || '',
          quantity: p.quantity || p.qty || p.count || 1,
        }))
        .filter((item) => item.name);

      if (items.length > 0) {
        interceptedData.push({ url, items, timestamp: Date.now() });

        window.postMessage(
          {
            type: 'OCADO_LIST_SHARE_DATA',
            source: 'injector',
            url,
            items,
          },
          '*'
        );
      }
    }
  }

  // Patch fetch
  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    const response = await originalFetch.apply(this, args);
    const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';

    // Only intercept JSON responses from Ocado
    if (url.includes('ocado.com') || url.startsWith('/')) {
      try {
        const clone = response.clone();
        const contentType = clone.headers.get('content-type') || '';
        if (contentType.includes('json')) {
          clone.json().then((data) => processResponseData(url, data)).catch(() => {});
        }
      } catch {
        // Silently ignore
      }
    }

    return response;
  };

  // Patch XMLHttpRequest
  const originalXHROpen = XMLHttpRequest.prototype.open;
  const originalXHRSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this._ocadoListShareURL = url;
    return originalXHROpen.call(this, method, url, ...rest);
  };

  XMLHttpRequest.prototype.send = function (...args) {
    this.addEventListener('load', function () {
      const url = this._ocadoListShareURL || '';
      if (url.includes('ocado.com') || url.startsWith('/')) {
        try {
          const contentType = this.getResponseHeader('content-type') || '';
          if (contentType.includes('json')) {
            const data = JSON.parse(this.responseText);
            processResponseData(url, data);
          }
        } catch {
          // Silently ignore
        }
      }
    });
    return originalXHRSend.apply(this, args);
  };
})();
