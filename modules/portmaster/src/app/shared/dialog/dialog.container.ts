import { AnimationEvent } from '@angular/animations';
import { CdkPortalOutlet, ComponentPortal, ComponentType, Portal, TemplatePortal } from '@angular/cdk/portal';
import { NullTemplateVisitor } from '@angular/compiler';
import { ChangeDetectorRef, Component, ComponentRef, EmbeddedViewRef, HostBinding, HostListener, InjectionToken, Input, Type, ViewChild } from '@angular/core';
import { Subject } from 'rxjs';
import { dialogAnimation } from './dialog.animations';

export const DIALOG_PORTAL = new InjectionToken<Portal<any>>('DialogPortal');

export type DialogState = 'opening' | 'open' | 'closing' | 'closed';

@Component({
  template: `
  <div class="container" cdkDrag cdkDragRootElement=".cdk-overlay-pane" [cdkDragDisabled]="!dragable">
    <div *ngIf="dragable" cdkDragHandle id="drag-handle"></div>
    <ng-container cdkPortalOutlet></ng-container>
  </div>
  `,
  styleUrls: ['./dialog.scss'],
  animations: [dialogAnimation]
})
export class DialogContainer<T> {
  onStateChange = new Subject<DialogState>();

  ref: ComponentRef<T> | EmbeddedViewRef<T> | null = null;

  constructor(
    private cdr: ChangeDetectorRef
  ) { }

  @HostBinding('@dialogContainer')
  state = 'enter';

  @ViewChild(CdkPortalOutlet, { static: true })
  _portalOutlet: CdkPortalOutlet | null = null;

  attachComponentPortal(portal: ComponentPortal<T>): ComponentRef<T> {
    this.ref = this._portalOutlet!.attachComponentPortal(portal)
    return this.ref;
  }

  attachTemplatePortal(portal: TemplatePortal<T>): EmbeddedViewRef<T> {
    this.ref = this._portalOutlet!.attachTemplatePortal(portal);
    return this.ref;
  }

  @Input()
  dragable: boolean = false;

  @HostListener('@dialogContainer.start', ['$event'])
  onAnimationStart({ toState }: AnimationEvent) {
    if (toState === 'enter') {
      this.onStateChange.next('opening');
    } else if (toState === 'exit') {
      this.onStateChange.next('closing');
    }
  }

  @HostListener('@dialogContainer.done', ['$event'])
  onAnimationEnd({ toState }: AnimationEvent) {
    if (toState === 'enter') {
      this.onStateChange.next('open');
    } else if (toState === 'exit') {
      this.onStateChange.next('closed');
    }
  }

  /** Starts the exit animation */
  _startExit() {
    this.state = 'exit';
    this.cdr.markForCheck();
  }
}
