/**
 * Landing Page — Renderer
 *
 * Renders the decoded shopping list payload into the DOM.
 */

function renderList(payload) {
  const listName = document.getElementById('list-name');
  const listMeta = document.getElementById('list-meta');
  const itemList = document.getElementById('item-list');

  // List name and meta
  listName.textContent = payload.n || 'Shared Shopping List';

  const itemCount = payload.i.length;
  const parts = [`${itemCount} item${itemCount !== 1 ? 's' : ''}`];
  if (payload.t) {
    const date = new Date(payload.t);
    parts.push(`shared ${formatDate(date)}`);
  }
  listMeta.textContent = parts.join(' \u00b7 ');

  // Load checked state from localStorage
  const storageKey = 'ocado-share-checked-' + hashCode(window.location.hash);
  const checkedState = loadCheckedState(storageKey);

  // Render items
  itemList.innerHTML = '';
  payload.i.forEach((item, index) => {
    const li = document.createElement('li');
    if (checkedState[index]) li.classList.add('checked');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'item-checkbox';
    checkbox.checked = !!checkedState[index];
    checkbox.addEventListener('change', () => {
      checkedState[index] = checkbox.checked;
      li.classList.toggle('checked', checkbox.checked);
      saveCheckedState(storageKey, checkedState);
    });

    const quantity = document.createElement('span');
    quantity.className = 'item-quantity';
    quantity.textContent = `${item.q || 1}x`;

    const name = document.createElement('span');
    name.className = 'item-name';
    name.textContent = item.n;

    const link = document.createElement('a');
    link.className = 'item-link';
    if (item.u) {
      link.href = `https://www.ocado.com${item.u}`;
      link.title = `View "${item.n}" on Ocado`;
    } else {
      link.href = `https://www.ocado.com/search?q=${encodeURIComponent(item.n)}`;
      link.title = `Search for "${item.n}" on Ocado`;
    }
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = '\u2192';

    li.appendChild(checkbox);
    li.appendChild(quantity);
    li.appendChild(name);
    li.appendChild(link);
    itemList.appendChild(li);
  });
}

function formatDate(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function loadCheckedState(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || {};
  } catch {
    return {};
  }
}

function saveCheckedState(key, state) {
  try {
    localStorage.setItem(key, JSON.stringify(state));
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}
