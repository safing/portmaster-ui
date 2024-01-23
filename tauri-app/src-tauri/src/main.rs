// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod common;
mod portapi;

use common::service_manager::*;

use portapi::client::PortAPI;
use serde_json::json;
use tauri::{
    menu::{CheckMenuItemBuilder, MenuBuilder, MenuItemBuilder, PredefinedMenuItem},
    tray::{ClickType, TrayIconBuilder},
    AppHandle, Icon, Manager, RunEvent, Window, WindowEvent,
};
use tauri_plugin_cli::CliExt;
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_notification::NotificationExt;

use crate::portapi::message::*;
use crate::portapi::types::*;

use std::sync::{Arc, atomic::{AtomicBool, Ordering}};

lazy_static! {
    static ref PM_REACHABLE: Arc<AtomicBool> = Arc::new(AtomicBool::new(false));
}

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

fn open_or_create_window(app: &AppHandle) -> Result<Window> {
    let window = if let Some(window) = app.get_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();

        window
    } else {
        let mut res = tauri::WindowBuilder::new(app, "main", tauri::WindowUrl::App("index.html".into()))
            .build()?;

        // Immediately navigate to the Portmaster UI if we're connected.
        if PM_REACHABLE.load(Ordering::Relaxed) {
            res.navigate("http://127.0.0.1:817".parse::<url::Url>().unwrap());
        }

        res
    };

    Ok(window)
}

fn setup_tray_menu(app: &mut tauri::App) -> core::result::Result<(), Box<dyn std::error::Error>> {
    // Tray menu
    let close_btn = MenuItemBuilder::with_id("close", "Exit").build(app);
    let open_btn = MenuItemBuilder::with_id("open", "Open").build(app);

    let spn = CheckMenuItemBuilder::with_id("spn", "SPN").build(app);

    let menu = MenuBuilder::new(app)
        .items(&[
            &spn,
            &PredefinedMenuItem::separator(app),
            &open_btn,
            &close_btn,
        ])
        .build()?;

    TrayIconBuilder::new()
        .icon(Icon::Raw(
            include_bytes!("../../../notifier/icons/icons/pm_light_512.ico").into(),
        ))
        .menu(&menu)
        .on_menu_event(move |app, event| match event.id().as_ref() {
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
            "open" => match open_or_create_window(app) {
                Ok(_) => {}
                Err(err) => {
                    eprintln!("Failed to open or create window: {:?}", err);
                }
            },
            other => {
                eprintln!("unknown menu event id: {}", other);
            }
        })
        .on_tray_icon_event(|tray, event| {
            // not supported on linux
            if event.click_type == ClickType::Left {
                let _ = open_or_create_window(tray.app_handle());
            }
        })
        .build(app)?;

    Ok(())
}

async fn notification_handler(cli: PortAPI) {
    let res = cli
        .request(portapi::types::Request::QuerySubscribe(
            "query notifications:".to_string(),
        ))
        .await;

    if let Ok(mut rx) = res {
        while let Some(msg) = rx.recv().await {
            let res = match msg {
                Response::Ok(key, payload) => Some((key, payload)),
                Response::New(key, payload) => Some((key, payload)),
                Response::Update(key, payload) => Some((key, payload)),
                _ => None,
            };

            if let Some((key, payload)) = res {
                match payload.parse::<portapi::notification::Notification>() {
                    Ok(n) => {
                        // Skip if this one should not be shown using the system notifications
                        if !n.show_on_system {
                            return;
                        }

                        // Skip if this action has already been acted on
                        if n.selected_action_id != "" {
                            return;
                        }

                        // TODO(ppacher): keep a reference of open notifications and close them
                        // if the user reacted inside the UI:

                        let mut notif = notify_rust::Notification::new();
                        notif.body(&n.message);
                        notif.timeout(notify_rust::Timeout::Never); // TODO(ppacher): use n.expires to calculate the timeout.
                        notif.summary(&n.title);
                        notif.icon("portmaster");

                        for action in n.actions {
                            notif.action(&action.id, &action.text);
                        }

                        let cli_clone = cli.clone();
                        tauri::async_runtime::spawn(async move {
                            let res = notif.show();
                            match res {
                                Ok(handle) => {
                                    handle.wait_for_action(|action| {
                                        match action {
                                            "__closed" => {
                                                // timeout
                                            }

                                            value => {
                                                let value = value.to_string().clone();

                                                tauri::async_runtime::spawn(async move {
                                                    let _ = cli_clone
                                                        .request(Request::Update(
                                                            key,
                                                            portapi::message::Payload::JSON(
                                                                json!({
                                                                    "SelectedActionID": value
                                                                })
                                                                .to_string(),
                                                            ),
                                                        ))
                                                        .await;
                                                });
                                            }
                                        }
                                    })
                                }
                                Err(err) => {
                                    eprintln!("failed to display notification: {}", err);
                                }
                            }
                        });
                    }
                    Err(err) => match err {
                        ParseError::JSON(err) => {
                            eprintln!("failed to parse notification: {}", err);
                        }
                        _ => {
                            eprintln!("unknown error when parsing notifications payload");
                        }
                    },
                }
            }
        }
    }
}

fn start_websocket_thread(app: &tauri::AppHandle, handle_notifications: bool) {
    let app = app.clone();

    tauri::async_runtime::spawn(async move {
        loop {
            #[cfg(debug_assertions)]
            println!("Trying to connect to websocket endpoint");

            let api = portapi::client::connect("ws://127.0.0.1:817/api/database/v1").await;

            match api {
                Ok(cli) => {
                    eprintln!("Successfully connected to portmaster");
                    PM_REACHABLE.store(true, Ordering::Relaxed);

                    let _ = app.emit("portapi::connected", "");

                    // Start the notification handle if desired
                    if handle_notifications {
                        let cli = cli.clone();
                        tauri::async_runtime::spawn(async move {
                            notification_handler(cli).await;
                        });
                    }

                    while !cli.is_closed() {
                        let _ = tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
                    }

                    PM_REACHABLE.store(false, Ordering::Relaxed);

                    eprintln!("lost connection to portmaster, retrying ....")
                }
                Err(err) => {
                    eprintln!("failed to create portapi client: {}", err);

                    // sleep and retry
                    tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
                }
            }
        }
    });
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
                let _ = open_or_create_window(&handle);
            });

            // Load the UI from portmaster if portapi::connected event is emitted
            // and we're not yet on the correct page.
            // Note that we do not create the window here if it does not exist (i.e. we're minimized to tray.)
            let handle = app.handle().clone();
            app.listen_global("portapi::connected", move |_event| {
                if let Some(mut window) = handle.get_window("main") {
                    if !(window.url().host_str() == Some("127.0.0.1") && window.url().port() == Some(817)) {
                        window.navigate("http://127.0.0.1:817".parse::<url::Url>().unwrap());
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
