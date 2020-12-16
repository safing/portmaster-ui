import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { Component, Input, OnDestroy, TemplateRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { AccordionComponent } from './accordion';

@Component({
  selector: 'app-accordion-group',
  templateUrl: './accordion-group.html',
  styleUrls: ['./accordion-group.scss']
})
export class AccordionGroupComponent implements OnDestroy {
  /** @private Currently registered accordion components */
  accordions: AccordionComponent[] = [];

  /**
   * A template-ref to render as the header for each accordion-component.
   * Receives the accordion data as an $implicit context.
   */
  @Input()
  headerTemplate: TemplateRef<any> | null = null;

  /** Whether or not one or more components can be expanded. */
  @Input()
  set singleMode(v: any) {
    this._singleMode = coerceBooleanProperty(v);
  }
  get singleMode() { return this._singleMode }
  private _singleMode = false;

  /** A list of subscriptions to the activeChange output of the registered accordion-components */
  private subscriptions: Subscription[] = [];

  constructor() { }

  /**
   * Registeres an accordion component to be handled together with this
   * accordion group.
   *
   * @param a The accordion component to register
   */
  register(a: AccordionComponent) {
    this.accordions.push(a);

    // Tell the accordion-component about the default header-template.
    if (!a.headerTemplate) {
      a.headerTemplate = this.headerTemplate;
    }

    // Subscribe to the activeChange output of the registered
    // accordion and call toggle() for each event emitted.
    this.subscriptions.push(a.activeChange.subscribe(() => {
      this.toggle(a);
    }))
  }

  ngOnDestroy() {
    this.subscriptions.forEach(s => s.unsubscribe());
    this.subscriptions = [];
    this.accordions = [];
  }

  /**
   * Expand an accordion component and collaps all others if
   * single-mode is selected.
   *
   * @param a The accordion component to toggle.
   */
  private toggle(a: AccordionComponent) {
    if (!a.active && this._singleMode) {
      this.accordions?.forEach(a => a.active = false);
    }

    a.active = !a.active;
  }

}
