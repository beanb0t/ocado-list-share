# Ocado List Share

Share your Ocado shopping list or basket with anyone — no sign-up, no app install needed for the recipient.

## How it works

1. **Install the Chrome extension** (sender only)
2. Go to your Ocado shopping list or basket
3. Click the extension icon → **Share This List**
4. A short link is copied to your clipboard
5. Send the link to anyone — they see your list and can click through to each item on Ocado

All data is encoded directly in the URL using [lz-string](https://github.com/pieroxy/lz-string) compression. **No backend, no database, no accounts** — the link contains everything.

## Install

### Chrome Extension (sender)

1. Clone this repo
2. Open `chrome://extensions` in Chrome
3. Enable **Developer mode** (top right)
4. Click **Load unpacked** → select the `extension/` folder

### Landing Page (host your own)

Each user should deploy their own landing page so share links point to a URL you control.

1. Fork this repo
2. Enable **GitHub Pages** in your fork: Settings → Pages → Source: `main`, folder: `/` (root)
3. Your landing page will be at `https://<your-username>.github.io/ocado-list-share`
4. Update `LANDING_PAGE_URL` in `extension/lib/encoder.js` to your GitHub Pages URL

## Project Structure

```
extension/          Chrome extension (Manifest V3)
  content/          Content scripts for extracting items from Ocado
  popup/            Extension popup UI
  lib/              lz-string + encoder
  background/       Service worker
landing/            Static landing page for recipients
  js/               Decoder, renderer, actions
  css/              Styles (dark/light mode)
shared/             Shared schema and compression utils
tests/              Encoding/decoding tests
```

## Supported Pages

- **Shopping Lists** (`ocado.com/lists`)
- **Basket** (`ocado.com/basket`)
- **Favourites** (`ocado.com/favourites`)

## Development

```bash
npm install
npm test          # Run encoding/decoding tests
npx serve landing -l 3456   # Preview landing page locally
```

## Privacy

- All list data lives in the URL hash fragment — **never sent to any web server** (including GitHub Pages)
- Each user hosts their own landing page, so share links point to a URL you control
- Links are shortened via [is.gd](https://is.gd) — note that the **full URL including the hash is sent to is.gd** when shortening. If this concerns you, disable shortening in `popup.js` by replacing the `shortenURL()` call with the long URL directly
- No analytics, no tracking, no cookies on the landing page
