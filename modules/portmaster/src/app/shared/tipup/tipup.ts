import { coerceBooleanProperty, coerceNumberProperty } from '@angular/cdk/coercion';
import { ConnectedPosition } from '@angular/cdk/overlay';
import { _getShadowRoot } from '@angular/cdk/platform';
import { DOCUMENT } from '@angular/common';
import { Renderer2, RendererFactory2 } from '@angular/core';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Directive, ElementRef, HostBinding, HostListener, Inject, Injectable, Injector, Input, NgZone, OnDestroy, Optional } from '@angular/core';
import { Observable, of, Subject } from 'rxjs';
import { debounce, debounceTime, filter, map, skip, take, timeout } from 'rxjs/operators';
import { DialogRef, DialogService } from '../dialog';
import { TipUpAnchorDirective } from './anchor';
import { deepCloneNode, extendStyles, matchElementSize, removeNode } from './clone-node';
import { getCssSelector, synchronizeCssStyles } from './css-utils';
import { TipUpComponent } from './tipup-component';
import { TipupPlacement, TIPUP_TOKEN } from './utils';


@Directive({
  selector: '[tipUpTrigger]',
})
export class TipUpTriggerDirective implements OnDestroy {
  constructor(
    public readonly elementRef: ElementRef,
    public dialog: DialogService,
    @Optional() @Inject(TipUpAnchorDirective) public anchor: TipUpAnchorDirective | ElementRef<any> | HTMLElement,
    private tipupService: TipUpService,
    private cdr: ChangeDetectorRef,
  ) { }

  private dialogRef: DialogRef<TipUpComponent> | null = null;

  /**
   * The helptext token used to search for the tip up defintion.
   */
  @Input('tipUpTrigger')
  set textKey(s: string) {
    if (!!this._textKey) {
      this.tipupService.deregister(this._textKey, this);
    }
    this._textKey = s;
    this.tipupService.register(this._textKey, this);
  }
  get textKey() { return this._textKey; }
  private _textKey: string = '';

  /**
   * The default anchor for the tipup if non is provided via Dependency-Injection
   * or using tipUpAnchorRef
   */
  @Input('tipUpDefaultAnchor')
  defaultAnchor: ElementRef<any> | HTMLElement | null = null;

  /** Optionally overwrite the anchor element received via Dependency Injection */
  @Input('tipUpAnchorRef')
  set anchorRef(ref: ElementRef<any> | HTMLElement | null) {
    this.anchor = ref ?? this.anchor;
  }

  /** Used to ensure all tip-up triggers have a pointer cursor */
  @HostBinding('style.cursor')
  cursor = 'pointer';

  /** De-register ourself upon destroy */
  ngOnDestroy() {
    this.tipupService.deregister(this.textKey, this);
  }

  /** Whether or not we're passive-only and thus do not handle click-events form the user */
  @Input('tipUpPassive')
  set passive(v: any) {
    this._passive = coerceBooleanProperty(v ?? true);
  }
  get passive() { return this._passive; }
  private _passive = false;

  @Input('tipUpOffset')
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

    let anchorElement: ElementRef<any> | HTMLElement | null = this.defaultAnchor || this.elementRef;
    let placement: TipupPlacement | undefined = undefined;

    if (!!this.anchor) {
      if (this.anchor instanceof TipUpAnchorDirective) {
        anchorElement = this.anchor.elementRef;
        placement = this.anchor;
      } else {
        anchorElement = this.anchor;
      }
    }

    this.dialogRef = this.tipupService.createTipup(
      anchorElement,
      this.textKey,
      this,
      placement,
    )

