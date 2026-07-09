const { app, BrowserWindow, BrowserView, ipcMain, session, shell, screen, Menu } = require("electron");
const path = require("path");
const fs = require("fs");
const { URL } = require("url");

const ADMIN_URL = process.env.LEFLOW_ADMIN_URL || "https://studioleflow.com/admin";
const ADMIN_ORIGIN = new URL(ADMIN_URL).origin;
const TOPBAR_HEIGHT = 44;
const ADMIN_THEME_CSS = fs.readFileSync(path.join(__dirname, "admin-theme.css"), "utf-8");

// Key combos that read as "this is a browser" - a real desktop app doesn't
// reload, find-in-page, print, open a new tab/window, or navigate back/forward
// on a keystroke. Swallow them so the only navigation is through our own
// launcher/titlebar. DevTools stay reachable (Ctrl+Shift+I/F12) only in dev.
const BLOCKED_SHORTCUT_KEYS = new Set(["r", "f", "p", "g", "n", "t", "w", "l"]);
function suppressBrowserShortcuts(webContents) {
  webContents.on("before-input-event", (event, input) => {
    if (input.type !== "keyDown") return;
    const key = input.key.toLowerCase();
    const ctrlOrCmd = input.control || input.meta;

    if (key === "f5") return event.preventDefault();
    if (key === "f11") return event.preventDefault();
    if (key === "f12" && app.isPackaged) return event.preventDefault();
    if (ctrlOrCmd && BLOCKED_SHORTCUT_KEYS.has(key)) return event.preventDefault();
    if (ctrlOrCmd && (key === "+" || key === "-" || key === "=" || key === "0")) return event.preventDefault();
    if (ctrlOrCmd && input.shift && (key === "i" || key === "j" || key === "c") && app.isPackaged) {
      return event.preventDefault();
    }
    if (input.alt && (key === "arrowleft" || key === "arrowright")) return event.preventDefault();
  });

  // Mouse back/forward side buttons (XButton1/2) fire as OS app-commands, not
  // key events - block those too so a stray mouse click can't "browse back".
  webContents.on("app-command", (event, cmd) => {
    if (cmd === "browser-backward" || cmd === "browser-forward") event.preventDefault();
  });

  webContents.on("did-finish-load", () => {
    webContents.setVisualZoomLevelLimits(1, 1).catch(() => {});
  });

  // Replace Chromium's default context menu (Back/Forward/Reload/Inspect/
  // "Save page as...") with a minimal Cut/Copy/Paste one, only where it's
  // actually relevant - anywhere else, no menu at all. That default menu is
  // one of the biggest "this is just a browser" tells.
  webContents.on("context-menu", (event, params) => {
    event.preventDefault();
    const items = [];
    if (params.isEditable) {
      items.push({ role: "cut", enabled: params.editFlags.canCut });
      items.push({ role: "copy", enabled: params.editFlags.canCopy });
      items.push({ role: "paste", enabled: params.editFlags.canPaste });
      items.push({ type: "separator" });
      items.push({ role: "selectAll" });
    } else if (params.selectionText) {
      items.push({ role: "copy" });
    }
    if (items.length) Menu.buildFromTemplate(items).popup();
  });
}

// Keep in sync with ADMIN_NAV in client/src/pages/admin.tsx - these are the only
// tab values the launcher grid is allowed to click into the real page.
const KNOWN_TABS = new Set([
  "dashboard", "users", "messages", "katastar", "portal",
  "projects", "comments", "user-songs", "game", "smart-links", "news",
  "jobs", "contracts", "rights-protection", "invoices", "calendar",
  "newsletter", "email", "settings",
]);

let mainWindow;
let contentView;
let activeTabPoll;
let lastKnownTab = null;
let lastKnownRole = null;
let lastKnownToken = null;
let roleFetchInFlight = false;
let atHome = true;

function layoutContentView() {
  if (!mainWindow || !contentView) return;
  const [width, height] = mainWindow.getContentSize();
  // Logged out: the login/public page must always be visible (full-bleed).
  // Logged in + at the launcher grid: hide the real page (zero-size) so only
  // the native icon grid shows. Logged in + inside a section: full-bleed.
  const showContent = !lastKnownRole || !atHome;
  contentView.setBounds({
    x: 0,
    y: TOPBAR_HEIGHT,
    width: showContent ? width : 0,
    height: showContent ? Math.max(0, height - TOPBAR_HEIGHT) : 0,
  });
}

