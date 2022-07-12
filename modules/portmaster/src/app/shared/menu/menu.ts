import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { CdkOverlayOrigin, ConnectedPosition, ScrollStrategy, ScrollStrategyOptions } from '@angular/cdk/overlay';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ContentChildren, ElementRef, EventEmitter, HostBinding, HostListener, Input, Output, QueryList, Renderer2, ViewChild, ViewEncapsulation } from '@angular/core';
import { fadeInAnimation, fadeOutAnimation } from '../animations';
import { SfngDropdown } from '../dropdown/dropdown';

@Component({
  selector: 'app-menu-trigger',
  templateUrl: './menu-trigger.html',
  styleUrls: ['./menu-trigger.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuTriggerComponent {
  @ViewChild(CdkOverlayOrigin, { static: true })
  origin!: CdkOverlayOrigin;

  @Input()
  menu: MenuComponent | null = null;

  @Input()
  set useContent(v: any) {
    this._useContent = coerceBooleanProperty(v);
  }
  get useContent() { return this._useContent; }
  private _useContent: boolean = false;

  @HostBinding('class.active')
  get isOpen() {
    if (!this.menu) {
      return false;
    }

    return this.menu.dropdown.isOpen;
  }

  constructor(
    public changeDetectorRef: ChangeDetectorRef,
  ) { }

  toggle(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();

    this.menu?.dropdown.toggle(this.origin)
  }
}

@Component({
  selector: 'app-menu-item',
  template: '<ng-content></ng-content>',
  styleUrls: ['./menu-item.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuItemComponent {
  @Input()
  @HostBinding('class.disabled')
  set disabled(v: any) {
    this._disabled = coerceBooleanProperty(v);
  }
  get disabled() { return this._disabled; }
  private _disabled: boolean = false;

  @HostListener('click', ['$event'])
  closeMenu(event: MouseEvent) {
    if (this.disabled) {
      return;
    }
    this.onActivate.next(event);
    this.menu.dropdown.close();
  }

  /**
   * onActivate fires when the menu item is clicked.
   * Use onActivate rather than (click)="" if you want
   * [disabled] to be considered.
   */
  @Output()
  onActivate = new EventEmitter<MouseEvent>();

  constructor(private menu: MenuComponent) { }
}

@Component({
  selector: 'app-menu-group',
  template: '<ng-content></ng-content>',
  styleUrls: ['./menu-group.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuGroupComponent { }

@Component({
  selector: 'app-menu',
  exportAs: 'appMenu',
  templateUrl: './menu.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuComponent {
  @ContentChildren(MenuItemComponent)
  items: QueryList<MenuItemComponent> | null = null;

  @ViewChild(SfngDropdown, { static: true })
  dropdown!: SfngDropdown;

  @Input()
  offsetY?: string | number;

  @Input()
  offsetX?: string | number;

  @Input()
  overlayClass?: string;
}
