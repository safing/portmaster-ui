import { ConnectedPosition } from '@angular/cdk/overlay';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Directive, ElementRef, Host, HostBinding, HostListener, Inject, InjectionToken, Injector, Input, isDevMode, OnInit, Optional } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import MyYamlFile from 'js-yaml-loader!../../../i18n/helptexts.yaml';
import { take } from 'rxjs/operators';
import { DialogRef, DialogService, DIALOG_REF } from '../dialog';


export const INFOBOX_TOKEN = new InjectionToken<string>('InfoboxJSONToken');

@Directive({
  selector: '[infoBoxAnchor]',
})
export class InfoBoxAnchorDirective {
  constructor(
    public readonly elementRef: ElementRef,
    private cdr: ChangeDetectorRef,
  ) { }

  placement: 'left' | 'right' = 'right';
  offset: number = 10;

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

  deactivate() {
    this.styleZIndex = null;
    this.stylePosition = null;
    this.cdr.markForCheck();
  }

  activate() {
    this.stylePosition = 'sticky';
    this.styleZIndex = 10000;
    this.cdr.markForCheck();
  }
}

@Directive({
  selector: '[infoBoxTrigger]',
})
export class InfoBoxTriggerDirective {
  constructor(
    public readonly elementRef: ElementRef,
    public dialog: DialogService,
    @Optional() @Host() public readonly anchor: InfoBoxAnchorDirective,
    private injector: Injector,
  ) { }

  private dialogRef: DialogRef<InfoBoxComponent> | null = null;

  @Input('infoBoxTrigger')
  textKey: string = '';

  @HostBinding('style.cursor')
  cursor = 'pointer';

  @HostListener('click', ['$event'])
  onClick(event: MouseEvent) {
    if (!!event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (!!this.dialogRef) {
      this.dialogRef.close();
      return;
    }
    const anchor = this.anchor?.elementRef || this.elementRef;
    if (!anchor) {
      return;
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
      .withDefaultOffsetX(this.anchor?.offset || 0);

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
      backdrop: 'light',
      injector: inj,
      positionStrategy: postitionStrategy
    });

    if (!!this.anchor) {
      this.anchor.activate();
    }

    this.dialogRef.onClose
      .pipe(take(1))
      .subscribe(() => {
        this.dialogRef = null;
        // wait for an additional 200ms before deactivating the anchor
        // (= unsetting the position and z-index overwrite) so the dialog
        // backdrop can fade out completely.
        if (!!this.anchor) {
          setTimeout(() => {
            this.anchor.deactivate();
          }, 200)
        }
      });
  }
}

@Component({
  templateUrl: './infobox.html',
  styleUrls: ['./infobox.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InfoBoxComponent implements OnInit {
  header: string = 'N/A';
  message: string = 'N/A';
  link: string | null = null;
  linkText: string = 'Read More';

  constructor(
    @Inject(INFOBOX_TOKEN) public readonly token: string,
    @Inject(DIALOG_REF) private readonly dialogRef: DialogRef<InfoBoxComponent>,
    private domSanitizer: DomSanitizer,
  ) { }

  ngOnInit() {
    const doc = MyYamlFile[this.token];
    if (!!doc) {
      this.header = doc.title;
      this.message = doc.content;
      this.link = !!doc.url
        ? doc.url
        : null;
      this.linkText = doc.urlText || 'Read More';
    }
  }

  close() {
    this.dialogRef.close();
  }
}
