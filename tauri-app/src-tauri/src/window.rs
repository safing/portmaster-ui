use tauri::{AppHandle, Window, WindowBuilder, WindowUrl, Result, Manager};

use crate::websocket::is_portapi_reachable;

/// Either returns the existing "main" window or creates a new one.
/// 
/// In both cases, the window is shown, unminimized and focused.
/// If a new main window is created (i.e. the tauri app is minimized to system-tray)
/// then the window will be automatically navigated to the Portmaster UI endpoint
/// if ::websocket::is_portapi_reachable returns true.
/// 
/// Either the existing or the newly created window is returned.
pub fn open_or_create_window(app: &AppHandle) -> Result<Window> {
    let window = if let Some(window) = app.get_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();

        window
    } else {
        let mut res = WindowBuilder::new(app, "main", WindowUrl::App("index.html".into()))
            .build()?;

        may_navigate_to_ui(&mut res);

        res
    };

    Ok(window)
}

/// If the Portmaster Websocket database API is reachable the window will be navigated
/// to the HTTP endpoint of Portmaster to load the UI from there.
/// 
/// Note that only happens if the window URL does not already point to the PM API.
/// 
/// In #[cfg(debug_assertions)] the window will be navigated to http://127.0.0.1:4200
/// while in release builds, it will be navigated to http://127.0.0.1:817.
pub fn may_navigate_to_ui(win: &mut Window) {
    if !is_portapi_reachable() {
        return
    }

    #[cfg(debug_assertions)]
    if !(win.url().host_str() == Some("127.0.0.1") && win.url().port() == Some(4200)) {
        win.navigate("http://127.0.0.1:4200".parse::<url::Url>().unwrap());
    }

    #[cfg(not(debug_assertions))]
    if !(win.url().host_str() == Some("127.0.0.1") && win.url().port() == Some(817)) {
        win.navigate("http://127.0.0.1:817".parse::<url::Url>().unwrap());
    }
}