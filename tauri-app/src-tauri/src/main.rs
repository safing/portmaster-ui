// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
mod common;

use common::service_manager::*;

use tauri::{
    menu::{MenuBuilder, MenuItemBuilder, MenuItemKind, CheckMenuItem, CheckMenuItemBuilder, PredefinedMenuItem},
    tray::{ClickType, TrayIconBuilder},
    AppHandle, Manager, RunEvent, Window, WindowEvent, Icon,
};
use tauri_plugin_cli::CliExt;
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_notification::{NotificationExt, ActionType};

#[macro_use]
extern crate lazy_static;

#[derive(Clone, serde::Serialize)]
struct Payload {
    args: Vec<String>,
    cwd: String,
}

#[derive(Clone, serde::Serialize, serde::Deserialize)]
struct Error {
    error: String,
}

#[tauri::command]
fn get_app_info(
    window: Window,
    response_id: String,
    matching_path: String,
    exec_path: String,
    pid: i64,
    cmdline: String,
) -> std::result::Result<String, String> {
    let mut id = response_id;

    let info = common::xdg_desktop::ProcessInfo {
        cmdline,
        exec_path,
        pid,
        matching_path,
    };

    if id == "" {
        id = uuid::Uuid::new_v4().to_string().to_string();
    }
    let cloned = id.clone();

    std::thread::spawn(move || match common::xdg_desktop::get_app_info(info) {
        Ok(info) => window.emit(&id, info),
        Err(err) => window.emit(
            &id,
            Error {
                error: err.to_string(),
            },
        ),
    });

    Ok(cloned)
}

fn open_or_create_window(app: &AppHandle) -> Result<()> {
    if let Some(window) = app.get_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    } else {
        let _ = tauri::WindowBuilder::new(app, "main", tauri::WindowUrl::App("index.html".into()))
            .build()?;
    }

    Ok(())
}

fn setup_tray_menu(app: &mut tauri::App) -> core::result::Result<(), Box<dyn std::error::Error>> {
    // Tray menu
    let close_btn = MenuItemBuilder::with_id("close", "Exit")
      .build(app);
    let open_btn = MenuItemBuilder::with_id("open", "Open").build(app);

    let spn = CheckMenuItemBuilder::with_id("spn", "SPN").build(app);


    let menu = MenuBuilder::new(app)
        .items(&[&spn,
          &PredefinedMenuItem::separator(app),
          &open_btn,
          &close_btn
        ])
        .build()?;

    TrayIconBuilder::new()
        .icon(Icon::Raw(include_bytes!("../../../notifier/icons/icons/pm_light_512.ico").into()))
        .menu(&menu)
        .on_menu_event(move |app, event| {
            match event.id().as_ref() {
                "close" => {
                    println!("showing dialog");

                    let handle = app.clone();
                    app.dialog()
                      .message("This does not stop the Portmaster system service")
                      .title("Do you really want to quit the user interface")
                      .ok_button_label("Yes, exit")
                      .cancel_button_label("No")
                      .show(move |answer| {
                        if answer {
                          let _ = handle.emit("exit-requested", "");
                          handle.exit(0);
                        }
                      });
                }
                "open" => {
                    match open_or_create_window(app) {
                        Ok(_) => {}
                        Err(err) => {
                            eprintln!("Failed to open or create window: {:?}", err);
                        }
                    }
                }
                other => {
                  eprintln!("unknown menu event id: {}", other);
                }
            }
        })
        .on_tray_icon_event(|tray, event| { // not supported on linux
            if event.click_type == ClickType::Left {
                let _ = open_or_create_window(tray.app_handle());
            }
        })
        .build(app)?;

    Ok(())
}

fn main() {
    let systemd = SystemdServiceManager {};

    let output = systemd.status("portmaster.service");

    match output {
        Err(e) => panic!("Failed to execute systemctl: {e}"),
        Ok(StatusResult::NotFound) => {
            println!("Service not found");
        }
        Ok(StatusResult::Running) => println!("Service running"),
        Ok(StatusResult::Stopped) => println!("Service stopped"),
        Ok(StatusResult::Unsupported) => println!("Unsupported system service manager"),
    }

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
        .invoke_handler(tauri::generate_handler![get_app_info])
        // Setup the app an any listeners
        .setup(|app| {
            setup_tray_menu(app)?;

            // Setup the single-instance event listener that will create/focus the main window
            // incase the tauri app would have been started again.
            let handle = app.handle().clone();
            app.listen_global("single-instance", move |_event| {
                match handle.get_window("main") {
                    Some(window) => {
                        let _ = window.unminimize();
                        let _ = window.show();
                        let _ = window.set_focus();
                    }

                    None => {
                        let _ = open_or_create_window(&handle);
                    }
                }
            });

            let mut background = false;

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
                }
                Err(_) => {}
            };

            if !background {
                open_or_create_window(&app.handle().clone())?;

                #[cfg(debug_assertions)]
                app.get_window("main").unwrap().open_devtools();
            } else {
              let _ = app.notification()
                .builder()
                .action_type_id("test")
                .body("Portmaster User Interface is running in the background")
                .icon("portmaster")
                .show();
            }

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
        }
        RunEvent::ExitRequested { api, .. } => {
            api.prevent_exit();
        }
        _ => {}
    })
}
