import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ContentChildren, HostBinding, HostListener, Input, QueryList, Renderer2, TemplateRef, ViewChild, ViewEncapsulation } from '@angular/core';
import { CdkOverlayOrigin, ConnectedPosition, ScrollStrategy, ScrollStrategyOptions } from '@angular/cdk/overlay';
import { fadeInAnimation, fadeOutAnimation } from '../animations';
import { BehaviorSubject } from 'rxjs';

@Component({
  selector: 'app-menu-trigger',
  templateUrl: './menu-trigger.html',
  styleUrls: ['./menu-trigger.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuTriggerComponent {
  @ViewChild(CdkOverlayOrigin, { static: true })
  origin: CdkOverlayOrigin | null = null;

  @Input()
  menu: MenuComponent | null = null;

  @HostBinding('class.active')
  get isOpen() {
    if (!this.menu) {
      return false;
    }

    return this.menu.isOpen;
  }

  constructor(public changeDetectorRef: ChangeDetectorRef) { }

  toggle(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();

    if (!this.menu) {
      return;
    }

    if (this.menu.isOpen) {
      this.menu.close();
      return;
    }

    this.menu.show(this);
  }
}

@Component({
  selector: 'app-menu-item',
  template: '<ng-content></ng-content>',
})
export class MenuItemComponent {
  @ViewChild(TemplateRef, { static: true })
  templateRef: TemplateRef<any> | null = null;
}

@Component({
  selector: 'app-menu',
  exportAs: 'appMenu',
  templateUrl: './menu.html',
  styleUrls: ['./menu.scss'],
  encapsulation: ViewEncapsulation.None,
  animations: [
    fadeInAnimation,
    fadeOutAnimation,
  ]
})
export class MenuComponent {
  @ContentChildren(MenuItemComponent)
  items: QueryList<MenuItemComponent> | null = null;

  scrollStrategy: ScrollStrategy;

  positions: ConnectedPosition[] = [
    {
      originX: 'end',
      originY: 'bottom',
      overlayX: 'end',
      overlayY: 'top',
    },
    {
      originX: 'end',
      originY: 'top',
      overlayX: 'end',
      overlayY: 'bottom',
    },
  ]

  trigger: MenuTriggerComponent | null = null;

  isOpen = false;

  onOverlayClosed() {
    this.close()
  }

  onOutsideClick(event: MouseEvent) {
    if (!!this.trigger) {
      const triggerEl = this.trigger.origin!.elementRef.nativeElement;

      let node = event.target;
      while (!!node) {
        if (node === triggerEl) {
          return;
        }
        node = this.renderer.parentNode(node);
      }
    }

    this.close();
  }

  constructor(
    scrollOptions: ScrollStrategyOptions,
    private renderer: Renderer2,
  ) {
    this.scrollStrategy = scrollOptions.close();
  }

  close() {
    this.isOpen = false;
    if (!!this.trigger) {
      this.trigger.changeDetectorRef.markForCheck();
    }
  }

  show(t: MenuTriggerComponent | null) {
    if (this.isOpen) {
      return;
    }

    if (!!t) {
      this.trigger = t;
    }
    this.isOpen = true;
  }
}
