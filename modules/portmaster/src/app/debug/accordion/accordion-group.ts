import { Component, OnInit, ContentChildren, QueryList, AfterContentInit, OnDestroy } from '@angular/core';
import { AccordionComponent } from './accordion';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-accordion-group',
  templateUrl: './accordion-group.html',
  styleUrls: ['./accordion-group.scss']
})
export class AccordionGroupComponent implements OnInit, AfterContentInit, OnDestroy {
  @ContentChildren(AccordionComponent)
  accordions?: QueryList<AccordionComponent>;

  private subscriptions: Subscription[] = [];

  constructor() { }

  ngOnInit(): void {
  }

  ngAfterContentInit() {
    this.accordions?.forEach(a => {
      this.subscriptions.push(a.activeChange.subscribe(() => {
        console.log(`receive toggle`);

        this.toggle(a);
      }))
    })
  }

  ngOnDestroy() {
    this.subscriptions.forEach(s => s.unsubscribe());
    this.subscriptions = [];
  }

  toggle(a: AccordionComponent) {
    if (!a.active) {
      this.accordions?.forEach(a => a.active = false);
    }

    a.active = !a.active;
  }

}
