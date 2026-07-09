const { app, BrowserWindow, BrowserView, ipcMain, session, shell, screen, Menu, Notification, Tray, nativeImage } = require("electron");
const path = require("path");
const fs = require("fs");
const { URL } = require("url");
const WebSocket = require("ws");

const ADMIN_URL = process.env.LEFLOW_ADMIN_URL || "https://studioleflow.com/admin";
const ADMIN_ORIGIN = new URL(ADMIN_URL).origin;
const NOTIFICATION_WS_URL = ADMIN_ORIGIN.replace(/^http/, "ws") + "/api/ws";
const NOTIFICATION_ICON = path.join(__dirname, "..", "build", "icon.png");
const TRAY_ICON = path.join(__dirname, "assets", "tray-icon.png");
const TRAY_ICON_ALERT = path.join(__dirname, "assets", "tray-icon-alert.png");
const OVERLAY_BADGE_ICON = nativeImage.createFromPath(path.join(__dirname, "assets", "overlay-badge.png"));
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
  "jobs", "testimonials", "contracts", "rights-protection", "invoices", "calendar",
  "newsletter", "email", "settings",
]);

let mainWindow;
let contentView;
let tray;
let activeTabPoll;
let lastKnownTab = null;
let lastKnownRole = null;
let lastKnownToken = null;
let lastKnownUserId = null;
let roleFetchInFlight = false;
let atHome = true;
let isQuitting = false;
let unreadCount = 0;

let notifSocket = null;
let notifReconnectTimer = null;
let notifReconnectDelay = 3000;

function updateTrayState() {
  if (!tray) return;
  tray.setImage(unreadCount > 0 ? TRAY_ICON_ALERT : TRAY_ICON);
  tray.setToolTip(unreadCount > 0 ? `LeFlow Admin - ${unreadCount} novo` : "LeFlow Admin");
  mainWindow?.setOverlayIcon(
    unreadCount > 0 ? OVERLAY_BADGE_ICON : null,
    unreadCount > 0 ? `${unreadCount} novih obaveštenja` : ""
  );
}

function markUnread() {
  unreadCount++;
  updateTrayState();
}

function clearUnread() {
  if (unreadCount === 0) return;
  unreadCount = 0;
  updateTrayState();
}

function showAndFocusWindow() {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function createTray() {
  tray = new Tray(nativeImage.createFromPath(TRAY_ICON));
  tray.setToolTip("LeFlow Admin");
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: "Otvori LeFlow Admin", click: showAndFocusWindow },
      { type: "separator" },
      {
        label: "Izađi",
        click: () => {
          isQuitting = true;
          app.quit();
        },
      },
    ])
  );
  // Left-click on Windows only opens the context menu by default - make a
  // plain click also raise the window, same as every other tray-resident app.
  tray.on("click", showAndFocusWindow);
}

function gotoTab(tabValue) {
  if (!contentView || !KNOWN_TABS.has(tabValue)) return;
  lastKnownTab = tabValue;
  atHome = false;
  layoutContentView();
  contentView.webContents.executeJavaScript(
    `document.querySelector('[data-testid="tab-${tabValue}"]')?.click();`
  );
}

function showNativeNotification({ title, body, onClick }) {
  markUnread();
  if (!Notification.isSupported()) return;
  const n = new Notification({ title, body, icon: NOTIFICATION_ICON });
  n.on("click", () => {
    showAndFocusWindow();
    onClick?.();
  });
  n.show();
}

