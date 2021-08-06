import { coerceBooleanProperty, coerceNumberProperty } from '@angular/cdk/coercion';
import { ConnectedPosition } from '@angular/cdk/overlay';
import { _getShadowRoot } from '@angular/cdk/platform';
import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Directive, ElementRef, Host, HostBinding, HostListener, Inject, Injectable, InjectionToken, Injector, Input, isDevMode, NgZone, OnDestroy, OnInit, Optional } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import MyYamlFile, { TipUp, Button } from 'js-yaml-loader!../../../i18n/helptexts.yaml';
import { Observable, of, Subject } from 'rxjs';
import { debounce, debounceTime, filter, map, mergeMap, skip, take, tap, timeout } from 'rxjs/operators';
import { Action, NotificationsService, routingActions } from 'src/app/services';
import { DialogRef, DialogService, DIALOG_REF } from '../dialog';
import { deepCloneNode, extendStyles, matchElementSize, removeNode } from './clone-node';
import { getCssSelector, synchronizeCssStyles } from './css-utils';

export const INFOBOX_TOKEN = new InjectionToken<string>('InfoboxJSONToken');

const withBlurFeature = true;

@Directive({
  selector: '[infoBoxAnchor]',
})
export class InfoBoxAnchorDirective {
  constructor(
    public readonly elementRef: ElementRef,
    private cdr: ChangeDetectorRef,
    private tipupService: InfoBoxService,
  ) { }

  placement: 'left' | 'right' = 'right';
  offset: number = 10;

  @HostBinding('class.active-tipup-anchor')
  isActiveAnchor = false;

  @Input('infoBoxAnchor')
  set position(posSpec: string) {
    const parts = (posSpec || '').split(';')
    if (parts.length > 2) {
      if (isDevMode()) {
        throw new Error(`Invalid value "${posSpec}" for [infoBoxAnchor]`);
      }
      return;
    }

    if (parts[0] === 'left') {
      this.placement = 'left';
    } else {
      this.placement = 'right';
    }

    if (parts.length === 2) {
      this.offset = +parts[1];
      if (isNaN(this.offset)) {
        this.offset = 10;
      }
    } else {
      this.offset = 10;
    }
  }

  @HostBinding('style.zIndex')
  styleZIndex: number | null = null;

  @HostBinding('style.position')
  stylePosition: string | null = null;

  private _preview: HTMLElement | undefined;
  deactivate() {
    this.isActiveAnchor = false;
    if (withBlurFeature) {
      if (!!this._preview) {
        removeNode(this._preview);
        this._preview = undefined;
      }
      //this.styleZIndex = null;
      //this.stylePosition = null;
      //this.cdr.markForCheck();
    }
    this.cdr.markForCheck();
  }

  activate() {
    this.isActiveAnchor = true;
    if (withBlurFeature) {
      //this.stylePosition = 'sticky';
      //this.styleZIndex = 10000;
      //this.cdr.markForCheck();

      this._preview = this.tipupService.createPreview(this.elementRef.nativeElement, this._getShadowRoot());
    }
    this.cdr.markForCheck();
  }

  /**
   * Cached shadow root that the element is placed in. `null` means that the element isn't in
   * the shadow DOM and `undefined` means that it hasn't been resolved yet. Should be read via
   * `_getShadowRoot`, not directly.
   */
  private _cachedShadowRoot: ShadowRoot | null | undefined;

  /**
   * Lazily resolves and returns the shadow root of the element. We do this in a function, rather
   * than saving it in property directly on init, because we want to resolve it as late as possible
   * in order to ensure that the element has been moved into the shadow DOM. Doing it inside the
   * constructor might be too early if the element is inside of something like `ngFor` or `ngIf`.
   */
  private _getShadowRoot(): ShadowRoot | null {
    if (this._cachedShadowRoot === undefined) {
      this._cachedShadowRoot = _getShadowRoot(this.elementRef.nativeElement);
    }
    return this._cachedShadowRoot;
  }
}

@Directive({
  selector: '[infoBoxTrigger]',
})
export class InfoBoxTriggerDirective implements OnDestroy {
  constructor(
    public readonly elementRef: ElementRef,
    public dialog: DialogService,
    @Optional() @Host() public readonly anchor: InfoBoxAnchorDirective,
    private injector: Injector,
    private tipupService: InfoBoxService,
    private cdr: ChangeDetectorRef,
  ) { }

  private dialogRef: DialogRef<InfoBoxComponent> | null = null;

