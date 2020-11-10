// All of the Node.js APIs are available in the preload process.

import { remote, shell } from "electron";
import { platform } from "os";
import { resolve } from "path";

// It has the same sandbox as a Chrome extension.
window.addEventListener("DOMContentLoaded", () => {
  const replaceText = (selector: string, text: string) => {
    const element = document.getElementById(selector);
    if (element) {
      element.innerText = text;
    }
  };

  for (const type of ["chrome", "node", "electron"]) {
    replaceText(`${type}-version`, process.versions[type as keyof NodeJS.ProcessVersions]);
  }
});

let win = window as any;
win.openExternal = shell.openExternal;
win.argv = remote.process.argv;
win.platform = platform;
win.dataDir = remote.app.commandLine.getSwitchValue("data");

win.fileUrl = (str: string) => {
  if (typeof str !== 'string') {
    throw new Error('Expected a string');
  }

  var pathName = resolve(str).replace(/\\/g, '/');

  // Windows drive letter must be prefixed with a slash
  if (pathName[0] !== '/') {
    pathName = '/' + pathName;
  }

  return encodeURI('file://' + pathName);
};

win.getFileIcon = async (path: string) => {
  try {
    const icon = await remote.app.getFileIcon(path);
    return icon.toDataURL();
  } catch (e) {
    console.error(e);
    return "";
  }
}