    this.dialogRef.onClose
      .pipe(take(1))
      .subscribe(() => {
        this.dialogRef = null;
        this.cdr.markForCheck();
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
  selector: 'app-tipup',
  template: `<fa-icon
    [icon]="['far', 'question-circle']"
    class="tipup"
    [tipUpTrigger]="key"
    [tipUpDefaultAnchor]="parent"
    [tipUpAnchorRef]="anchor"></fa-icon>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TipUpIconComponent {
  @Input()
  key: string = '';

  @Input('anchor')
  anchor: ElementRef<any> | HTMLElement | null = null;

  constructor(private elementRef: ElementRef<any>) { }

  get parent(): HTMLElement | null {
    return (this.elementRef?.nativeElement as HTMLElement)?.parentElement;
  }
}


@Injectable({
  providedIn: 'root'
})
export class TipUpService {
  tipups = new Map<string, TipUpTriggerDirective>();

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
        debounce(() => this.ngZone.onStable.pipe(skip(2))),
        debounceTime(1000),
        take(1),
        map(() => { }),
        timeout(5000),
      );
  }

  private renderer: Renderer2;

  constructor(
    @Inject(DOCUMENT) private _document: Document,
    private dialog: DialogService,
    private ngZone: NgZone,
    private injector: Injector,
    rendererFactory: RendererFactory2
  ) {
    this.renderer = rendererFactory.createRenderer(null, null)
  }

  register(key: string, trigger: TipUpTriggerDirective) {
    if (this.tipups.has(key)) {
      return;
    }

    this.tipups.set(key, trigger);
    this._onRegister.next(key);
  }

  deregister(key: string, trigger: TipUpTriggerDirective) {
    if (this.tipups.get(key) === trigger) {
      this.tipups.delete(key);
      this._onUnregister.next(key);
    }
  }

  private _latestTipUp: DialogRef<TipUpComponent> | null = null;

  createTipup(
    anchor: HTMLElement | ElementRef<any>,
    key: string,
    origin?: TipUpTriggerDirective,
    opts: TipupPlacement = {},
    injector?: Injector): DialogRef<TipUpComponent> {

    console.log("anchor", anchor);

    if (!!this._latestTipUp) {
      this._latestTipUp.close();
      this._latestTipUp = null;
    }

    // make sure we have an ElementRef to work with
    if (!(anchor instanceof ElementRef)) {
      anchor = new ElementRef(anchor)
    }

    // the the origin placement of the tipup
    const positions: ConnectedPosition[] = [];
    if (opts?.origin === 'left') {
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

    // determine the offset to the tipup origin
    let offset = opts?.offset ?? 10;
    if (opts?.origin === 'left') {
      offset *= -1;
    }

    let postitionStrategy = this.dialog.position()
      .flexibleConnectedTo(anchor)
      .withPositions(positions)
      .withDefaultOffsetX(offset);

    const inj = Injector.create({
      providers: [
        {
          useValue: key,
          provide: TIPUP_TOKEN,
        }
      ],
      parent: injector || this.injector,
    });

    this._latestTipUp = this.dialog.create(TipUpComponent, {
      dragable: false,
      autoclose: true,
      backdrop: 'light',
      injector: inj,
      positionStrategy: postitionStrategy
    });

    const _preview = this._createPreview(anchor.nativeElement, _getShadowRoot(anchor.nativeElement));

    // construct a CSS selector that targets the clicked origin (TipUpTriggerDirective) from within
    // the anchor. We use that path to high light the copy of the trigger-directive in the preview.
    if (!!origin) {
      const originSelector = getCssSelector(origin.elementRef.nativeElement, anchor.nativeElement);
      let target: HTMLElement | null = null;
      if (!!originSelector) {
        target = _preview.querySelector(originSelector);
      } else {
        target = _preview;
      }

      this.renderer.addClass(target, 'active-tipup-trigger')
    }

    this._latestTipUp.onStateChange
      .pipe(
        filter(state => state === 'closing'),
        take(1)
      )
      .subscribe(() => {
        this._latestTipUp = null;
        removeNode(_preview);
      });

    return this._latestTipUp;
  }

  private _createPreview(element: HTMLElement, shadowRoot: ShadowRoot | null): HTMLElement {
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
    preview.classList.add('tipup-preview')

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
