import { Overlay } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { Inject, Injectable, Injector, NgZone } from '@angular/core';
import { of } from 'rxjs';
import { catchError, take, timeout } from 'rxjs/operators';
import { UIStateService } from 'src/app/services';
import { ActionIndicatorService } from '../action-indicator';
import { ExitScreenComponent, OVERLAYREF } from './exit-screen';

@Injectable({ providedIn: 'root' })
export class ExitService {
  constructor(
    private overlay: Overlay,
    private injector: Injector,
    private stateService: UIStateService,
  ) {
    window.addEventListener('message', event => {
      if (event.data === 'on-app-close') {
        this.stateService.uiState()
          // make sure to not wait for the portmaster to start
          .pipe(timeout(1000), catchError(() => of(null)))
          .subscribe(state => {
            if (state?.hideExitScreen) {
              window.app.exitApp();
            }

            const overlayref = this.overlay.create({
              positionStrategy: this.overlay.position()
                .global()
                .centerHorizontally()
                .centerVertically(),
              hasBackdrop: true,
              backdropClass: 'exit-screen-backdrop',
            })

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

            const portal = new ComponentPortal(ExitScreenComponent, undefined, inj);
            portal.attach(overlayref);
          })
      }
    })
  }
}
