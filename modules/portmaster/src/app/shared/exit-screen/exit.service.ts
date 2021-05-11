import { Overlay } from '@angular/cdk/overlay';
import { ComponentPortal, ComponentType } from '@angular/cdk/portal';
import { Inject, Injectable, Injector, NgZone } from '@angular/core';
import { of } from 'rxjs';
import { catchError, take, timeout } from 'rxjs/operators';
import { UIStateService } from 'src/app/services';
import { PortapiService } from 'src/app/services/portapi.service';
import { ActionIndicatorService } from '../action-indicator';
import { ExitConfirmComponent } from './exit-confirm';
import { ExitScreenComponent, OVERLAYREF } from './exit-screen';

@Injectable({ providedIn: 'root' })
export class ExitService {
  private hasOverlay = false;

  constructor(
    private overlay: Overlay,
    private injector: Injector,
    private stateService: UIStateService,
    private portapi: PortapiService,
  ) {
    if (!!window.app) {
      this.portapi.sub('runtime:modules/core/event/shutdown')
        .subscribe(() => {
          setTimeout(() => {
            window.app.exitApp();
          }, 1000)
        })
    }

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

            this.createOverlay(ExitScreenComponent);
          })
      }
    })
  }

  shutdownPortmaster() {
    this.createOverlay(ExitConfirmComponent);
  }

  private createOverlay(type: ComponentType<any>) {
    if (this.hasOverlay) {
      return;
    }

    this.hasOverlay = true;
    const overlayref = this.overlay.create({
      positionStrategy: this.overlay.position()
        .global()
        .centerHorizontally()
        .centerVertically(),
      hasBackdrop: true,
      backdropClass: 'exit-screen-backdrop',
    });

    // prevent multiple exit-dialogs to be displayed
    overlayref.detachments().pipe(take(1))
      .subscribe(() => this.hasOverlay = false);

    // we only detach() the overlayref on outside pointer events
    // or Escape keydown events because the ExitScreenComponent will
    // dispose() the overlayref when the detachment is done.

    overlayref.outsidePointerEvents()
      .pipe(take(1))
      .subscribe(() => overlayref.detach())

    overlayref.keydownEvents()
      .subscribe(event => {
        if (event.key === 'Escape') {
          overlayref.detach();
        }
      });

    const inj = Injector.create({
      providers: [
        {
          provide: OVERLAYREF,
          useValue: overlayref,
        }
      ],
      parent: this.injector,
    })

    const portal = new ComponentPortal(type, undefined, inj);
    portal.attach(overlayref);
  }
}
