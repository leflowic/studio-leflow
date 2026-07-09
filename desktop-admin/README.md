# LeFlow Admin (Desktop)

Standalone Windows desktop shell for the Studio LeFlow admin panel, built to feel
like a real native app (Discord/Slack-style) rather than a website in a window.

- **Native left sidebar** (`src/shell.html` + `src/shell.js`) - its own icon+label
  navigation mirroring the real admin panel's tabs, rendered by Electron itself,
  not by the website. Clicking an item sends IPC to the main process, which clicks
  the matching `[data-testid="tab-<value>"]` button inside the real page.
- The website's own sidebar/heading are hidden (via injected CSS, `src/admin-theme.css`)
  so the real page only shows the tab content, filling the rest of the window.
- Sidebar items are filtered by the logged-in user's staff role (decoded from the
  JWT in `localStorage`, same roles as `ADMIN_NAV` in `client/src/pages/admin.tsx`
  - **keep both lists in sync if the real admin nav changes**).
- No default OS title bar/menu - window controls + back/forward/reload float in a
  slim top strip above the content area.

Login persists between launches (own Electron session partition), same as logging
into the site in a normal browser.

## Run in dev

```bash
cd desktop-admin
npm install
npm start
```

## Build a Windows installer / portable exe

```bash
npm run dist
```

Output goes to `desktop-admin/release/` - an NSIS installer (with desktop shortcut)
and a portable `.exe`.

## Notes

- Target URL defaults to `https://studioleflow.com/admin`. Override for local testing:
  `LEFLOW_ADMIN_URL=http://localhost:5000/admin npm start`
- App icon (`build/icon.png`) is `avatar_200.png` (200x200). For a crisper installer/taskbar
  icon, drop in a 1024x1024 PNG at that path before running `npm run dist`.
