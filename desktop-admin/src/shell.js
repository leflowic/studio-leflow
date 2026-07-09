// Mirrors ADMIN_NAV in client/src/pages/admin.tsx - keep the value/label/roles
// in sync with that file whenever the real admin panel's nav changes.
const ADMIN_NAV = [
  { group: "Pregled", items: [{ value: "dashboard", label: "Dashboard", icon: "dashboard" }] },
  {
    group: "Klijenti",
    items: [
      { value: "users", label: "Korisnici", icon: "users", roles: ["producer"] },
      { value: "messages", label: "Poruke", icon: "messages", roles: ["producer"] },
      { value: "katastar", label: "Katastar", icon: "archive", roles: ["producer"] },
      { value: "portal", label: "Portal", icon: "folder-open", roles: ["producer"] },
    ],
  },
  {
    group: "Sadržaj",
    items: [
      { value: "projects", label: "Projekti", icon: "music", roles: ["producer"] },
      { value: "comments", label: "Komentari", icon: "message-circle", roles: ["producer"] },
      { value: "user-songs", label: "Zajednica", icon: "radio", roles: ["producer"] },
      { value: "game", label: "Igra", icon: "gamepad", roles: ["producer"] },
      { value: "smart-links", label: "Smart Links", icon: "link", roles: ["producer", "marketing"] },
      { value: "news", label: "Vesti", icon: "newspaper", roles: ["editor", "marketing"] },
    ],
  },
  {
    group: "Posao",
    items: [
      { value: "jobs", label: "Radna tabla", icon: "kanban", roles: ["producer"] },
      { value: "contracts", label: "Licence", icon: "file-text", roles: ["producer"] },
      { value: "rights-protection", label: "Zaštita prava", icon: "shield-check", roles: ["producer"] },
      { value: "invoices", label: "Fakture", icon: "receipt", roles: ["producer"] },
      { value: "calendar", label: "Kalendar", icon: "calendar", roles: ["producer"] },
    ],
  },
  {
    group: "Marketing",
    items: [
      { value: "newsletter", label: "Newsletter", icon: "mail", roles: ["marketing"] },
      { value: "email", label: "Email", icon: "send", roles: ["marketing"] },
    ],
  },
  { group: "Sistem", items: [{ value: "settings", label: "Podešavanja", icon: "settings" }] },
];

const ICONS = {
  dashboard: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
  users: '<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>',
  messages: '<path d="M14 9a2 2 0 01-2 2H6l-4 4V4a2 2 0 012-2h8a2 2 0 012 2z"/><path d="M18 9h1a2 2 0 012 2v9l-4-3H9a2 2 0 01-2-2v-1"/>',
  archive: '<rect x="2" y="4" width="20" height="5" rx="1"/><path d="M4 9v9a2 2 0 002 2h12a2 2 0 002-2V9"/><path d="M10 13h4"/>',
  "folder-open": '<path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v1H6a2 2 0 00-2 1.7L2.5 17"/><path d="M2.5 17l1.6-6.4A2 2 0 016 9h13a2 2 0 011.9 2.6L19 19H4a2 2 0 01-1.5-2z"/>',
  music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  "message-circle": '<path d="M21 11.5a8.5 8.5 0 01-9.4 8.45c-1.13-.12-2.2-.44-3.15-.93L3 21l1.98-5.45A8.5 8.5 0 1121 11.5z"/>',
  radio: '<circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 010 8.49M7.76 16.24a6 6 0 010-8.49M19.07 4.93a10 10 0 010 14.14M4.93 19.07a10 10 0 010-14.14"/>',
  gamepad: '<line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/><circle cx="15" cy="13" r=".6"/><circle cx="18" cy="11" r=".6"/><path d="M17.32 5H6.68a4 4 0 00-3.98 3.6l-.7 7A4 4 0 006 20a3.5 3.5 0 003-1.5l1-1.5h4l1 1.5a3.5 3.5 0 003 1.5 4 4 0 004-4.4l-.7-7A4 4 0 0017.32 5z"/>',
  link: '<path d="M10 13a5 5 0 007.07 0l2.83-2.83a5 5 0 00-7.07-7.07L11.5 4.5"/><path d="M14 11a5 5 0 00-7.07 0L4.1 13.83a5 5 0 007.07 7.07l1.24-1.24"/>',
  newspaper: '<path d="M4 4h13a2 2 0 012 2v13a1 1 0 01-1.55.83L15 18H6a2 2 0 01-2-2z"/><path d="M18 4a2 2 0 012 2v11"/><path d="M8 8h5M8 12h5M8 16h3"/>',
  kanban: '<rect x="3" y="4" width="18" height="17" rx="2"/><line x1="9" y1="8" x2="9" y2="21"/><line x1="15" y1="8" x2="15" y2="14"/>',
  "file-text": '<path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h6"/>',
  "shield-check": '<path d="M12 2l8 3.5v6c0 5-3.4 8.7-8 10.5-4.6-1.8-8-5.5-8-10.5v-6z"/><path d="M9 12l2 2 4-4"/>',
  receipt: '<path d="M6 2h12v19l-2.5-1.5L13 21l-2.5-1.5L8 21l-2-1.5z"/><path d="M9 8h6M9 12h6"/>',
  calendar: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 6l10 7 10-7"/>',
  send: '<path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>',
};

