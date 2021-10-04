import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { Component, OnInit, Input, Output, EventEmitter, HostBinding, TemplateRef, Optional, ChangeDetectionStrategy, TrackByFunction } from '@angular/core';
import { fadeInAnimation, fadeOutAnimation } from '../animations';
import { AccordionGroupComponent } from './accordion-group';

@Component({
  selector: 'app-accordion',
  templateUrl: './accordion.html',
  styleUrls: ['./accordion.scss'],
  exportAs: 'appAccordion',
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    fadeInAnimation,
    fadeOutAnimation
  ]
})
export class AccordionComponent<T = any> implements OnInit {

  /** Whether or not the accordion component starts active. */
  @Input()
  set active(v: any) {
    this._active = coerceBooleanProperty(v);
  }
  get active() {
    return this._active;
  }

  @HostBinding('class.active')
  /** @private Whether or not the accordion should have the 'active' class */
  get activeClass(): string {
    return this.active;
  }

  constructor(@Optional() private group: AccordionGroupComponent) { }
  /** @deprecated in favor of [data] */
  @Input()
  title = '';

  /**
   * The data the accordion component is used for. This is passed as an $implicit context
   * to the header template.
   */
  @Input()
  data: T | undefined = undefined;
  private _active = false;

  /** Emits whenever the active value changes. Supports two-way bindings. */
  @Output()
  activeChange = new EventEmitter<boolean>();

  /**
   * The header-template to render for this component. If null, the default template from
   * the parent accordion-group will be used.
   */
  @Input()
  headerTemplate: TemplateRef<any> | null = null;

  @Input()
  trackBy: TrackByFunction<T | null> = (_, c) => c

  ngOnInit(): void {
    // register at our parent group-component (if any).
    this.group?.register(this);
  }

  /**
   * Toggle the active-state of the accordion-component.
   *
   * @param event The mouse event.
   */
  toggle(event?: Event) {
    event?.preventDefault();
    this.activeChange.emit(!this.active);
  }
}
