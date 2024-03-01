/// This module contains a custom tauri plugin that handles all communication
/// with the angular app loaded from the portmaster api.
/// 
/// Using a custom-plugin for this has the advantage that all code that has
/// access to a tauri::Window or a tauri::AppHandle can get access to the
/// portmaster plugin using the Runtime/Manager extension by just calling
/// window.portmaster() or app_handle.portmaster().
///
/// Any portmaster related features (like changing a portmaster setting) should
/// live in this module.
///
/// Code that handles windows should NOT live here but should rather be placed
/// in the crate root.

// The commands module contains tauri commands that are available to Javascript
// using the invoke() and our custom invokeAsync() command.
mod commands;

// The websocket module spawns an async function on tauri's runtime that manages
// a persistent connection to the Portmaster websocket API and updates the tauri Portmaster
// Plugin instance.
mod websocket;

// The notification module manages system notifications from portmaster.
mod notifications;


use std::{collections::HashMap, sync::atomic::{AtomicBool, Ordering}};
use crate::portapi::{
    client::PortAPI,
    message::Payload,
    types::Request,
    models::config::BooleanValue,
};

use std::sync::Mutex;
use serde;
use tauri::{
    plugin::{Builder, TauriPlugin},
    AppHandle, Manager, Runtime,
};

pub trait Handler  {
    fn on_connect(&mut self, cli: PortAPI) -> ();
    fn on_disconnect(&mut self);
}

pub struct PortmasterPlugin<R: Runtime> {
    #[allow(dead_code)]
    app: AppHandle<R>,

    // state allows the angular application to store arbitrary values in the
    // tauri application memory using the get_state and set_state
    // tauri::commands.
    state: Mutex<HashMap<String, String>>,

    // an atomic boolean that indicates if we're currently connected to
    // portmaster or not.
    is_reachable: AtomicBool,

    // holds the portapi client if any.
    api: Mutex<Option<PortAPI>>,

    // a vector of handlers that should be invoked on connect and disconnect of
    // the portmaster API.
    handlers: Mutex<Vec<Box<dyn Handler + Send>>>,

    // whether or not we should handle notifications here.
    handle_notifications: AtomicBool,

    // whether or not we should handle prompts.
    handle_prompts: AtomicBool,

    // whether or not the angular application should call window.show after it
    // finished bootstrapping.
    should_show_after_bootstrap: AtomicBool,
}

impl<R: Runtime> PortmasterPlugin<R> {
    /// Returns a state stored in the portmaster plugin.
    pub fn get_state(&self, key: String) -> Option<String> {
        let map = self.state.lock();

        if let Ok(map) = map {
            match map.get(&key) {
                Some(value) => Some(value.clone()),
                None => None,
            }
        } else {
            None
        }
    }

    /// Adds a new state to the portmaster plugin.
    pub fn set_state(&self, key: String, value: String) {
        let map = self.state.lock();

        if let Ok(mut map) = map {
            map.insert(key, value);
        }
    }

    /// Reports wheter or not we're currently connected to the Portmaster API.
    pub fn is_reachable(&self) -> bool {
        self.is_reachable.load(Ordering::Relaxed)
    }

    /// Registers a new connection handler that is called on connect
    /// and disconnect of the Portmaster websocket API.
    pub fn register_handler(&self, mut handler: impl Handler + Send + 'static) {
        // register_handler can only be invoked after the plugin setup
        // completed. in this case, the websocket thread is already spawned and
        // we might already be connected or know that the connection failed.
        // Call the respective handler method immediately now.
        if let Some(api) = self.get_api() {
            handler.on_connect(api);
        } else {
            handler.on_disconnect();
        }

        if let Ok(mut handlers) = self.handlers.lock() {
            handlers.push(Box::new(handler));
        }
    }

    /// Returns the current portapi client.
    pub fn get_api(&self) -> Option<PortAPI> {
        if let Ok(mut api) = self.api.lock() {
            match &mut *api {
                Some(api) => Some(api.clone()),
                None => None,
            }
        } else {
            None
        }
    }

    /// Feature functions (enable/disable certain features).

    /// Configures whether or not our tauri app should show system
    /// notifications. This excludes connection prompts. Use
    /// with_connection_prompts to enable handling of connection prompts.
    pub fn with_notification_support(&self, enable: bool) {
        self.handle_notifications.store(enable, Ordering::Relaxed);

        // kick of the notification handler if we are connected.
        if enable {
            self.start_notification_handler();
        }
    }

