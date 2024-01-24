use tauri::{
    menu::{CheckMenuItemBuilder, MenuBuilder, MenuItemBuilder, PredefinedMenuItem},
    tray::{ClickType, TrayIconBuilder},
    Icon, Manager
};
use tauri_plugin_dialog::DialogExt;

use crate::window::open_or_create_window;

pub fn setup_tray_menu(app: &mut tauri::App) -> core::result::Result<(), Box<dyn std::error::Error>> {
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