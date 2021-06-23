import { app, BrowserWindow, nativeTheme } from "electron";
import * as windowStateKeeper from "electron-window-state";
import * as path from "path";
import * as fs from "fs";
import { dataDirectory } from "./datadir";
import { WebUILoader } from "./loader";
import { startNotifier } from "./notifier";
import { AppAPI } from "./api";
import { serveIPC } from "./ipc";

// Define mainWindow.
let mainWindow: BrowserWindow = null;

// Save system theme.
let systemDarkMode = nativeTheme.shouldUseDarkColors;

// Override the system theme to dark, as we currently only support dark mode.
// This will change: (source: https://www.electronjs.org/docs/api/native-theme)
// 1) nativeTheme.shouldUseDarkColors will be true when accessed
// 2) Any UI Electron renders on Linux and Windows including context menus, devtools, etc. will use the dark UI.
// 4) The prefers-color-scheme CSS query will match dark mode.
nativeTheme.themeSource = "dark";

function createWindow() {
  // Load the previous windows state with fallback to defaults.
  let mainWindowState = windowStateKeeper({
    defaultWidth: 1500,
    defaultHeight: 800,
    path: getStateDir(),
    file: "app-window-state.json"
  });

  // Create the browser window.
  mainWindow = new BrowserWindow({
    x: mainWindowState.x,
    y: mainWindowState.y,
    backgroundColor: '#121213',
    width: mainWindowState.width,
    height: mainWindowState.height,
    // minWidth: 1100,
    // minHeight: 600,
    resizable: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });
  mainWindow.setMenuBarVisibility(false);

  // Switch to dark icon in light theme.
  // if (!systemDarkMode) {
  //   mainWindow.setIcon(path.join(__dirname, "icon_dark.ico"));
  // }

  // Let us register listeners on the window, so we can update the state
  // automatically (the listeners will be removed when the window is closed)
  // and restore the maximized or full screen state.
  mainWindowState.manage(mainWindow);

  let loader = new WebUILoader(mainWindow);
  let appAPI = new AppAPI(mainWindow, loader)

  serveIPC(loader, appAPI);

  loader.loadUI();

  // Register shortcuts.
  mainWindow.webContents.on('before-input-event', (event, input) => {
    switch (input.key) {
      case "F5":
        loader.loadUI();
        event.preventDefault();
        break;
      case "F10":
        // Toggle Menu Bar.
        mainWindow.setMenuBarVisibility(!mainWindow.isMenuBarVisible());
        event.preventDefault();
        break;
      case "F12":
        // Open DevTools.
        mainWindow.webContents.openDevTools();
        event.preventDefault();
        break;
    }
  });
}

function getStateDir(): string {
  // Add "exec" dir to data dir.
  let stateDir = path.join(dataDirectory, "exec");

  // Don't return a dir that does not exist.
  if (!fs.existsSync(stateDir)) {
    return "";
  }

  return stateDir;
}

async function main() {
  console.log(`Portmaster data directory: ${dataDirectory}`);

  // we ensure the notifier is running even though we might quit
  // immediately because another instance of the app is already
  // running. This ensures the user can restart the notifier 
  // after it has been stopped by just trying to start the UI.
  // The notifier has a pid-lock file in the exec directory
  // so we don't need to care about multiple instances here.
  try {
    await startNotifier()
  } catch (err) {
    console.error(err);
  }

  // Acquire single instance lock and immediately quit if not acquired.
  if (!app.requestSingleInstanceLock()) {
    app.quit();
    return;
  }

  // Focus main window if another instance wanted to start.
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    if (!mainWindow) {
      return;
    }

    // Restore window if minimized.
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }

    // Focus window.
    mainWindow.focus();
  })

  // This method will be called when Electron has finished
  // initialization and is ready to create browser windows.
  // Some APIs can only be used after this event occurs.
  app.on("ready", () => {
    createWindow();

    app.on("activate", function () {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  // Quit when all windows are closed, except on macOS. There, it's common
  // for applications and their menu bar to stay active until the user quits
  // explicitly with Cmd + Q.
  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });
}

main()
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
