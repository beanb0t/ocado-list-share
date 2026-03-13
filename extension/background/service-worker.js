/**
 * Ocado List Share — Service Worker
 *
 * Handles extension lifecycle events.
 */

// Show the extension action only on Ocado pages
chrome.runtime.onInstalled.addListener(() => {
  chrome.action.setBadgeBackgroundColor({ color: '#6c3fa0' });
});
