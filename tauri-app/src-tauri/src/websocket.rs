use std::sync::{Arc, atomic::{AtomicBool, Ordering}};
use tokio::time::{sleep, Duration};
use tauri::Manager;

use crate::portapi::client::connect;
use crate::notifications::notification_handler;

lazy_static! {
    static ref PM_REACHABLE: Arc<AtomicBool> = Arc::new(AtomicBool::new(false));
}

/// The name of the event emitted on the Tauri app whenever the status of the
/// portapi connection changes.
/// 
/// The payload of the event is either the &str "connected" or "disconnected".
pub const PORTAPI_STATUS_EVENT: &str = "portapi::status";

/// Reports whether or not the Portmaster Websocket-based database API is 
/// reachable and connected.
pub fn is_portapi_reachable() -> bool {
    PM_REACHABLE.load(Ordering::Relaxed)
}

/// Starts a backround thread (via tauri::async_runtime) that connects to the Portmaster
/// Websocket database API.
/// 
/// If handle_notifications is set to true, a dedicated async thread is spawned to handle
/// and display system notifications.
/// 
/// In case the PM connection is lost, the spawned thread will try to re-connect to the
/// API and re-start any handler (like for notifications) upon successfull reconnection.
/// 
/// Also, a global app event "portapi::status" will be emitted whenever the status of
/// the API connection changes. The payload of this event is either "connected" or "disconnected".
pub fn start_websocket_thread(app: &tauri::AppHandle, handle_notifications: bool) {
    let app = app.clone();

    tauri::async_runtime::spawn(async move {
        loop {
            #[cfg(debug_assertions)]
            println!("Trying to connect to websocket endpoint");

            let api = connect("ws://127.0.0.1:817/api/database/v1").await;

            match api {
                Ok(cli) => {
                    eprintln!("Successfully connected to portmaster");

                    PM_REACHABLE.store(true, Ordering::Relaxed);

                    let _ = app.emit(PORTAPI_STATUS_EVENT, "connected");

                    // Start the notification handle if desired
                    if handle_notifications {
                        let cli = cli.clone();
                        tauri::async_runtime::spawn(async move {
                            notification_handler(cli).await;
                        });
                    }

                    while !cli.is_closed() {
                        let _ = sleep(Duration::from_secs(1)).await;
                    }

                    PM_REACHABLE.store(false, Ordering::Relaxed);
                    let _ = app.emit(PORTAPI_STATUS_EVENT, "disconnected");

                    eprintln!("lost connection to portmaster, retrying ....")
                }
                Err(err) => {
                    eprintln!("failed to create portapi client: {}", err);

                    // sleep and retry
                    sleep(Duration::from_secs(2)).await;
                }
            }
        }
    });
}