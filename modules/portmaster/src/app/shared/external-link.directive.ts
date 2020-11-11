import {
  Directive,
  HostBinding,
  PLATFORM_ID,
  Inject,
  Input,
  HostListener
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Directive({
  selector: 'a[href]'
})
export class ExternalLinkDirective {
  @HostBinding('attr.rel')
  relAttr = '';

  @HostBinding('attr.target')
  targetAttr = '';

  @HostBinding('attr.href')
  hrefAttr = '';

  @Input()
  href: string = '';

  constructor(@Inject(PLATFORM_ID) private platformId: string) { }

  @HostListener('click', ['$event'])
  onClick(event: Event) {
    if (!window.app) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    window.app.openExternal(this.href);
  }

  ngOnChanges() {
    this.hrefAttr = this.href;

    if (this.isLinkExternal()) {
      this.relAttr = 'noopener';
      this.targetAttr = '_blank';
    }
  }

  private isLinkExternal() {
    return (
      isPlatformBrowser(this.platformId) &&
      !this.href.includes(location.hostname)
    );
  }
}
