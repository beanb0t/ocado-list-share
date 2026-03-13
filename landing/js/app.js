/**
 * Landing Page — App Entry Point
 *
 * Orchestrates decoding, rendering, and action setup.
 */

(function () {
  const result = decodeFromHash();

  if (result.empty) {
    document.getElementById('empty-state').hidden = false;
    return;
  }

  if (result.error) {
    document.getElementById('error-state').hidden = false;
    document.getElementById('error-message').textContent = result.error;
    return;
  }

  document.getElementById('list-state').hidden = false;
  renderList(result.payload);
  setupActions(result.payload);
})();
