import { app, BrowserWindow, nativeTheme } from "electron";
import * as windowStateKeeper from "electron-window-state";
import * as path from "path";
import * as fs from "fs";

// Set native theme to dark. This may do something, eventually.
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
  const mainWindow = new BrowserWindow({
    x: mainWindowState.x,
    y: mainWindowState.y,
    width: mainWindowState.width,
    height: mainWindowState.height,
    resizable: true,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // Let us register listeners on the window, so we can update the state
  // automatically (the listeners will be removed when the window is closed)
  // and restore the maximized or full screen state.
  mainWindowState.manage(mainWindow);

  // Load UI from Portmaster.
  mainWindow.loadURL("http://127.0.0.1:817/");

  // Open the DevTools.
  // mainWindow.webContents.openDevTools();
}

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

function getStateDir(): string {
  // Return if data argument is not given.
  if (!app.commandLine.hasSwitch("data")) {
    return ""
  }

  // Get data dir from command line.
  let dataDir = app.commandLine.getSwitchValue("data");

  // If dataDir is empty, the argument might have be supplied without `=`.
  if (dataDir === "") {
    dataDir = process.argv[process.argv.indexOf("--data")+1]
  }

  // Return if undefined or empty.
  if (!dataDir || dataDir === "") {
    return ""
  }

  // Add "exec" dir.
  let stateDir = path.join(dataDir, "exec");

  // Don't return a dir that does not exist.
  if (!fs.existsSync(stateDir)) {
    return ""
  }

  return stateDir
}
