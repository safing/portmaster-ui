import { Component, OnInit, ContentChildren, QueryList, AfterContentInit, OnDestroy, Input, forwardRef, TemplateRef, EventEmitter } from '@angular/core';
import { AccordionComponent } from './accordion';
import { Subscription } from 'rxjs';
import { coerceBooleanProperty } from '@angular/cdk/coercion';

@Component({
  selector: 'app-accordion-group',
  templateUrl: './accordion-group.html',
  styleUrls: ['./accordion-group.scss']
})
export class AccordionGroupComponent implements OnInit, AfterContentInit, OnDestroy {
  accordions: AccordionComponent[] = [];

  @Input()
  headerTemplate: TemplateRef<any> | null = null;

  @Input()
  set singleMode(v: any) {
    this._singleMode = coerceBooleanProperty(v);
  }
  get singleMode() { return this._singleMode }
  private _singleMode = false;

  private subscriptions: Subscription[] = [];

  constructor() { }

  ngOnInit(): void {
  }

  ngAfterContentInit() {
  }

  register(a: AccordionComponent) {
    this.accordions.push(a);
    if (!a.headerTemplate) {
      a.headerTemplate = this.headerTemplate;
    }
    this.subscriptions.push(a.activeChange.subscribe(() => {
      this.toggle(a);
    }))
  }

  ngOnDestroy() {
    this.subscriptions.forEach(s => s.unsubscribe());
    this.subscriptions = [];
    this.accordions = [];
  }

  toggle(a: AccordionComponent) {
    if (!a.active && this._singleMode) {
      this.accordions?.forEach(a => a.active = false);
    }

    a.active = !a.active;
  }

}
