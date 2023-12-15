// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
mod common;

use std::fs;

use common::icons::*;
use common::service_manager::*;

use dataurl::DataUrl;
use tauri::Manager;

#[derive(Clone, serde::Serialize)]
struct Payload {
  args: Vec<String>,
  cwd: String,
}

#[tauri::command]
fn get_app_icon_path(executable: String) -> std::result::Result<String, String> {
    match find_icon(executable.as_str()) {
      Ok(res) => Ok(res.icon_name),
      Err(err) => Err(err.to_string())
    }
}

#[tauri::command]
fn get_app_icon_blob(executable: String) -> std::result::Result<String, String> {
    match find_icon(executable.as_str()) {
      Ok(res) => {
        if !res.icon_data.is_empty() {
            println!("icon data already attached");

            let mut du = DataUrl::new();

            du.set_media_type(Some("image/png".to_string()));
            du.set_data(&res.icon_data);

            return Ok(du.to_string())
        }

          println!("icon data not attached, reading from file");

        match fs::read(res.icon_name.as_str()) {
          Ok(data) => {
            let mut du = DataUrl::new();

            du.set_media_type(Some("image/png".to_string()));
            du.set_data(&data);

            Ok(du.to_string())
          },
          Err(err) => {
            Err(err.to_string())
          }
        }
      },
      Err(err) => Err(err.to_string())
    }
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
    .invoke_handler(tauri::generate_handler![get_app_icon_path])
    .invoke_handler(tauri::generate_handler![get_app_icon_blob])

    .setup(|app| {
      #[cfg(debug_assertions)]
      {
        let window = app.get_window("main").unwrap();
        window.open_devtools();
      }

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
