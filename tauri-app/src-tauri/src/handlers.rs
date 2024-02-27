use tauri::{Manager, Window};
use crate::{xdg, ServiceManager};
use crate::service::get_service_manager;

#[derive(Clone, serde::Serialize, serde::Deserialize)]
pub struct Error {
    pub error: String,
}

#[tauri::command]
pub fn get_app_info(
    window: Window,
    response_id: String,
    matching_path: String,
    exec_path: String,
    pid: i64,
    cmdline: String,
) -> std::result::Result<String, String> {
    let mut id = response_id;

    let info = xdg::ProcessInfo {
        cmdline,
        exec_path,
        pid,
        matching_path,
    };

    if id == "" {
        id = uuid::Uuid::new_v4().to_string()
    }
    let cloned = id.clone();

    std::thread::spawn(move || match xdg::get_app_info(info) {
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

#[tauri::command]
pub fn get_service_manager_status(
    window: Window,
    response_id: String,
) -> std::result::Result<String, String> {
    let mut id = response_id;

    if id == "" {
        id = uuid::Uuid::new_v4().to_string();
    }
    let cloned = id.clone();

    std::thread::spawn(move || {
        let result = match get_service_manager() {
            Ok(sm) => {
                sm.status()
                    .map_err(|err| err.to_string())
            },
            Err(err) => {
                Err(err.to_string())
            }
        };

        match result {
            Ok(result) => window.emit(&id, &result),
            Err(err) => window.emit(&id, Error{ error: err })
        }
    });

    Ok(cloned)
}

#[tauri::command]
pub fn start_service(
    window: Window,
    response_id: String
) -> std::result::Result<String, String> {
    let mut id = response_id;

    if id == "" {
        id = uuid::Uuid::new_v4().to_string();
    }
    let cloned = id.clone();

    std::thread::spawn(move || {
        let result = match get_service_manager() {
            Ok(sm) => {
                sm.start()
                    .map_err(|err| err.to_string())
            },
            Err(err) => {
                Err(err.to_string())
            }
        };

        match result {
            Ok(result) => window.emit(&id, &result),
            Err(err) => window.emit(&id, Error{ error: err })
        }
    });

    Ok(cloned)
}