  @Input('infoBoxTrigger')
  set textKey(s: string) {
    if (!!this._textKey) {
      this.tipupService.deregister(this._textKey, this);
    }
    this._textKey = s;
    this.tipupService.register(this._textKey, this);
  }
  get textKey() { return this._textKey; }
  private _textKey: string = '';

  @HostBinding('style.cursor')
  cursor = 'pointer';

  ngOnDestroy() {
    this.tipupService.deregister(this.textKey, this);
  }

  @Input('infoBoxTriggerPassive')
  set passive(v: any) {
    this._passive = coerceBooleanProperty(v);
  }
  get passive() { return this._passive; }
  private _passive = false;

  @HostBinding('class.active-tipup')
  isActiveTipup = false;

  @Input('infoBoxTriggerOffset')
  set offset(v: any) {
    this._defaultOffset = coerceNumberProperty(v)
  }
  get offset() { return this._defaultOffset }
  private _defaultOffset = 20;

  @HostListener('click', ['$event'])
  onClick(event?: MouseEvent): Promise<any> {
    if (!!event) {
      // if there's a click event the user actually clicked the element.
      // we only handle this if we're not marked as passive.
      if (this._passive) {
        return Promise.resolve();
      }

      event.preventDefault();
      event.stopPropagation();
    }

    if (!!this.dialogRef) {
      this.dialogRef.close();
      return Promise.resolve();
    }
    const anchor = this.anchor?.elementRef || this.elementRef;
    if (!anchor) {
      return Promise.resolve();
    }

    const positions: ConnectedPosition[] = [];

    if (!!this.anchor) {
      if (this.anchor.placement === 'left') {
        positions.push({
          originX: 'start',
          originY: 'center',
          overlayX: 'end',
          overlayY: 'center',
        })
      } else {
        positions.push({
          originX: 'end',
          originY: 'center',
          overlayX: 'start',
          overlayY: 'center',
        })
      }
    } else {
      positions.push({
        originX: 'start',
        originY: 'center',
        overlayX: 'start',
        overlayY: 'center',
      })
    }

    let offset = this.anchor?.offset || this.offset;
    if (this.anchor?.placement === 'left') {
      offset *= -1;
    }

    let postitionStrategy = this.dialog.position()
      .flexibleConnectedTo(anchor)
      .withPositions(positions)
      .withDefaultOffsetX(offset);

    const inj = Injector.create({
      providers: [
        {
          useValue: this.textKey,
          provide: INFOBOX_TOKEN,
        }
      ],
      parent: this.injector,
    });
    this.dialogRef = this.dialog.create(InfoBoxComponent, {
      dragable: false,
      autoclose: true,
      backdrop: withBlurFeature ? 'light' : false,
      injector: inj,
      positionStrategy: postitionStrategy
    });

    if (!!this.anchor) {
      this.anchor.activate();
    }

    if (withBlurFeature && !!this.anchor) {
      this.dialogRef.onStateChange
        .pipe(
          filter(state => state === 'closing'),
          take(1)
        )
        .subscribe(() => this.anchor.deactivate());
    }

    this.isActiveTipup = true;
    this.dialogRef.onClose
      .pipe(take(1))
      .subscribe(() => {
        this.dialogRef = null;
        this.isActiveTipup = false;
        this.cdr.markForCheck();

        // wait for an additional 200ms before deactivating the anchor
        // (= unsetting the position and z-index overwrite) so the dialog
        // backdrop can fade out completely.
        if (!!this.anchor && !withBlurFeature) {
          this.anchor.deactivate();
        }
      });

    this.cdr.detectChanges();

    return this.dialogRef.onStateChange
      .pipe(
        filter(state => state === 'opening'),
        take(1),
      )
      .toPromise()
  }
}

