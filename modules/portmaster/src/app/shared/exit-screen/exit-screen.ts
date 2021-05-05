import { AnimationEvent } from '@angular/animations';
import { OverlayRef } from '@angular/cdk/overlay';
import { Component, HostBinding, HostListener, Inject, InjectionToken, NgZone } from '@angular/core';
import { map, switchMap } from 'rxjs/operators';
import { UIStateService } from 'src/app/services';
import { fadeInAnimation, fadeOutAnimation } from '../animations';

export const OVERLAYREF = new InjectionToken<OverlayRef>('OverlayRef');

@Component({
  templateUrl: './exit-screen.html',
  styleUrls: ['./exit-screen.scss'],
  animations: [
    fadeInAnimation,
    fadeOutAnimation,
  ]
})
export class ExitScreenComponent {
  constructor(
    @Inject(OVERLAYREF) private _overlayRef: OverlayRef,
    private stateService: UIStateService,
  ) { }

  @HostBinding('@fadeIn')
  @HostBinding('@fadeOut')
  animated = true;

  neveragain: boolean = false;

  @HostListener('@fadeOut.done', ['$event'])
  onAnimationEnd(event: AnimationEvent) {
    if (event.toState !== 'void') {
      return;
    }

    this._overlayRef.dispose();
    if (this.shouldExit) {
      window.app.exitApp();
    }
  }

  private shouldExit = false;

  closeUI() {
    if (this.neveragain) {
      this.stateService.uiState()
        .pipe(
          map(state => {
            state.hideExitScreen = true;
            return state;
          }),
          switchMap(state => this.stateService.saveState(state)),
        )
        .subscribe(() => {
          this.shouldExit = true;
          this._overlayRef.detach();
        });
    } else {
      this.shouldExit = true;
      this._overlayRef.detach();
    }
  }

  cancel() {
    this._overlayRef.detach();
  }
}
