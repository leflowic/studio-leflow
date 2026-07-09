// electron's own installer uses extract-zip (yauzl), which silently fails to
// unzip the Electron binary on some Node versions - it hangs on the first
// zip entry and the process exits without writing anything or throwing.
// If that happened, re-extract the already-downloaded zip with PowerShell's
// built-in Expand-Archive instead, which is reliable on Windows.
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const electronDir = path.join(__dirname, "..", "node_modules", "electron");
const distDir = path.join(electronDir, "dist");
const exePath = path.join(distDir, "electron.exe");

if (process.platform !== "win32" || fs.existsSync(exePath)) {
  process.exit(0);
}

const { version } = require(path.join(electronDir, "package.json"));
const cacheRoot = path.join(
  process.env.LOCALAPPDATA || path.join(require("os").homedir(), "AppData", "Local"),
  "electron",
  "Cache"
);

function findCachedZip() {
  if (!fs.existsSync(cacheRoot)) return null;
  for (const hashDir of fs.readdirSync(cacheRoot)) {
    const full = path.join(cacheRoot, hashDir, `electron-v${version}-win32-x64.zip`);
    if (fs.existsSync(full)) return full;
  }
  return null;
}

const zip = findCachedZip();
if (!zip) {
  console.warn("[fix-electron] No cached Electron zip found - run `npm start` once to trigger the download, then re-run install if it still fails.");
  process.exit(0);
}

console.log("[fix-electron] extract-zip left node_modules/electron/dist incomplete - re-extracting with Expand-Archive...");
fs.rmSync(distDir, { recursive: true, force: true });
fs.mkdirSync(distDir, { recursive: true });

execFileSync("powershell", [
  "-NoProfile",
  "-Command",
  `Expand-Archive -Path '${zip}' -DestinationPath '${distDir}' -Force`,
]);

fs.writeFileSync(path.join(distDir, "version"), `v${version}`);
fs.writeFileSync(path.join(electronDir, "path.txt"), "electron.exe");

if (fs.existsSync(exePath)) {
  console.log("[fix-electron] done - electron.exe restored.");
} else {
  console.warn("[fix-electron] extraction ran but electron.exe still missing - check the zip contents manually.");
}
