/**
 * Ocado List Share — Popup
 *
 * Communicates with the content script to extract items,
 * then generates and copies a shareable link.
 */

const states = {
  notOcado: document.getElementById('state-not-ocado'),
  scanning: document.getElementById('state-scanning'),
  empty: document.getElementById('state-empty'),
  ready: document.getElementById('state-ready'),
  shared: document.getElementById('state-shared'),
  error: document.getElementById('state-error'),
};

let extractedData = null;

function showState(name) {
  Object.values(states).forEach((el) => (el.hidden = true));
  states[name].hidden = false;
}

async function init() {
  // Get the active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab || !tab.url || !tab.url.includes('ocado.com')) {
    showState('notOcado');
    return;
  }

  showState('scanning');

  try {
    // Send message to content script to extract items
    const response = await chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_ITEMS' });

    if (!response || !response.items || response.items.length === 0) {
      showState('empty');
      return;
    }

    extractedData = response;

    // Show ready state
    const pageType = document.getElementById('page-type');
    const itemCount = document.getElementById('item-count');
    pageType.textContent = response.pageType || 'Shopping List';
    itemCount.textContent = `${response.items.length} item${response.items.length !== 1 ? 's' : ''} found`;

    showState('ready');
  } catch (err) {
    // Content script might not be loaded yet — try injecting it
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content/content.js'],
      });

      const response = await chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_ITEMS' });

      if (!response || !response.items || response.items.length === 0) {
        showState('empty');
        return;
      }

      extractedData = response;
      const pageType = document.getElementById('page-type');
      const itemCount = document.getElementById('item-count');
      pageType.textContent = response.pageType || 'Shopping List';
      itemCount.textContent = `${response.items.length} item${response.items.length !== 1 ? 's' : ''} found`;
      showState('ready');
    } catch {
      showState('empty');
    }
  }
}

// Share button
document.getElementById('share-btn').addEventListener('click', async () => {
  if (!extractedData) return;

  const url = OcadoEncoder.generateShareURL(
    extractedData.items,
    extractedData.listName
  );

  // Copy to clipboard
  try {
    await navigator.clipboard.writeText(url);
  } catch {
    // Fallback
    const input = document.createElement('input');
    input.value = url;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
  }

  // Show the shared state
  document.getElementById('share-url').value = url;
  document.getElementById('preview-link').href = url;
  showState('shared');
});

// Copy button (in shared state)
document.getElementById('copy-btn').addEventListener('click', async () => {
  const url = document.getElementById('share-url').value;
  try {
    await navigator.clipboard.writeText(url);
  } catch {
    document.getElementById('share-url').select();
    document.execCommand('copy');
  }
});

// Initialize
init();
