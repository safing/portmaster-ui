import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { ConfigService, DebugAPI, Setting, StatusService, VersionStatus } from 'src/app/services';
import { PortapiService } from 'src/app/services/portapi.service';
import { ActionIndicatorService } from 'src/app/shared/action-indicator';
import { fadeInAnimation } from 'src/app/shared/animations';
import { SaveSettingEvent } from 'src/app/shared/config/generic-setting/generic-setting';
import { ExitService } from 'src/app/shared/exit-screen';

@Component({
  templateUrl: './settings.html',
  styleUrls: [
    '../page.scss',
    './settings.scss'
  ],
  animations: [fadeInAnimation]
})
export class SettingsComponent implements OnInit, OnDestroy {
  /** @private The current search term for the settings. */
  searchTerm = '';

  /** @private All settings currently displayed. */
  settings: Setting[] = [];

  /** @private The available and selected resource versions. */
  versions: VersionStatus | null = null;

  /**
   * @private
   * The key of the setting to highligh, if any ...
   */
  highlightSettingKey: string | null = null;

  /** Subscription to watch all available settings. */
  private subscription = Subscription.EMPTY;

  constructor(
    public configService: ConfigService,
    public statusService: StatusService,
    private portapi: PortapiService,
    private debugAPI: DebugAPI,
    private actionIndicator: ActionIndicatorService,
    private route: ActivatedRoute,
    private exitService: ExitService,
  ) { }

  ngOnInit(): void {
    this.subscription = new Subscription();

    this.loadSettings();

    // Request the current resource versions once. We add
    // it to the subscription to prevent a memory leak in
    // case the user leaves the page before the versions
    // have been loaded.
    const versionSub = this.statusService.getVersions()
      .subscribe(version => this.versions = version);

    this.subscription.add(versionSub);

    const querySub = this.route.queryParamMap
      .subscribe(
        params => {
          this.highlightSettingKey = params.get('setting');
        }
      );
    this.subscription.add(querySub);
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  /**
   * Loads all settings from the portmaster.
   */
  private loadSettings() {
    const configSub = this.configService.query('')
      .subscribe(settings => this.settings = settings);
    this.subscription.add(configSub);
  }

  /**
   * @private
   * SaveSettingEvent is emitted by the settings-view
   * component when a value has been changed and should be saved.
   *
   * @param event The save-settings event
   */
  saveSetting(event: SaveSettingEvent) {
    const idx = this.settings.findIndex(setting => setting.Key === event.key);
    if (idx < 0) {
      return;
    }

    const setting = {
      ...this.settings[idx],
    };

    if (event.isDefault) {
      delete (setting.Value);
    } else {
      setting.Value = event.value;
    }

    this.configService.save(setting)
      .subscribe({
        next: () => {
          this.settings[idx] = setting;

          // for the release level setting we need to
          // to a page-reload since portmaster will now
          // return more settings.
          if (setting.Key === 'core/releaseLevel') {
            this.loadSettings();
          }
        },
        error: err => {
          this.actionIndicator.error('Failed to save setting', err);
          console.error(err);
        }
      });
  }

  /**
   * @private
   * Injects a ui/reload event and performs a complete
   * reload of the window once the portmaster re-opened the
   * UI bundle.
   */
  reloadUI(_: Event) {
    this.portapi.reloadUI();
  }

  /**
   * @private
   * Clear the DNS name cache.
   */
  clearDNSCache(_: Event) {
    this.portapi.clearDNSCache();
  }

  /**
   * @private
   * Trigger downloading of updates
   *
   * @param event - The mouse event
   */
  downloadUpdates(event: Event) {
    this.portapi.checkForUpdates();
  }

  /**
   * @private
   * Trigger a shutdown of the portmaster-core service
   */
  shutdown(_: Event) {
    this.exitService.shutdownPortmaster();
  }

  /**
   * @private
   * Trigger a restart of the portmaster-core service. Requires
   * that portmaster has been started with a service-wrapper.
   *
   * @param event The mouse event
   */
  restart(event: Event) {
    // prevent default and stop-propagation to avoid
    // expanding the accordion body.
    event.preventDefault();
    event.stopPropagation();

    this.portapi.restartPortmaster();
  }

  /**
   * @private
   * Opens the data-directory of the portmaster installation.
   * Requires the application to run inside electron.
   */
  async openDataDir(event: Event) {
    if (!!window.app) {
      const dir = await window.app.getInstallDir();
      await window.app.openExternal(dir);
    }
  }

  openChangeLog() {
    const url = "https://github.com/safing/portmaster/releases";
    if (!!window.app) {
      window.app.openExternal(url);
      return;
    }
    window.open(url, '_blank');
  }

  copyDebugInfo(event: Event) {
    // prevent default and stop-propagation to avoid
    // expanding the accordion body.
    event.preventDefault();
    event.stopPropagation();

    this.debugAPI.getCoreDebugInfo()
      .subscribe(
        async info => {
          console.log(info);
          // Copy to clip-board if supported
          if (!!navigator.clipboard) {
            await navigator.clipboard.writeText(info);
            this.actionIndicator.success('Copied to Clipboard');
          }

        },
        err => {
          console.error(err);
          this.actionIndicator.error('Failed loading debug data', err);
        }
      );
  }
}
