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
        #[cfg(debug_assertions)]
        eprintln!("[tauri] main window already created");

        window
    } else {
        #[cfg(debug_assertions)]
        eprintln!("[tauri] creating main window");

        let res = WindowBuilder::new(app, "main", WindowUrl::App("index.html".into()))
            .visible(false)
            .build();

        match res {
            Ok(win) => win,
            Err(err) => {
                eprintln!("[tauri] failed to create main window: {}", err.to_string());

                return Err(err);
            }
        }
    };

    // If the window is not yet navigated to the Portmaster UI, do it now.
    may_navigate_to_ui(&mut window, false);

    #[cfg(debug_assertions)]
    if let Ok(_) = std::env::var("TAURI_SHOW_IMMEDIATELY") {
        eprintln!("[tauri] TAURI_SHOW_IMMEDIATELY is set, opening window");

        if let Err(err) = window.show() {
            eprintln!("[tauri] failed to show window: {}", err.to_string());
        }
    }

    Ok(window)
}

pub fn create_splash_window(app: &AppHandle) -> Result<Window> {
    if let Some(window) = app.get_window("splash") {
        let _ = window.show();
        Ok(window)
    } else {
        let window = WindowBuilder::new(app, "splash", WindowUrl::App("index.html".into()))
            .center()
            .closable(false)
            .focused(true)
            .resizable(false)
            .visible(true)
            .title("Portmaster")
            .inner_size(600.0, 250.0)
            .build()?;

        let _ = window.request_user_attention(Some(UserAttentionType::Informational));

        Ok(window)
    }
}

pub fn close_splash_window(app: &AppHandle) -> Result<()> {
    if let Some(window) = app.get_window("splash") {
        return window.close();
    }
    return Err(tauri::Error::WindowNotFound);
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
pub fn open_window(app: &AppHandle) -> Result<Window> {
    if app.portmaster().is_reachable() {
        match app.get_window("main") {
            Some(win) => {
                app.portmaster().show_window();

                Ok(win)
            }
            None => {
                app.portmaster().show_window();

                create_main_window(app)
            }
        }
    } else {
        eprintln!("Show splash screen");
        create_splash_window(app)
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
pub fn may_navigate_to_ui(win: &mut Window, force: bool) {
    if !win.app_handle().portmaster().is_reachable() && !force {
        eprintln!("[tauri] portmaster API is not reachable, not navigating");

        return;
    }

    if force || cfg!(debug_assertions) || win.url().host_str() != Some("localhost") {
        #[cfg(debug_assertions)]
        if let Ok(target_url) = std::env::var("TAURI_PM_URL") {
            eprintln!("[tauri] navigating to {}", target_url);

            win.navigate(target_url.parse().unwrap());

            return;
        }

        #[cfg(debug_assertions)]
        {
            eprintln!("[tauri] navigating to http://localhost:4200");
            win.navigate("http://localhost:4200".parse().unwrap());
        }

        #[cfg(not(debug_assertions))]
        win.navigate("http://localhost:817".parse().unwrap());
    }
}
