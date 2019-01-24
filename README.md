# Portmaster UI

### Repo structure

- `app`: Thin web wrapper app to run the UI modules.
- `modules`: UI modules based on web technologies.
- `assets`: UI assets used by multiple modules.
- `dist`: All built parts end up here.
- `notifier`: Tray/menu icon and prompting program.
- `packaging`: Things related to custom platform packaging.

### Building

Running the `build` script in the root directory will build all UI components for all supported systems (you must be on linux).

The output in the `dist` directory will look something like this:

    portmaster_app_[OS]_[ARCH].zip
    portmaster_notifier_[OS]_[ARCH].zip
    [ui_module].zip
    assets.zip

### Serve built modules locally for development

    go run serve.go 127.0.0.1:8080
