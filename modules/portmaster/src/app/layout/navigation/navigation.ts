import { ConnectedPosition } from '@angular/cdk/overlay';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component } from '@angular/core';
import { DebugAPI, PortapiService } from '@safing/portmaster-api';
import { AppComponent } from 'src/app/app.component';
import { NotificationsService, NotificationType, StatusService, VersionStatus } from 'src/app/services';
import { ActionIndicatorService } from 'src/app/shared/action-indicator';
import { ExitService } from 'src/app/shared/exit-screen';

@Component({
  selector: 'app-navigation',
  templateUrl: './navigation.html',
  styleUrls: ['./navigation.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavigationComponent {
  /** Emits the current portapi connection state on changes. */
  readonly connected$ = this.portapi.connected$;

  /** @private The available and selected resource versions. */
  versions: VersionStatus | null = null;

  /** Whether or not we have new, unseen notifications */
  hasNewNotifications = false;

  /** Whether or not we have new, unseen prompts */
  hasNewPrompts = false;

  constructor(
    private portapi: PortapiService,
    private exitService: ExitService,
    private statusService: StatusService,
    private appComponent: AppComponent,
    private debugAPI: DebugAPI,
    private actionIndicator: ActionIndicatorService,
    private notificationService: NotificationsService,
    private cdr: ChangeDetectorRef
  ) { }

  dropDownPositions: ConnectedPosition[] = [
    {
      originX: 'end',
      originY: 'top',
      overlayX: 'start',
      overlayY: 'top'
    }
  ]

  ngOnInit() {
    this.statusService.getVersions()
      .subscribe(versions => {
        this.versions = versions;
        this.cdr.markForCheck();
      });

    this.notificationService.new$
      .subscribe(notif => {
        if (notif.some(n => n.Type === NotificationType.Prompt && n.EventID.startsWith("filter:prompt"))) {
          this.hasNewPrompts = true;
        } else {
          this.hasNewPrompts = false;
        }

        if (notif.some(n => !n.EventID.startsWith("filter:prompt"))) {
          this.hasNewNotifications = true;
        } else {
          this.hasNewNotifications = false;
        }
      })
  }

  shutdownPortmaster() {
    this.exitService.shutdownPortmaster();
  }

  restartPortmaster() {
    this.portapi.restartPortmaster();
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
      const dir = await window.app.getInstallDir()
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

  showIntro() {
    this.appComponent.showIntro()
  }

  resetBroadcastState() {
    this.portapi.resetBroadcastState();
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
            this.actionIndicator.success("Copied to Clipboard")
          }

        },
        err => {
          console.error(err);
          this.actionIndicator.error('Failed loading debug data', err);
        }
      )
  }
}
