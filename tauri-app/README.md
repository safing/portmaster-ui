# Tauri based Desktop Application

This directory contains a Desktop Application for Portmaster that is based on
Tauri and Rust instead of using Electron with a JS backend.  
This has the advantage that the memory footprint and CPU usage is much lower
than in the electron based application.

## Features

While the tauri Desktop app provides the same features as the electron version,
there are a couple of things it provides in addition / that are different:

- Supports showing Desktop Notifications (i.e. to replace the Notifier app)
- Supports showing Connection Prompts (i.e. to replace the Notifier app and provide better UX)
- Keeps the angular application alive even if the window is hidden. This allows for much more
  features to be implemented in the future because the Angular App can create new windows (like
  for the prompt feature above).
- Supports a tray-icon and actions like "toggle SPN" (ie. to replace the Notifier app).
- Supports a better splash-screen when the Portmaster system service isn't running.

## Project Layout:

The tauri application consists of the following modules:

- `portapi/`: A rust implementation of the websocket database API exposed by
  Portmaster. While the API is fully implemented not all database models are defined yet.
- `portmaster/`: A custom Tauri plugin that manages communication with our
  Angular application.
- `service/`: Code for working with the system service manager in order to get
             the status and manage the Portmaster system service. Currently only
             **systemd** is supported.
- `xdg/`: Code for finding and converting application icons based on the
         Free-Desktop XDG Desktop and Icon- Theme specifications.
- `main.rs`: The main entrypoint file that configures and runs the tauri application.
- `window.rs`: Utility methods for managing the main and splash-screen windows.