import { AppAPI } from "./api";

// All of the Node.js APIs are available in the preload process.
window.addEventListener("DOMContentLoaded", () => {

});

let api: AppAPI | null = null;

// Lazily inject the our app API into the window object.
Object.defineProperty(window, 'app', {
  configurable: false,
  get: () => {
    if (!!api) {
      return api;
    }

    api = new AppAPI();
    return api;
  }
});
