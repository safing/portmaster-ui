import { Overlay, OverlayConfig, OverlayPositionBuilder, PositionStrategy } from '@angular/cdk/overlay';
import { ComponentPortal, ComponentType, TemplatePortal } from '@angular/cdk/portal';
import { EmbeddedViewRef, Injectable, Injector } from '@angular/core';
import { filter, take, takeUntil } from 'rxjs/operators';
import { ConfirmDialogConfig, CONFIRM_DIALOG_CONFIG, SfngConfirmDialogComponent } from './confirm.dialog';
import { SfngDialogContainer } from './dialog.container';
import { SfngDialogModule } from './dialog.module';
import { SfngDialogRef, SFNG_DIALOG_REF } from './dialog.ref';

export interface BaseDialogConfig {
  /** whether or not the dialog should close on outside-clicks and ESC */
  autoclose?: boolean;

  /** whether or not a backdrop should be visible */
  backdrop?: boolean | 'light';

  /** whether or not the dialog should be dragable */
  dragable?: boolean;

  /**
   * optional position strategy for the overlay. if omitted, the
   * overlay will be centered on the screen
   */
  positionStrategy?: PositionStrategy;
}

export interface ComponentPortalConfig {
  injector?: Injector;
}

@Injectable({ providedIn: SfngDialogModule })
export class SfngDialogService {

  constructor(
    private injector: Injector,
    private overlay: Overlay,
  ) { }

  position(): OverlayPositionBuilder {
    return this.overlay.position();
  }

  create<T>(template: TemplatePortal<T>, opts?: BaseDialogConfig): SfngDialogRef<EmbeddedViewRef<T>>;
  create<T>(target: ComponentType<T>, opts?: BaseDialogConfig & ComponentPortalConfig): SfngDialogRef<T>;
  create<T>(target: ComponentType<T> | TemplatePortal<T>, opts: BaseDialogConfig & ComponentPortalConfig = {}): SfngDialogRef<any> {
    let position: PositionStrategy = opts?.positionStrategy || this.overlay
      .position()
      .global()
      .centerVertically()
      .centerHorizontally();

    let hasBackdrop = true;
    let backdropClass = 'dialog-screen-backdrop';
    if (opts.backdrop !== undefined) {
      if (opts.backdrop === false) {
        hasBackdrop = false;
      } else if (opts.backdrop === 'light') {
        backdropClass = 'dialog-screen-backdrop-light';
      }
    }

    const cfg = new OverlayConfig({
      scrollStrategy: this.overlay.scrollStrategies.noop(),
      positionStrategy: position,
      hasBackdrop: hasBackdrop,
      backdropClass: backdropClass,
    });
    const overlayref = this.overlay.create(cfg);

    // create our dialog container and attach it to the
    // overlay.
    const containerPortal = new ComponentPortal<SfngDialogContainer<T>>(
      SfngDialogContainer,
      undefined,
      this.injector,
    )
    const containerRef = containerPortal.attach(overlayref);

    if (!!opts.dragable) {
      containerRef.instance.dragable = true;
    }

    // create the dialog ref
    const dialogRef = new SfngDialogRef<T>(overlayref, containerRef.instance);

    // prepare the content portal and attach it to the container
    let result: any;
    if (target instanceof TemplatePortal) {
      result = containerRef.instance.attachTemplatePortal(target)
    } else {
      const contentPortal = new ComponentPortal(target, null, Injector.create({
        providers: [
          {
            provide: SFNG_DIALOG_REF,
            useValue: dialogRef,
          }
        ],
        parent: opts?.injector || this.injector,
      }));
      result = containerRef.instance.attachComponentPortal(contentPortal);
    }
    // update the container position now that we have some content.
    overlayref.updatePosition();

    if (!!opts?.autoclose) {
      overlayref.outsidePointerEvents()
        .pipe(take(1))
        .subscribe(() => dialogRef.close());
      overlayref.keydownEvents()
        .pipe(
          takeUntil(overlayref.detachments()),
          filter(event => event.key === 'Escape')
        )
        .subscribe(() => {
          dialogRef.close();
        })
    }
    return dialogRef;
  }

  confirm(opts: ConfirmDialogConfig): SfngDialogRef<SfngConfirmDialogComponent, string> {
    return this.create(SfngConfirmDialogComponent, {
      autoclose: opts.canCancel,
      injector: Injector.create({
        providers: [
          {
            provide: CONFIRM_DIALOG_CONFIG,
            useValue: opts,
          },
        ],
        parent: this.injector,
      })
    })
  }
}