    /// Configures whether or not our angular application should show connection
    /// prompts via tauri.
    pub fn with_connection_prompts(&self, enable: bool) {
        self.handle_prompts.store(enable, Ordering::Relaxed);
    }

    /// Whether or not the angular application should call window.show after it
    /// finished bootstrapping.
    pub fn set_show_after_bootstrap(&self, show: bool) {
        self.should_show_after_bootstrap.store(show, Ordering::Relaxed);
    }

    /// Returns whether or not the angular application should call window.show
    /// after it finished bootstrapping.
    pub fn get_show_after_bootstrap(&self) -> bool {
        self.should_show_after_bootstrap.load(Ordering::Relaxed)
    }

    /// Tells the angular applicatoin to show the window by emitting an event.
    /// It calls set_show_after_bootstrap(true) automatically so the application
    /// also shows after bootstrapping.
    pub fn show_window(&self) {
        // set show_after_bootstrap to true so the app will even show if it
        // misses the event below because it's still bootstrapping.
        self.set_show_after_bootstrap(true);

        // ignore the error here, there's nothing we could do about it anyways.
        let _ = self.app.emit("portmaster:show", "");
    }

    /// Enables or disables the SPN.
    pub fn set_spn_enabled(&self, enabled: bool) { 
        if let Some(api) = self.get_api() {
            let body: Result<Payload, serde_json::Error> =
                BooleanValue { value: Some(enabled) }.try_into();

            if let Ok(payload) = body {
                tauri::async_runtime::spawn(async move { 
                    _ = api.request(Request::Update("config:spn/enable".to_string(), payload)).await;
                });
            }
        }
    }

    //// Internal functions
    fn start_notification_handler(&self) {
        if let Some(api) = self.get_api() {
            let cli = api.clone();
            tauri::async_runtime::spawn(async move {
                notifications::notification_handler(cli).await;
            });
        }
    }

    /// Internal method to call all on_connect handlers
    fn on_connect(&self, api: PortAPI) {
        self.is_reachable.store(true, Ordering::Relaxed);

        // store the new api client.
        let mut guard = self.api.lock().unwrap();
        *guard = Some(api.clone());
        drop(guard);

        // fire-off the notification handler.
        if self.handle_notifications.load(Ordering::Relaxed) {
            self.start_notification_handler();
        }


        if let Ok(mut handlers) = self.handlers.lock() {
            for handler in handlers.iter_mut() {
                handler.on_connect(api.clone());
            }
        }
    }

    /// Internal method to call all on_disconnect handlers
    fn on_disconnect(&self) {
        self.is_reachable.store(false, Ordering::Relaxed);

        // clear the current api client reference.
        let mut guard = self.api.lock().unwrap();
        *guard = None;
        drop(guard);

        if let Ok(mut handlers) = self.handlers.lock() {
            for handler in handlers.iter_mut() {
                handler.on_disconnect();
            }
        }
    }
}


pub trait PortmasterExt<R: Runtime> {
    fn portmaster(&self) -> &PortmasterPlugin<R>;
}

#[derive(serde::Serialize, serde::Deserialize, Debug)]
pub struct Config {}

impl<R: Runtime, T: Manager<R>> PortmasterExt<R> for T {
    fn portmaster(&self) -> &PortmasterPlugin<R> {
        self.state::<PortmasterPlugin<R>>().inner()
    }
}

pub fn init<R: Runtime>() -> TauriPlugin<R, Option<Config>> {
    Builder::<R, Option<Config>>::new("portmaster")   
    .invoke_handler(tauri::generate_handler![
        commands::get_app_info,
        commands::get_service_manager_status,
        commands::start_service,
        commands::get_state,
        commands::set_state,
        commands::should_show,
        commands::should_handle_prompts
    ])
        .setup(|app, api| {
            let plugin = PortmasterPlugin{
                app: app.clone(),
                state: Mutex::new(HashMap::new()),
                is_reachable: AtomicBool::new(false),
                handlers: Mutex::new(Vec::new()),
                api: Mutex::new(None),
                handle_notifications: AtomicBool::new(false),
                handle_prompts: AtomicBool::new(false),
                should_show_after_bootstrap: AtomicBool::new(true),
            };

            app.manage(plugin);

            // fire of the websocket handler
            websocket::start_websocket_thread(app.clone());

            Ok(())
        })
        .build()
}
