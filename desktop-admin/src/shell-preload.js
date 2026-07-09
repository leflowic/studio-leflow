const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("shell", {
  minimize: () => ipcRenderer.send("titlebar:minimize"),
  maximize: () => ipcRenderer.send("titlebar:maximize"),
  close: () => ipcRenderer.send("titlebar:close"),
  goto: (tabValue) => ipcRenderer.send("shell:goto", tabValue),
  home: () => ipcRenderer.send("shell:home"),
  onRoleState: (callback) => {
    ipcRenderer.on("role-state", (_event, role) => callback(role));
  },
  onUserState: (callback) => {
    ipcRenderer.on("user-state", (_event, username) => callback(username));
  },
  onActiveTab: (callback) => {
    ipcRenderer.on("active-tab", (_event, tab) => callback(tab));
  },
  onWindowState: (callback) => {
    ipcRenderer.on("window-state", (_event, isMaximized) => callback(isMaximized));
  },
  onWindowFocus: (callback) => {
    ipcRenderer.on("window-focus", (_event, isFocused) => callback(isFocused));
  },
});
