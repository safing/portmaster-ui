import { coerceBooleanProperty, coerceNumberProperty } from '@angular/cdk/coercion';
import { ConnectedPosition } from '@angular/cdk/overlay';
import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Directive, ElementRef, Host, HostBinding, HostListener, Inject, Injectable, InjectionToken, Injector, Input, isDevMode, OnDestroy, OnInit, Optional } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import MyYamlFile, { TipUp } from 'js-yaml-loader!../../../i18n/helptexts.yaml';
import { filter, take } from 'rxjs/operators';
import { Action } from 'src/app/services';
import { DialogRef, DialogService, DIALOG_REF } from '../dialog';
import { deepCloneNode, extendStyles, matchElementSize, removeNode } from './clone-node';

export const INFOBOX_TOKEN = new InjectionToken<string>('InfoboxJSONToken');

const withBlurFeature = false;

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

      this._preview = this.tipupService.createPreview(this.elementRef.nativeElement);
    }
    this.cdr.markForCheck();
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

    let postitionStrategy = this.dialog.position()
      .flexibleConnectedTo(anchor)
      .withPositions(positions)
      .withDefaultOffsetX(this.anchor?.offset || this.offset);

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
        if (!!this.anchor) {
          if (withBlurFeature) {
            setTimeout(() => {
              this.anchor.deactivate();
            }, 200)
          } else {
            this.anchor.deactivate();
          }
        }
      });

    this.cdr.markForCheck();

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
  actions?: Action[];
  url?: string;
  urlText: string = 'Read More';

  constructor(
    @Inject(INFOBOX_TOKEN) public readonly token: string,
    @Inject(DIALOG_REF) private readonly dialogRef: DialogRef<InfoBoxComponent>,
    private domSanitizer: DomSanitizer,
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

    await this.tipupService.open(this.nextKey);
    this.dialogRef.close();
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

  constructor(
    @Inject(DOCUMENT) private _document: Document
  ) { }

  register(key: string, trigger: InfoBoxTriggerDirective) {
    this.tipups.set(key, trigger);
  }

  deregister(key: string, trigger: InfoBoxTriggerDirective) {
    if (this.tipups.get(key) === trigger) {
      this.tipups.delete(key);
    }
  }

  createPreview(element: HTMLElement): HTMLElement {
    const preview = deepCloneNode(element);
    matchElementSize(preview, element.getBoundingClientRect());

    extendStyles(preview.style, {
      'pointer-events': 'none',
      // We have to reset the margin, because it can throw off positioning relative to the viewport.
      'margin': '0',
      'position': 'fixed',
      'top': '0',
      'left': '0',
      'z-index': '1000',
    }, new Set());

    this._getPreviewInserationPoint().appendChild(preview);

    return preview;
  }

  private _getPreviewInserationPoint(): HTMLElement {
    const documentRef = this._document;
    return documentRef.fullscreenElement ||
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
    await comp.onClick()
  }
}
