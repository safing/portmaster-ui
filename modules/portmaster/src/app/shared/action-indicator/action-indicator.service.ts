import { Overlay, OverlayConfig, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { Injectable, InjectionToken, Injector } from '@angular/core';
import { BehaviorSubject, interval, Subject } from 'rxjs';
import { take, takeUntil } from 'rxjs/operators';
import { IndicatorComponent } from './indicator';

export interface ActionIndicator {
  title: string;
  message?: string;
  status: 'info' | 'success' | 'error';
  timeout?: number;
}

export const ACTION_REF = new InjectionToken<ActionIndicatorRef>('ActionIndicatorRef')
export class ActionIndicatorRef implements ActionIndicator {
  title: string;
  message?: string;
  status: 'info' | 'success' | 'error';
  timeout?: number;

  onClose = new Subject<void>();
  onCloseReplace = new Subject<void>();

  constructor(opts: ActionIndicator, private _overlayRef: OverlayRef) {
    this.title = opts.title;
    this.message = opts.message;
    this.status = opts.status;
    this.timeout = opts.timeout;
  }

  close() {
    this._overlayRef.detach();
    this.onClose.next();
    this.onClose.complete();
  }
}

@Injectable({ providedIn: 'root' })
export class ActionIndicatorService {
  private _activeIndicatorRef: ActionIndicatorRef | null = null;

  constructor(
    private _injector: Injector,
    private overlay: Overlay,
  ) { }

  info(title: string, message?: string, timeout?: number) {
    this.create({
      title,
      message: this.ensureMessage(message),
      timeout,
      status: 'info'
    })
  }

  error(title: string, message?: string, timeout?: number) {
    this.create({
      title,
      message: this.ensureMessage(message),
      timeout,
      status: 'error'
    })
  }

  success(title: string, message?: string, timeout?: number) {
    this.create({
      title,
      message: this.ensureMessage(message),
      timeout,
      status: 'success'
    })
  }

  /**
   * Creates a new user action indicator.
   *
   * @param msg The action indicator message to show
   */
  async create(msg: ActionIndicator) {
    if (!!this._activeIndicatorRef) {
      this._activeIndicatorRef.onCloseReplace.next();
      await this._activeIndicatorRef.onClose.toPromise();
    }

    const cfg = new OverlayConfig({
      scrollStrategy: this.overlay
        .scrollStrategies.noop(),
      positionStrategy: this.overlay
        .position()
        .global()
        .bottom('2rem')
        .left('5rem'),
    });
    const overlayRef = this.overlay.create(cfg);

    const ref = new ActionIndicatorRef(msg, overlayRef);
    ref.onClose.pipe(take(1)).subscribe(() => {
      if (ref === this._activeIndicatorRef) {
        this._activeIndicatorRef = null;
      }
    })

    // close after the specified time our (or 5000 seconds).
    const timeout = msg.timeout || 5000;
    interval(timeout).pipe(
      takeUntil(ref.onClose),
      take(1),
    ).subscribe(() => {
      ref.close();
    })

    const injector = this.createInjector(ref);
    const portal = new ComponentPortal(
      IndicatorComponent,
      undefined,
      injector
    );
    this._activeIndicatorRef = ref;
    overlayRef.attach(portal);
  }

  /**
   * Creates a new dependency injector that provides msg as
   * ACTION_MESSAGE.
   */
  private createInjector(ref: ActionIndicatorRef): Injector {
    return Injector.create({
      providers: [
        {
          provide: ACTION_REF,
          useValue: ref,
        }
      ],
      parent: this._injector,
    })
  }

  private ensureMessage(msg: string | any): string | undefined {
    if (msg === undefined || msg === null) {
      return undefined;
    }

    if (typeof msg === 'string') {
      return msg;
    }

    if (typeof msg === 'object') {
      if ('toString' in msg) {
        return msg.toString();
      }
      if ('message' in msg) {
        return msg.message;
      }
      if ('error' in msg) {
        return this.ensureMessage(msg.error);
      }
    }

    return JSON.stringify(msg);
  }
}
