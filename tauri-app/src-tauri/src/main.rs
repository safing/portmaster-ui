// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
mod common;


use common::service_manager::*;

use tauri::http::response;
use tauri::{Manager, Window};
use tauri::async_runtime::{spawn};


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
fn get_app_info(window: Window, response_id: String, matching_path: String, exec_path: String, pid: i64, cmdline: String) -> std::result::Result<String, String> {
  let mut id = response_id;

  let info = common::xdg_desktop::ProcessInfo{
    cmdline,
    exec_path,
    pid,
    matching_path
  };

  if id == "" {
    id = uuid::Uuid::new_v4().to_string().to_string();
  }
  let cloned = id.clone();

  std::thread::spawn(move || {
    match common::xdg_desktop::get_app_info(info) {
      Ok(info) => {
        window.emit(&id, info)
      },
      Err(err) => {
        window.emit(&id, Error{
          error: err.to_string()
        })
      }
    }
  });

  Ok(cloned)
}

fn main() {
  let systemd = SystemdServiceManager{};

  let output = systemd.status("portmaster.service");

  match output {
    Err(e) => panic!("Failed to execute systemctl: {e}"),
    Ok(StatusResult::NotFound) => {println!("Service not found"); },
    Ok(StatusResult::Running) => println!("Service running"),
    Ok(StatusResult::Stopped) => println!("Service stopped"),
    Ok(StatusResult::Unsupported) => println!("Unsupported system service manager")
  }

  tauri::Builder::default()
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

            app.emit("single-instance", Payload { args: argv, cwd }).unwrap();
    }))

    // Custom Rust handlers
    .invoke_handler(tauri::generate_handler![get_app_info])

    .setup(|app| {
      #[cfg(debug_assertions)]
      {
        let window = app.get_window("main").unwrap();
        window.open_devtools();
      }

      Ok(())
    })
    .any_thread()
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
