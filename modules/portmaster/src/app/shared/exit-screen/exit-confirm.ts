import { AnimationEvent } from '@angular/animations';
import { OverlayRef } from '@angular/cdk/overlay';
import { Component, HostBinding, HostListener, Inject } from '@angular/core';
import { PortapiService } from 'src/app/services/portapi.service';
import { OVERLAYREF } from '.';
import { fadeInAnimation, fadeOutAnimation } from '../animations';

@Component({
  templateUrl: './exit-confirm.html',
  styleUrls: ['./exit-screen.scss'],
  animations: [
    fadeInAnimation,
    fadeOutAnimation,
  ]
})
export class ExitConfirmComponent {
  constructor(
    @Inject(OVERLAYREF) private _overlayRef: OverlayRef,
    private portapi: PortapiService,
  ) { }

  @HostBinding('@fadeIn')
  @HostBinding('@fadeOut')
  animated = true;

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

  shutdown() {
    this.portapi.shutdownPortmaster();
  }

  cancel() {
    this._overlayRef.detach();
  }
}