function iconSvg(name) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ""}</svg>`;
}

function visibleNavForRole(role) {
  if (role === "admin") return ADMIN_NAV;
  return ADMIN_NAV
    .map((group) => ({ ...group, items: group.items.filter((item) => !item.roles || item.roles.includes(role)) }))
    .filter((group) => group.items.length > 0);
}

function findItem(value) {
  for (const group of ADMIN_NAV) {
    const item = group.items.find((i) => i.value === value);
    if (item) return item;
  }
  return null;
}

const CHEVRON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>';

let currentRole = null;
let atHome = true;

const launcherEl = document.getElementById("launcher");
const groupsEl = document.getElementById("launcher-groups");
const greetingTitle = document.getElementById("greeting-title");
const greetingAvatar = document.getElementById("greeting-avatar");
const searchInput = document.getElementById("search");
const homeBtn = document.getElementById("home");
const sectionCrumb = document.getElementById("section-crumb");
const sectionLabelEl = document.getElementById("section-label");

function renderLauncher() {
  groupsEl.innerHTML = "";
  for (const group of visibleNavForRole(currentRole)) {
    const groupEl = document.createElement("div");
    groupEl.className = "launcher-group";

    const label = document.createElement("div");
    label.className = "launcher-group-label";
    label.textContent = group.group;
    groupEl.appendChild(label);

    const list = document.createElement("div");
    list.className = "launcher-list";

    for (const item of group.items) {
      const tile = document.createElement("button");
      tile.className = "tile";
      tile.dataset.label = item.label.toLowerCase();
      tile.innerHTML = `<span class="tile-icon">${iconSvg(item.icon)}</span><span class="tile-label">${item.label}</span><span class="tile-chevron">${CHEVRON}</span>`;
      tile.onclick = () => openSection(item.value);
      list.appendChild(tile);
    }
    groupEl.appendChild(list);
    groupsEl.appendChild(groupEl);
  }
  applySearchFilter();
}

function applySearchFilter() {
  const q = searchInput.value.trim().toLowerCase();
  for (const groupEl of groupsEl.children) {
    let visibleCount = 0;
    for (const tile of groupEl.querySelectorAll(".tile")) {
      const match = !q || tile.dataset.label.includes(q);
      tile.classList.toggle("hidden", !match);
      if (match) visibleCount++;
    }
    groupEl.style.display = visibleCount ? "" : "none";
  }
}

searchInput.addEventListener("input", applySearchFilter);

function setSectionVisual(isHome, label) {
  atHome = isHome;
  launcherEl.style.display = isHome ? "flex" : "none";
  homeBtn.classList.toggle("active-section", !isHome);
  sectionCrumb.style.display = isHome ? "none" : "flex";
  if (!isHome) sectionLabelEl.textContent = label;
}

function openSection(value) {
  window.__currentTab = value;
  setSectionVisual(false, findItem(value)?.label ?? "");
  window.shell.goto(value);
}

homeBtn.onclick = () => {
  setSectionVisual(true);
  window.shell.home();
};

renderLauncher();
setSectionVisual(true);

window.shell.onRoleState((role) => {
  const wasLoggedOut = !currentRole;
  currentRole = role;
  renderLauncher();
  if (role && wasLoggedOut) setSectionVisual(true);
});

window.shell.onUserState((username) => {
  greetingTitle.textContent = username ? `Zdravo, ${username}` : "Zdravo";
  greetingAvatar.textContent = username ? username.charAt(0).toUpperCase() : "L";
});

window.shell.onActiveTab((tab) => {
  if (tab) {
    window.__currentTab = tab;
    if (!atHome) {
      const item = findItem(tab);
      if (item) sectionLabelEl.textContent = item.label;
    }
  }
});

document.getElementById("minimize").onclick = () => window.shell.minimize();
document.getElementById("maximize").onclick = () => window.shell.maximize();
document.getElementById("close").onclick = () => window.shell.close();

// Double-click the drag region to maximize/restore, like every native
// Windows app titlebar - the topbar is otherwise just a drag handle.
document.getElementById("topbar").addEventListener("dblclick", (e) => {
  if (e.target.closest("button")) return;
  window.shell.maximize();
});

const maximizeBtn = document.getElementById("maximize");
const RESTORE_ICON = '<svg viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="1.5" width="5.5" height="5.5" rx="0.8"/><path d="M1.5 3.5v4a1 1 0 001 1h4"/></svg>';
const MAXIMIZE_ICON = maximizeBtn.innerHTML;
window.shell.onWindowState((isMaximized) => {
  maximizeBtn.innerHTML = isMaximized ? RESTORE_ICON : MAXIMIZE_ICON;
  maximizeBtn.title = isMaximized ? "Vrati" : "Maksimizuj";
});

window.shell.onWindowFocus((isFocused) => {
  document.body.classList.toggle("is-blurred", !isFocused);
});
