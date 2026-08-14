# Base44 Setup Notes

## What this is
A static PWA (no build step, no local backend) — `index.html` + `js/` + `style.css` + `images/` + `manifest.json`. The game backend is a Google Apps Script web app accessed via a Cloudflare Worker proxy; credentials are injected into `js/config.js` at deploy time via `%%PLACEHOLDER%%` tokens.

## How it runs here
- Served by **nginx:alpine** on host port 3000 (`docker-compose.base44.yml`).
- The repo is bind-mounted read-only; nginx runs as root (`user: "0:0"` + custom `nginx.main.base44.conf`) because the sandbox bind-mount files aren't readable by the default `nginx` worker user.
- nginx serves the app at both `/` (preview entry) and `/hs-bingo/` (the PWA base path the manifest and icons reference).

## Secrets (all optional for preview)
The app renders without them, but gameplay (login, rolling, proof upload) won't work until these are provided via the Secrets page and injected into `js/config.js`:
- `APPS_SCRIPT_URL`, `WEB_SECRET`, `ADMIN_CODE`, `SPECTATOR_CODE`, `IMGBB_KEY`, `PROXY_URL`

## Verify
`curl -sf http://localhost:3000/` returns the HTML; `/js/config.js`, `/style.css`, `/hs-bingo/manifest.json` all return 200.
