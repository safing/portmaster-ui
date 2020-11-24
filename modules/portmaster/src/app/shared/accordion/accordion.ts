import { Component, OnInit, Input, Output, EventEmitter, HostBinding, TemplateRef, Optional } from '@angular/core';
import { AccordionGroupComponent } from './accordion-group';

@Component({
  selector: 'app-accordion',
  templateUrl: './accordion.html',
  styleUrls: ['./accordion.scss']
})
export class AccordionComponent implements OnInit {
  /** @deprecated in favor of [data] */
  @Input()
  title: string = '';

  @Input()
  data: any = undefined;

  @Input()
  active: boolean = false;

  @Output()
  activeChange = new EventEmitter<boolean>();

  @HostBinding('class')
  get activeClass(): string {
    return this.active ? 'active' : '';
  }

  @Input()
  headerTemplate: TemplateRef<any> | null = null;

  ngOnInit(): void {
    this.group.register(this);
  }

  toggle(event: Event) {
    event.preventDefault();
    this.activeChange.emit(!this.active);
  }

  constructor(@Optional() private group: AccordionGroupComponent) { }
}
