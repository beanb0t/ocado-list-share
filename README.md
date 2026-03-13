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

### Landing Page (recipient)

The landing page is hosted at **[beanb0t.github.io/ocado-list-share](https://beanb0t.github.io/ocado-list-share)** — recipients just click the shared link, no install needed.

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

- All list data lives in the URL hash fragment — it's never sent to any server
- Links are shortened via [is.gd](https://is.gd) (the full URL is sent to their API)
- No analytics, no tracking, no cookies
