/**
 * Landing Page — Actions
 *
 * Handles copy-to-clipboard and other user actions.
 */

function setupActions(payload) {
  const copyBtn = document.getElementById('copy-all-btn');
  copyBtn.addEventListener('click', () => {
    const text = payload.i
      .map((item) => {
        const qty = item.q || 1;
        return qty > 1 ? `${item.n} x${qty}` : item.n;
      })
      .join('\n');

    copyToClipboard(text);
  });
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast('Copied to clipboard!');
  } catch {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    showToast('Copied to clipboard!');
  }
}

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.hidden = false;
  setTimeout(() => {
    toast.hidden = true;
  }, 2000);
}