function applyRole(role) {
  const wasLoggedOut = !lastKnownRole;
  lastKnownRole = role;
  if (role && wasLoggedOut) atHome = true;
  mainWindow?.webContents.send("role-state", role);
  layoutContentView();
}

async function fetchRoleForToken(token) {
  if (roleFetchInFlight || !contentView) return;
  roleFetchInFlight = true;
  try {
    const user = await contentView.webContents.executeJavaScript(
      `fetch("/api/user", { headers: { Authorization: "Bearer " + ${JSON.stringify(token)} } })
        .then(r => (r.ok ? r.json() : null))
        .then(u => (u ? { role: u.role || null, username: u.username || null } : null))
        .catch(() => null)`,
      true
    );
    if (token === lastKnownToken) {
      applyRole(user?.role ?? null);
      mainWindow?.webContents.send("user-state", user?.username ?? null);
    }
  } finally {
    roleFetchInFlight = false;
  }
}

async function pollPageState() {
  if (!contentView || contentView.webContents.isDestroyed()) return;
  try {
    const [token, tab] = await contentView.webContents.executeJavaScript(
      `[localStorage.getItem("auth_token"), sessionStorage.getItem("admin-active-tab")]`,
      true
    );
    if (token !== lastKnownToken) {
      lastKnownToken = token;
      if (token) {
        fetchRoleForToken(token);
      } else {
        applyRole(null);
      }
    }
    if (tab && tab !== lastKnownTab) {
      lastKnownTab = tab;
      mainWindow?.webContents.send("active-tab", tab);
    }
  } catch (e) {
    console.log("[poll] error", e.message);
  }
}

function createWindow() {
  const persistentSession = session.fromPartition("persist:leflow-admin");

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    frame: false,
    roundedCorners: true,
    backgroundColor: "#0b0d12",
    icon: path.join(__dirname, "..", "build", "icon.png"),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "shell-preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false,
    },
    show: false,
  });

  mainWindow.loadFile(path.join(__dirname, "shell.html"));
  suppressBrowserShortcuts(mainWindow.webContents);

  contentView = new BrowserView({
    webPreferences: {
      session: persistentSession,
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false,
    },
  });
  mainWindow.setBrowserView(contentView);
  contentView.webContents.loadURL(ADMIN_URL);
  suppressBrowserShortcuts(contentView.webContents);

  contentView.webContents.on("dom-ready", () => {
    contentView.webContents.insertCSS(ADMIN_THEME_CSS);
  });

  contentView.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  // The admin panel never legitimately links to a different origin - if the
  // page tries to navigate the content view itself off studioleflow.com
  // (e.g. a target-less <a> to an external URL), send it to the system
  // browser instead of turning this app into a general-purpose browser.
  contentView.webContents.on("will-navigate", (event, url) => {
    if (new URL(url).origin !== ADMIN_ORIGIN) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.on("resize", layoutContentView);
  mainWindow.on("maximize", () => {
    // Electron/Windows bug: maximize() on a frame:false window overshoots the
    // display's work area by the invisible resize-border margin (e.g. bounds
    // become -8,-8,1936,1048 on a 1920x1080 screen). Keep the real OS
    // "maximized" state (square corners, correct taskbar/Alt+Tab behavior)
    // but immediately correct the bounds to the actual work area.
    const display = screen.getDisplayMatching(mainWindow.getBounds());
    mainWindow.setBounds(display.workArea);
    layoutContentView();
    mainWindow.webContents.send("window-state", true);
  });
  mainWindow.on("unmaximize", () => {
    layoutContentView();
    mainWindow.webContents.send("window-state", false);
  });

  mainWindow.once("ready-to-show", () => {
    layoutContentView();
    mainWindow.show();
  });

  activeTabPoll = setInterval(pollPageState, 700);

  mainWindow.on("closed", () => {
    clearInterval(activeTabPoll);
    contentView = null;
    mainWindow = null;
  });
}

ipcMain.on("titlebar:minimize", () => mainWindow?.minimize());
ipcMain.on("titlebar:maximize", () => {
  if (!mainWindow) return;
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});
ipcMain.on("titlebar:close", () => mainWindow?.close());

ipcMain.on("shell:goto", (_event, tabValue) => {
  if (!contentView || !KNOWN_TABS.has(tabValue)) return;
  lastKnownTab = tabValue;
  atHome = false;
  layoutContentView();
  contentView.webContents.executeJavaScript(
    `document.querySelector('[data-testid="tab-${tabValue}"]')?.click();`
  );
});

ipcMain.on("shell:home", () => {
  atHome = true;
  layoutContentView();
});

Menu.setApplicationMenu(null);
app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
