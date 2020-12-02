import { Component, OnDestroy, OnInit } from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import { ConfigService, Setting, StatusService, VersionStatus } from 'src/app/services';
import { PortapiService } from 'src/app/services/portapi.service';
import { Record } from 'src/app/services/portapi.types';
import { fadeInAnimation } from 'src/app/shared/animations';
import { SaveSettingEvent } from 'src/app/shared/config/generic-setting/generic-setting';

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
  searchTerm: string = '';

  /** @private All settings currently displayed. */
  settings: Setting[] = [];

  /** @private The available and selected resource versions. */
  versions: VersionStatus | null = null;

  /** Subscription to watch all available settings. */
  private subscription = Subscription.EMPTY;

  constructor(
    public configService: ConfigService,
    public statusService: StatusService,
    private portapi: PortapiService
  ) { }

  ngOnInit(): void {
    this.subscription = new Subscription();

    // Subscribe to all available configuration settings
    // and to changes on their values.
    const configSub = this.configService.query('')
      .subscribe(settings => this.settings = settings);

    // Request the current resource versions once. We add
    // it to the subscription to prevent a memory leak in
    // case the user leaves the page before the versions
    // have been loaded.
    const versionSub = this.statusService.getVersions()
      .subscribe(version => this.versions = version);

    this.subscription.add(configSub);
    this.subscription.add(versionSub);
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }


  /**
   * @private
   * SaveSettingEvent is emitted by the settings-view
   * component when a value has been changed and should be saved.
   *
   * @param event The save-settings event
   */
  saveSetting(event: SaveSettingEvent) {
    let idx = this.settings.findIndex(setting => setting.Key === event.key);
    if (!idx) {
      return;
    }

    const setting = {
      ...this.settings[idx],
    }

    if (event.isDefault) {
      delete (setting['Value']);
    } else {
      setting.Value = event.value;
    }

    this.configService.save(setting)
      .subscribe({
        next: () => {
          this.settings[idx] = setting;
        },
        error: console.error
      })
  }

  /**
   * Injects an event into a module to trigger certain backend
   * behavior.
   *
   * @param module The name of the module to inject
   * @param kind The event kind to inject
   */
  private injectTrigger(module: string, kind: string): Observable<void> {
    return this.portapi.get<Record>(`control:module/${module}/trigger/${kind}`)
      .pipe(map(() => { }))
  }

  /**
   * @private
   * Injects a ui/reload event and performs a complete
   * reload of the window once the portmaster re-opened the
   * UI bundle.
   */
  reloadUI(_: Event) {
    this.injectTrigger('ui', 'reload')
      .subscribe(() => {
        window.location.reload();
      })
  }

  /**
   * @private
   * Clear the DNS name cache.
   */
  clearDNSCache(_: Event) {
    this.injectTrigger('resolver', 'clear name cache').subscribe();
  }

  /**
   * @private
   * Trigger downloading of updates
   *
   * @param event - The mouse event
   */
  downloadUpdates(event: Event) {
    // prevent default and stop-propagation to avoid
    // expanding the accordion body.
    event.preventDefault();
    event.stopPropagation();

    this.injectTrigger('updates', 'trigger update').subscribe()
  }

  /**
   * @private
   * Trigger a shutdown of the portmaster-core service
   */
  shutdown(_: Event) {
    this.injectTrigger('core', 'shutdown').subscribe();
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

    this.injectTrigger('core', 'restart').subscribe();
  }

  /**
   * @private
   * Opens the data-directory of the portmaster installation.
   * Requires the application to run inside electron.
   */
  openDataDir(event: Event) {
    if (!!window.app) {
      window.app.openExternal(window.app.installDir);
    }
  }
}