@Component({
  templateUrl: './infobox.html',
  styleUrls: ['./infobox.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InfoBoxComponent implements OnInit, TipUp {
  title: string = 'N/A';
  content: string = 'N/A';
  nextKey?: string;
  buttons?: Button[];
  url?: string;
  urlText: string = 'Read More';

  constructor(
    @Inject(INFOBOX_TOKEN) public readonly token: string,
    @Inject(DIALOG_REF) private readonly dialogRef: DialogRef<InfoBoxComponent>,
    private ngZone: NgZone,
    private notificationService: NotificationsService,
    private tipupService: InfoBoxService,
  ) { }

  ngOnInit() {
    const doc = MyYamlFile[this.token];
    if (!!doc) {
      Object.assign(this, doc);
      this.urlText = doc.urlText || 'Read More';
    }
  }

  async next() {
    if (!this.nextKey) {
      return;
    }

    this.dialogRef.close();
    this.tipupService.open(this.nextKey);
  }

  async runAction(btn: Button) {
    await this.notificationService.performAction(btn.action);

    // if we have a nextKey for the button but do not do in-app
    // routing we should be able to open the next tipup as soon
    // as the action finished
    if (!!btn.nextKey) {
      this.dialogRef.close();
      this.tipupService.waitFor(btn.nextKey!)
        .subscribe({
          next: () => {
            this.tipupService.open(btn.nextKey!);
          },
          error: console.error
        })
    }
  }

  close() {
    this.dialogRef.close();
  }
}

@Injectable({
  providedIn: 'root'
})
export class InfoBoxService {
  tipups = new Map<string, InfoBoxTriggerDirective>();

  private _onRegister = new Subject<string>();
  private _onUnregister = new Subject<string>();

  get onRegister(): Observable<string> {
    return this._onRegister.asObservable();
  }

  get onUnregister(): Observable<string> {
    return this._onUnregister.asObservable();
  }

  waitFor(key: string): Observable<void> {
    if (this.tipups.has(key)) {
      return of(undefined);
    }

    return this.onRegister
      .pipe(
        filter(val => val === key),
        debounce(() => this.ngZone.onStable.pipe(skip(1))),
        take(1),
        map(() => { }),
        timeout(5000),
      );
  }

  constructor(
    @Inject(DOCUMENT) private _document: Document,
    private ngZone: NgZone,
  ) { }

  register(key: string, trigger: InfoBoxTriggerDirective) {
    if (this.tipups.has(key)) {
      return;
    }

    this.tipups.set(key, trigger);
    this._onRegister.next(key);
  }

  deregister(key: string, trigger: InfoBoxTriggerDirective) {
    if (this.tipups.get(key) === trigger) {
      this.tipups.delete(key);
      this._onUnregister.next(key);
    }
  }

  createPreview(element: HTMLElement, shadowRoot: ShadowRoot | null): HTMLElement {
    const preview = deepCloneNode(element);
    // clone all CSS styles by applying them directly to the copied
    // nodes. Though, we skip the opacity property because we use that
    // a lot and it makes the preview strange ....
    synchronizeCssStyles(element, preview, new Set([
      'opacity'
    ]));

    // make sure the preview element is at the exact same position
    // as the original one.
    matchElementSize(preview, element.getBoundingClientRect());

    extendStyles(preview.style, {
      // We have to reset the margin, because it can throw off positioning relative to the viewport.
      'margin': '0',
      'position': 'fixed',
      'top': '0',
      'left': '0',
      'z-index': '1000',
      'opacity': '1'
    }, new Set(['position', 'opacity']));

    // We add a dedicated class to the preview element so
    // it can handle special higlighting itself.
    preview.classList.add('infobox-preview')

    // since the user might want to click on the preview element we must
    // intercept the click-event, determine the path to the target element inside
    // the preview and eventually dispatch a click-event on the actual
    // - real - target inside the cloned element.
    preview.onclick = function (event: MouseEvent) {
      let path = getCssSelector(event.target as HTMLElement, preview);
      if (!!path) {
        // find the target by it's CSS path
        let actualTarget: HTMLElement | null = element.querySelector<HTMLElement>(path);

        // some (SVG) elements don't have a direct click() listener so we need to search
        // the parents upwards to find one that implements click().
        // we're basically searching up until we reach the <html> tag.
        //
        // TODO(ppacher): stop searching at the respective root node.
        if (!!actualTarget) {
          let iter: HTMLElement = actualTarget;
          while (iter != null) {
            if ('click' in iter && typeof iter['click'] === 'function') {
              iter.click();
              break;
            }
            iter = iter.parentNode as HTMLElement;
          }
        }
      } else {
        // the user clicked the preview element directly
        try {
          element.click()
        } catch (e) {
          console.error(e);
        }
      }
    }

    this._getPreviewInserationPoint(shadowRoot).appendChild(preview);

    return preview;
  }

  private _getPreviewInserationPoint(shadowRoot: ShadowRoot | null): HTMLElement {
    const documentRef = this._document;
    return shadowRoot ||
      documentRef.fullscreenElement ||
      (documentRef as any).webkitFullscreenElement ||
      (documentRef as any).mozFullScreenElement ||
      (documentRef as any).msFullscreenElement ||
      documentRef.body;
  }

  async open(key: string) {
    const comp = this.tipups.get(key);
    if (!comp) {
      console.error('Tried to open unknown tip-up with key ' + key);
      return;
    }
    comp.onClick()
  }
}
