# Rot & Bloom

Bury what's weighing on you. Come back later — it will have turned into something else.

Rot & Bloom is a small installable web app for letting go of grudges. You write one down, bury it in a compost bin, and pick how long it sits — 7, 30, or 90 days. While it composts, nothing happens; you don't have to think about it. When it's ready, harvesting it reveals a short line and turns the bin into a small plant, permanently rooted in your yard as quiet proof of what you've released.

Everything runs locally. There's no server, no account, and no data collection — what you write never leaves your device.

## Features

- **Bury a grudge** — write it out, choose a decompose time
- **Living compost bins** — each one visually darkens and settles as it decomposes
- **Harvest** — a short reveal line, then the bin becomes a rooted plant in your yard
- **Yard view** — active bins and grown plants sit together in one scrolling space, no tabs
- **Fast mode** — compresses a full cycle into seconds, for trying the app out
- **Reduce motion** — turns off decay/reveal animations, also respects your system setting automatically
- **Export / Import** — back up your data to a file or move it to another browser
- **Installable, works offline** — a real PWA with a home-screen icon and a service worker that caches the app shell

## Getting it running

No build step — it's static files.

**Option A: open it directly**
Double-click `index.html`. It'll work, but some browsers restrict service workers on the `file://` protocol, so offline caching may not kick in until you serve it properly (Option B).

**Option B: serve it locally**
```bash
cd rot-and-bloom
python3 -m http.server 8080
```
Then open `http://localhost:8080` in your browser.

**Option C: deploy it**
Drop the whole folder onto any static host — GitHub Pages, Netlify, Vercel, Cloudflare Pages. No configuration needed; it's plain HTML/CSS/JS.

## Installing as an app

Once it's open over `http://` or `https://` (not a bare `file://` path):

- **Chrome / Edge (desktop):** click the install icon in the address bar, or the menu → "Install Rot & Bloom"
- **Android (Chrome):** menu → "Add to Home screen"
- **iOS (Safari):** Share button → "Add to Home Screen"

After installing, it opens in its own window with no browser chrome, and works fully offline from then on.

## File structure

```
rot-and-bloom/
├── index.html              # App structure — yard, bury flow, detail sheet, settings, intro
├── styles.css               # All styling — color/type tokens, layout, responsive rules
├── app.js                   # State, rendering, decomposition timing, harvest logic
├── manifest.json            # Makes the app installable
├── sw.js                    # Service worker — caches the app shell for offline use
└── icons/
    ├── icon.svg              # Source icon (favicon)
    ├── icon-192.png           # Standard app icon
    ├── icon-512.png           # Standard app icon, large
    ├── icon-maskable-192.png  # Android adaptive icon (safe-zone padded)
    └── icon-maskable-512.png  # Android adaptive icon, large
```

## How data is stored

All grudges and preferences are stored in the browser's `localStorage`, scoped to whichever origin you open the app from. That means:

- Nothing is sent to a server — there isn't one
- Data is per-browser, per-device — it won't sync across devices on its own
- Clearing browser data / site data will delete it — use **Settings → Export as file** periodically if you want a backup
- Switching hosting domains (e.g. moving from `localhost` to a deployed URL) starts you with a fresh, empty yard, since storage is tied to the origin

## Credits

Built by [Sisco Ask](https://github.com/siscoask) — [site](https://siscoask.vercel.app) · [LinkedIn](https://www.linkedin.com/in/siscoask/) · [X](https://x.com/siscoask)

Also linked from inside the app itself: Settings → Credits.
