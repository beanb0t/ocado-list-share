/**
 * Ocado List Share — Content Script (ISOLATED world)
 *
 * Orchestrates item extraction from Ocado pages.
 * Receives data from the MAIN world injector and falls back to DOM scraping.
 * Responds to messages from the popup.
 */

(function () {
  // Store intercepted API data from the MAIN world injector
  let interceptedItems = [];

  // Listen for data from the injector
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'OCADO_LIST_SHARE_DATA' && event.data.source === 'injector') {
      interceptedItems = event.data.items;
    }
  });

  /**
   * Detect what type of Ocado page we're on.
   */
  function detectPageType() {
    const path = window.location.pathname;

    if (path.includes('/lists') || path.includes('/shoppingLists') || path.includes('/shopping-lists')) {
      return 'Shopping List';
    }
    if (path.includes('/basket') || path.includes('/trolley')) {
      return 'Basket';
    }
    if (path.includes('/favorites') || path.includes('/favourites') || path.includes('/regulars')) {
      return 'Favourites';
    }
    // If the page has product cards, it's a browseable page (search, category, etc.)
    if (document.querySelectorAll('.product-card-container').length > 0) {
      return 'Products';
    }
    return 'Page';
  }

  /**
   * Try to extract the shopping list name from the page.
   */
  function extractListName() {
    // Try common heading patterns
    const selectors = [
      'h1',
      '[data-test*="list-name"]',
      '[data-test*="title"]',
      '[data-testid*="list-name"]',
      '[data-testid*="title"]',
      '.list-title',
      '.list-name',
    ];

    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) {
        const text = el.textContent.trim();
        // Filter out generic headings
        if (
          text &&
          text.length < 100 &&
          !text.toLowerCase().includes('ocado') &&
          text.toLowerCase() !== 'all products'
        ) {
          return text;
        }
      }
    }

    return detectPageType();
  }

  // --- Extractor: Intercepted Network Data ---
  function extractFromNetwork() {
    if (interceptedItems.length > 0) {
      return interceptedItems;
    }
    return null;
  }

  // --- Extractor: JSON-LD Structured Data ---
  function extractFromStructuredData() {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const script of scripts) {
      try {
        const data = JSON.parse(script.textContent);
        if (data['@type'] === 'ItemList' && Array.isArray(data.itemListElement)) {
          return data.itemListElement
            .map((item) => ({
              name: item.name || item.item?.name || '',
              quantity: 1,
              sku: item.sku || item.item?.sku || '',
            }))
            .filter((item) => item.name);
        }
      } catch {
        continue;
      }
    }
    return null;
  }

  // --- Extractor: Next.js / Hydration Data ---
  function extractFromHydrationData() {
    // Try __NEXT_DATA__
    const nextDataEl = document.getElementById('__NEXT_DATA__');
    if (nextDataEl) {
      try {
        const data = JSON.parse(nextDataEl.textContent);
        const items = findItemsInObject(data);
        if (items && items.length > 0) return items;
      } catch {
        // ignore
      }
    }

    // Try window state embedded in script tags
    const scripts = document.querySelectorAll('script:not([src])');
    for (const script of scripts) {
      const text = script.textContent;
      if (text.includes('__STATE__') || text.includes('initialState') || text.includes('preloadedState')) {
        try {
          // Try to extract JSON from assignments like window.__STATE__ = {...}
          const match = text.match(/=\s*(\{[\s\S]*\})\s*;?\s*$/);
          if (match) {
            const data = JSON.parse(match[1]);
            const items = findItemsInObject(data);
            if (items && items.length > 0) return items;
          }
        } catch {
          continue;
        }
      }
    }
    return null;
  }

  // --- Extractor: Ocado Product Cards (confirmed selectors) ---
  function extractFromOcadoCards() {
    const cards = document.querySelectorAll('.product-card-container');
    if (cards.length === 0) return null;

    const items = Array.from(cards)
      .map((card) => {
        // Primary: use data-test="fop-product-link" (confirmed on live Ocado)
        const link =
          card.querySelector('[data-test="fop-product-link"]') ||
          card.querySelector('a[href*="/products/"]');
        if (!link) return null;

        const name = link.textContent.trim();
        if (!name || name.length > 100) return null;

        const href = link.getAttribute('href') || '';
        // SKU is the numeric ID at the end of /products/{slug}/{sku}
        const skuMatch = href.match(/\/(\d{5,})$/);
        const sku = skuMatch ? skuMatch[1] : '';

        // Find quantity — check both inside the card and in the parent wrapper.
        // On basket pages, the quantity badge sits outside .product-card-container
        // but inside a shared parent wrapper.
        let quantity = 1;
        const searchRoots = [card];
        // Walk up a few levels to find a wrapper that might contain the qty badge
        let wrapper = card.parentElement;
        for (let i = 0; i < 3 && wrapper; i++) {
          searchRoots.push(wrapper);
          wrapper = wrapper.parentElement;
        }

        for (const root of searchRoots) {
          // Quantity badge text (e.g., class="_quantity-badge__text_...")
          const badgeText = root.querySelector('[class*="quantity-badge__text"]');
          if (badgeText) {
            const val = parseInt(badgeText.textContent.trim(), 10);
            if (val > 0 && val < 100) { quantity = val; break; }
          }
          // Input-based quantity
          const qtyInput = root.querySelector('input[type="number"]');
          if (qtyInput) {
            const val = parseInt(qtyInput.value, 10);
            if (val > 0) { quantity = val; break; }
          }
        }

        // Store the product URL path for direct linking
        const productUrl = href.startsWith('/products/') ? href : '';

        return { name, quantity, sku, url: productUrl };
      })
      .filter(Boolean);

    return items.length > 0 ? items : null;
  }

  // --- Extractor: DOM with Data Attributes ---
  function extractFromDataAttributes() {
    const selectors = [
      '[data-sku]',
      '[data-product-id]',
      '[data-skuid]',
    ];

    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length === 0) continue;

      const items = Array.from(elements).map((el) => {
        const sku = el.dataset.sku || el.dataset.productId || el.dataset.skuid || '';
        const nameEl =
          el.querySelector('[class*="name"], [class*="title"], [data-testid*="name"]') || el;
        const name = nameEl.textContent.trim();

        const qtyEl = el.querySelector('[class*="quantity"], [class*="qty"], input[type="number"]');
        let quantity = 1;
        if (qtyEl) {
          const val = parseInt(qtyEl.value || qtyEl.textContent, 10);
          if (val > 0) quantity = val;
        }

        return { name, quantity, sku };
      }).filter((item) => item.name && item.name.length < 100);

      if (items.length > 0) return items;
    }

    return null;
  }

  // --- Extractor: DOM Heuristic (product cards) ---
  function extractFromDOM() {
    // Look for product cards / list items with typical patterns
    const cardSelectors = [
      '[class*="product-card"]',
      '[class*="ProductCard"]',
      '[class*="product-tile"]',
      '[class*="list-item"]',
      '[class*="ListItem"]',
      '[class*="basket-item"]',
      '[class*="BasketItem"]',
      '[class*="trolley-item"]',
      '[data-testid*="product"]',
      '[data-testid*="item"]',
    ];

    for (const selector of cardSelectors) {
      const cards = document.querySelectorAll(selector);
      if (cards.length < 2) continue; // Need at least 2 to be a list

      const items = Array.from(cards)
        .map((card) => {
          // Find product name
          const nameEl =
            card.querySelector('h2, h3, h4, [class*="name"], [class*="title"], a[href*="/products/"]') ||
            card.querySelector('a');
          if (!nameEl) return null;

          const name = nameEl.textContent.trim();
          if (!name || name.length > 100) return null;

          // Find quantity
          let quantity = 1;
          const qtyEl = card.querySelector(
            'input[type="number"], [class*="quantity"], [class*="qty"], [class*="stepper"] input'
          );
          if (qtyEl) {
            const val = parseInt(qtyEl.value || qtyEl.textContent, 10);
            if (val > 0) quantity = val;
          }

          // Find SKU and URL from links or data attributes
          let sku = '';
          let url = '';
          const link = card.querySelector('a[href*="/products/"]');
          if (link) {
            const href = link.getAttribute('href') || '';
            const match = href.match(/\/products\/[^/]*?(\d{5,})/);
            if (match) sku = match[1];
            if (href.startsWith('/products/')) url = href;
          }

          return { name, quantity, sku, url };
        })
        .filter(Boolean);

      if (items.length > 0) return items;
    }

    return null;
  }

  // --- Extractor: Legacy Ocado /webshop/ pages ---
  function extractFromLegacy() {
    const path = window.location.pathname;
    if (!path.startsWith('/webshop/')) return null;

    // Try the old shopping list API
    const listMatch = path.match(/shoppingLists\/(\d+)/);
    if (listMatch) {
      // We can't make XHR from ISOLATED world to page context,
      // but we can try to read the DOM of the old-style list page
      const rows = document.querySelectorAll('.shoppingListLine, .fop-item, [class*="product"]');
      if (rows.length > 0) {
        return Array.from(rows)
          .map((row) => {
            const nameEl = row.querySelector('.fop-title, .product-name, a[href*="sku="]');
            const qtyEl = row.querySelector('.fop-quantity, input[name*="quantity"]');
            const skuMatch = row.innerHTML.match(/sku[=:]["']?(\d+)/i);

            return {
              name: nameEl ? nameEl.textContent.trim() : '',
              quantity: qtyEl ? parseInt(qtyEl.value || qtyEl.textContent, 10) || 1 : 1,
              sku: skuMatch ? skuMatch[1] : '',
            };
          })
          .filter((item) => item.name);
      }
    }

    return null;
  }

  /**
   * Recursively search an object for arrays of product-like items.
   */
  function findItemsInObject(obj, depth) {
    if ((depth || 0) > 6 || !obj || typeof obj !== 'object') return null;

    if (Array.isArray(obj) && obj.length > 0) {
      const sample = obj[0];
      if (
        typeof sample === 'object' &&
        sample !== null &&
        (sample.sku || sample.id || sample.productId || sample.skuId) &&
        (sample.name || sample.title || sample.productName || sample.displayName)
      ) {
        return obj
          .map((p) => ({
            sku: String(p.sku || p.skuId || p.id || p.productId || ''),
            name: p.name || p.title || p.productName || p.displayName || '',
            quantity: p.quantity || p.qty || p.count || 1,
          }))
          .filter((item) => item.name);
      }
    }

    if (!Array.isArray(obj)) {
      for (const key of Object.keys(obj)) {
        try {
          const result = findItemsInObject(obj[key], (depth || 0) + 1);
          if (result && result.length > 0) return result;
        } catch {
          // Skip
        }
      }
    }

    return null;
  }

  /**
   * Run all extractors in priority order.
   */
  function extractItems() {
    const extractors = [
      extractFromNetwork,
      extractFromStructuredData,
      extractFromHydrationData,
      extractFromOcadoCards,
      extractFromDataAttributes,
      extractFromDOM,
      extractFromLegacy,
    ];

    for (const extractor of extractors) {
      try {
        const items = extractor();
        if (items && items.length > 0) {
          // Deduplicate by name
          const seen = new Set();
          return items.filter((item) => {
            const key = item.name.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
        }
      } catch {
        // Continue to next extractor
      }
    }

    return [];
  }

  // Listen for messages from the popup
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'EXTRACT_ITEMS') {
      const items = extractItems();
      const pageType = detectPageType();
      const listName = extractListName();

      sendResponse({
        items,
        pageType,
        listName,
      });
    }
    return true; // Keep the message channel open for async response
  });
})();
