import { Injectable } from '@angular/core';
import { BehaviorSubject, merge, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, map, skip, switchMap, tap, timeout } from 'rxjs/operators';
import { UIStateService } from 'src/app/services';
import { PortapiService } from 'src/app/services/portapi.service';
import { DialogService } from '../dialog';
import { ExitScreenComponent } from './exit-screen';

const MessageConnecting = 'Connecting to Portmaster';
const MessageShutdown = 'Shutting Down Portmaster';
const MessageRestart = 'Restarting Portmaster';
const MessageHidden = '';

export type OverlayMessage = typeof MessageConnecting
  | typeof MessageShutdown
  | typeof MessageRestart
  | typeof MessageHidden;

@Injectable({ providedIn: 'root' })
export class ExitService {
  private hasOverlay = false;

  private _showOverlay = new BehaviorSubject<OverlayMessage>(MessageConnecting);

  /**
   * Emits whenever the "Connecting to ..." or "Restarting ..." overlays
   * should be shown. It actually emits the message that should be shown.
   * An empty string indicates the overlay should be closed.
   */
  get showOverlay$() { return this._showOverlay.asObservable() }

  constructor(
    private stateService: UIStateService,
    private portapi: PortapiService,
    private dialog: DialogService
  ) {

    this.portapi.connected$
      .pipe(
        distinctUntilChanged(),
      )
      .subscribe(connected => {
        if (connected) {
          this._showOverlay.next(MessageHidden);
        } else if (this._showOverlay.getValue() !== MessageShutdown) {
          this._showOverlay.next(MessageConnecting)
        }
      })


    merge<OverlayMessage, OverlayMessage>(
      this.portapi.sub('runtime:modules/core/event/shutdown')
        .pipe(map(() => MessageShutdown)),
      this.portapi.sub('runtime:modules/core/event/restart')
        .pipe(map(() => MessageRestart)),
    )
      .pipe(
        tap(msg => this._showOverlay.next(msg)),
        switchMap(() => this.portapi.connected$),
        distinctUntilChanged(),
        skip(1),
        debounceTime(1000), // make sure we display the "shutdown" overlay for at least a second
      )
      .subscribe(msg => {
        if (this._showOverlay.getValue() === MessageShutdown && !!window.app) {
          setTimeout(() => {
            window.app.exitApp();
          }, 1000)
        }
      })

    window.addEventListener('beforeunload', () => {
      // best effort. may not work all the time depending on
      // the current websocket buffer state
      this.portapi.bridgeAPI('ui/reload', 'POST').subscribe();
    })

    window.addEventListener('message', event => {
      if (event.data === 'on-app-close') {
        this.stateService.uiState()
          // make sure to not wait for the portmaster to start
          .pipe(timeout(1000), catchError(() => of(null)))
          .subscribe(state => {
            if (state?.hideExitScreen) {
              window.app.exitApp();
            }
            if (this.hasOverlay) {
              return;
            }
            this.hasOverlay = true;

            this.dialog.create(ExitScreenComponent, { autoclose: true })
              .onAction('exit', () => window.app.exitApp())
              .onClose.subscribe(() => this.hasOverlay = false);
          })
      }
    })
  }

  shutdownPortmaster() {
    this.dialog.confirm({
      canCancel: true,
      header: 'Shutting Down Portmaster',
      message: 'Shutting down the Portmaster will stop all Portmaster components and will leave your system unprotected!',
      caption: 'Caution',
      buttons: [
        {
          id: 'shutdown',
          class: 'danger',
          text: 'Shut Down Portmaster'
        }
      ]
    })
      .onAction('shutdown', () => this.portapi.shutdownPortmaster())
  }
}
