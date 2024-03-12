use super::PortmasterExt;
use crate::portapi::client::connect;
use tauri::{AppHandle, Runtime};
use tokio::time::{sleep, Duration};

/// Starts a backround thread (via tauri::async_runtime) that connects to the Portmaster
/// Websocket database API.
pub fn start_websocket_thread<R: Runtime>(app: AppHandle<R>) {
    let app = app.clone();

    tauri::async_runtime::spawn(async move {
        loop {
            #[cfg(debug_assertions)]
            println!("Trying to connect to websocket endpoint");

            let api = connect("ws://127.0.0.1:817/api/database/v1").await;

            match api {
                Ok(cli) => {
                    let portmaster = app.portmaster();

                    eprintln!("Successfully connected to portmaster");

                    portmaster.on_connect(cli.clone());

                    while !cli.is_closed() {
                        let _ = sleep(Duration::from_secs(1)).await;
                    }

                    portmaster.on_disconnect();

                    eprintln!("lost connection to portmaster, retrying ....")
                }
                Err(err) => {
                    eprintln!("failed to create portapi client: {}", err);

                    app.portmaster().on_disconnect();

                    // sleep and retry
                    sleep(Duration::from_secs(2)).await;
                }
            }
        }
    });
}
