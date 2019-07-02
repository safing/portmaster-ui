# Portmaster UI

This repo holds all the UI related components for the [portmaster](https://github.com/safing/portmaster).

### Repo structure

- `app`: Thin web wrapper app to run the UI modules.
- `assets`: UI assets used by multiple modules.
- `dist`: All built parts end up here.
- `modules`: UI modules based on web technologies.
- `notifier`: Tray/menu icon and prompting program.

### Building

Running the `pack` script in the root directory will build all UI components for all supported systems (you must be on linux).

The output in the `dist` directory will look something like this:

```
all/ui/modules/assets_v0-1-1.zip
all/ui/modules/base_v0-1-1.zip
all/ui/modules/monitor_v0-1-1.zip
all/ui/modules/profilemgr_v0-1-1.zip
all/ui/modules/settings_v0-1-1.zip
[OS]_[ARCH]/app/portmaster-ui_v0-1-1
[OS]_[ARCH]/notifier/portmaster-notifier_v0-1-1
```