// The desktop app keeps its OWN WebSocket connection to the same /api/ws
// endpoint the web page uses (see WebSocketContext.tsx), authenticated with
// the same JWT read out of the page's localStorage. This is deliberately
// independent of whatever the BrowserView's page is doing - it doesn't rely
// on the page's own document.hidden-gated Notification calls (tuned for
// browser tabs, not a native window that can be minimized/occluded), and it
// lets a notification click reliably restore + focus our frameless window
// and jump straight to the relevant tab, not just call the page's
// `window.focus()`.
function handleNotificationSocketMessage(msg) {
  if (mainWindow?.isFocused()) return; // only interrupt when the app isn't already in front

  if (msg.type === "new_message") {
    const senderId = msg.message?.senderId;
    if (lastKnownUserId && senderId && senderId !== lastKnownUserId) {
      showNativeNotification({
        title: `Nova poruka od ${msg.message?.senderUsername || "korisnika"}`,
        body: msg.message?.content || "Poslao ti je poruku",
        onClick: () => gotoTab("messages"),
      });
    }
  } else if (msg.type === "feed_notification") {
    showNativeNotification({
      title: "Nova aktivnost",
      body: msg.notification?.message || "Imaš novo obaveštenje",
    });
  } else if (msg.type === "notification" && msg.title) {
    showNativeNotification({ title: msg.title, body: msg.description || "" });
  }
}

function closeNotificationSocket() {
  if (notifReconnectTimer) {
    clearTimeout(notifReconnectTimer);
    notifReconnectTimer = null;
  }
  if (notifSocket) {
    const socket = notifSocket;
    notifSocket = null;
    socket.removeAllListeners();
    socket.close();
  }
}

function connectNotificationSocket(token) {
  closeNotificationSocket();
  if (!token) return;

  const socket = new WebSocket(NOTIFICATION_WS_URL);
  notifSocket = socket;

  socket.on("open", () => {
    notifReconnectDelay = 3000;
    socket.send(JSON.stringify({ type: "auth", token }));
  });
  socket.on("message", (data) => {
    let msg;
    try {
      msg = JSON.parse(data.toString());
    } catch {
      return;
    }
    handleNotificationSocketMessage(msg);
  });
  socket.on("close", () => {
    if (notifSocket !== socket) return;
    notifSocket = null;
    notifReconnectTimer = setTimeout(() => {
      notifReconnectDelay = Math.min(notifReconnectDelay * 2, 30000);
      connectNotificationSocket(token);
    }, notifReconnectDelay);
  });
  socket.on("error", () => {}); // "close" fires right after and handles reconnect
}

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
        .then(u => (u ? { role: u.role || null, username: u.username || null, id: u.id ?? null } : null))
        .catch(() => null)`,
      true
    );
    if (token === lastKnownToken) {
      applyRole(user?.role ?? null);
      lastKnownUserId = user?.id ?? null;
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
        connectNotificationSocket(token);
      } else {
        applyRole(null);
        lastKnownUserId = null;
        closeNotificationSocket();
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
  mainWindow.on("focus", () => {
    mainWindow.webContents.send("window-focus", true);
    clearUnread();
  });
  mainWindow.on("blur", () => mainWindow.webContents.send("window-focus", false));

  mainWindow.once("ready-to-show", () => {
    layoutContentView();
    mainWindow.show();
  });

  // Minimize to tray instead of quitting - the whole point of the tray icon
  // is that the producer stays reachable for client messages without the
  // app cluttering the taskbar. Only the tray's "Izađi" (or a real OS quit)
  // actually exits; see isQuitting.
  mainWindow.on("close", (event) => {
    if (isQuitting) return;
    event.preventDefault();
    mainWindow.hide();
  });

  activeTabPoll = setInterval(pollPageState, 700);

  mainWindow.on("closed", () => {
    clearInterval(activeTabPoll);
    closeNotificationSocket();
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

ipcMain.on("shell:goto", (_event, tabValue) => gotoTab(tabValue));

ipcMain.on("shell:home", () => {
  atHome = true;
  layoutContentView();
});

Menu.setApplicationMenu(null);
// Matches the NSIS installer's appId (package.json build.appId) - groups this
// app under its own identity in the Windows taskbar/notifications/jump lists
// instead of falling back to Electron's default "electron.app.Electron".
app.setAppUserModelId("com.studioleflow.admin");
app.whenReady().then(() => {
  createWindow();
  createTray();
});

app.on("before-quit", () => {
  isQuitting = true;
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
  else showAndFocusWindow();
});
