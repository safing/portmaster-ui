use tauri::{AppHandle, Manager, Result, UserAttentionType, Window, WindowBuilder, WindowUrl};

use crate::portmaster::PortmasterExt;

/// Either returns the existing "main" window or creates a new one.
/// 
/// The window is not automatically shown (i.e it starts hidden).
/// If a new main window is created (i.e. the tauri app was minimized to system-tray)
/// then the window will be automatically navigated to the Portmaster UI endpoint
/// if ::websocket::is_portapi_reachable returns true.
/// 
/// Either the existing or the newly created window is returned.
pub fn create_main_window(app: &AppHandle) -> Result<Window> {
    let mut window = if let Some(window) = app.get_window("main") {
        window
    } else {
        let res = WindowBuilder::new(app, "main", WindowUrl::App("index.html".into()))
            .visible(false)
            .build()?;

        res
    };

    // If the window is not yet navigated to the Portmaster UI, do it now.
    may_navigate_to_ui(&mut window);

    Ok(window)
}

pub fn create_splash_window(app: &AppHandle) -> Result<Window> {
    let window = WindowBuilder::new(app, "splash", WindowUrl::App("index.html".into()))
        .always_on_top(true)
        .center()
        .closable(false)
        .decorations(false)
        .focused(true)
        .resizable(false)
        .visible(true)
        .title("Portmaster")
        .inner_size(600.0, 250.0)
        .build()?;

    let _ = window.request_user_attention(Some(UserAttentionType::Informational));

    Ok(window)
}

/// Opens a window for the tauri application.
///
/// If the main window has already been created, it is instructed to
/// show even if we're currently not connected to Portmaster.
/// This is safe since the main-window will only be created if Portmaster API
/// was reachable so the angular application must have finished bootstrapping.
///
/// If there's not main window and the Portmaster API is reachable we create a new
/// main window.
///
/// If the Portmaster API is unreachable and there's no main window yet, we show the
/// splash-screen window.
pub fn open_window(app: &AppHandle) {
    let window = app.get_window("main");
    if window != None {
        app.portmaster().show_window();
    } else {
        if app.portmaster().is_reachable() {
            app.portmaster().show_window();

            let _ = create_main_window(app);
        } else {
            let _ = create_splash_window(app);
        }
    }
}

/// If the Portmaster Websocket database API is reachable the window will be navigated
/// to the HTTP endpoint of Portmaster to load the UI from there.
/// 
/// Note that only happens if the window URL does not already point to the PM API.
/// 
/// In #[cfg(debug_assertions)] the TAURI_PM_URL environment variable will be used
/// if set.
/// Otherwise or in release builds, it will be navigated to http://127.0.0.1:817.
pub fn may_navigate_to_ui(win: &mut Window) {
    if !win.app_handle().portmaster().is_reachable() {
        return
    }

    if win.url().host_str() != Some("127.0.0.1") {

        #[cfg(debug_assertions)]
        if let Ok(target_url) = std::env::var("TAURI_PM_URL") {
            win.navigate(target_url.parse().unwrap());

            return;
        }

        win.navigate("http://127.0.0.1:817".parse::<url::Url>().unwrap());
    }
}