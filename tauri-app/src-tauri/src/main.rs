// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{
    Manager, RunEvent, WindowEvent,
};
use tauri_plugin_cli::CliExt;
use tauri_plugin_notification::NotificationExt;

// Library crates
mod service;
mod portapi;
mod xdg;

// App modules
mod notifications;
mod traymenu;
mod window;
mod websocket;
mod handlers;

use service::manager::*;
use traymenu::setup_tray_menu;
use window::open_or_create_window;
use websocket::start_websocket_thread;
use handlers::{
    get_app_info,
    get_service_manager_status
};


#[macro_use]
extern crate lazy_static;

#[derive(Clone, serde::Serialize)]
struct Payload {
    args: Vec<String>,
    cwd: String,
}


fn main() {
    let app = tauri::Builder::default()
        // Shell plugin for open_external support
        .plugin(tauri_plugin_shell::init())
        // Clipboard support
        .plugin(tauri_plugin_clipboard_manager::init())
        // Dialog (Save/Open) support
        .plugin(tauri_plugin_dialog::init())
        // OS Version and Architecture support
        .plugin(tauri_plugin_os::init())
        // Single instance guard
        .plugin(tauri_plugin_single_instance::init(|app, argv, cwd| {
            println!("{}, {argv:?}, {cwd}", app.package_info().name);

            app.emit("single-instance", Payload { args: argv, cwd })
                .unwrap();
        }))
        // Custom CLI arguments
        .plugin(tauri_plugin_cli::init())
        // Notification support
        .plugin(tauri_plugin_notification::init())
        // Custom Rust handlers
        .invoke_handler(tauri::generate_handler![
            get_app_info,
            get_service_manager_status,
        ])
        // Setup the app an any listeners
        .setup(|app| {
            setup_tray_menu(app)?;

            // Setup the single-instance event listener that will create/focus the main window
            // incase the tauri app would have been started again.
            let handle = app.handle().clone();
            app.listen_global("single-instance", move |_event| {
                let _ = open_or_create_window(&handle);
            });

            // Load the UI from portmaster if portapi::connected event is emitted
            // and we're not yet on the correct page.
            // Note that we do not create the window here if it does not exist (i.e. we're minimized to tray.)
            let handle = app.handle().clone();
            app.listen_global(websocket::PORTAPI_STATUS_EVENT, move |event| {
                if event.payload() == "connected" {
                    if let Some(mut window) = handle.get_window("main") {
                        crate::window::may_navigate_to_ui(&mut window)
                    }
                }
            });

            let mut background = false;
            let mut handle_notifications = false;

            match app.cli().matches() {
                Ok(matches) => {
                    println!("{:?}", matches);

                    if let Some(bg_flag) = matches.args.get("background") {
                        match bg_flag.value.as_bool() {
                            Some(value) => {
                                background = value;
                            }
                            None => {}
                        }
                    }

                    if let Some(nf_flag) = matches.args.get("with-notifications") {
                        match nf_flag.value.as_bool() {
                            Some(v) => {
                                handle_notifications = v;
                            }
                            None => {}
                        }
                    }
                }
                Err(_) => {}
            };

            if !background {
                open_or_create_window(&app.handle().clone())?;

                #[cfg(debug_assertions)]
                app.get_window("main").unwrap().open_devtools();
            } else {
                let _ = app
                    .notification()
                    .builder()
                    .body("Portmaster User Interface is running in the background")
                    .icon("portmaster")
                    .show();
            }

            start_websocket_thread(app.handle(), handle_notifications);

            Ok(())
        })
        .any_thread()
        .build(tauri::generate_context!())
        .expect("error while running tauri application");

    app.run(|handle, e| match e {
        RunEvent::WindowEvent { label, event, .. } => {
            if label != "main" {
                // We only have one window at most so any other label is unexpected
                return;
            }

            // Do not let the user close the window, instead send an event to the main
            // window so we can show the "will not stop portmaster" dialog and let the window
            // close itself using
            //
            //    window.__TAURI__.window.getCurrent().close()
            //
            // Note: the above javascript does NOT trigger the CloseRequested event so
            // there's no need to handle that case here.
            //
            match event {
                WindowEvent::CloseRequested { api, .. } => {
                    api.prevent_close();
                    if let Some(window) = handle.get_window(label.as_str()) {
                        let _ = window.emit("exit-requested", "");
                    }
                }
                _ => {}
            }
        },

        RunEvent::ExitRequested { api, .. } => {
            api.prevent_exit();
        }
        _ => {}
    });
}
