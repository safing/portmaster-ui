import { Component, OnInit, Input, Output, EventEmitter, HostBinding } from '@angular/core';

@Component({
  selector: 'app-accordion',
  templateUrl: './accordion.html',
  styleUrls: ['./accordion.scss']
})
export class AccordionComponent implements OnInit {
  @Input()
  title: string = '';

  @Input()
  active: boolean = false;

  @Output()
  activeChange = new EventEmitter<boolean>();

  @HostBinding('class')
  get activeClass(): string {
    return this.active ? 'active' : '';
  }

  ngOnInit(): void {
  }

  toggle(event: Event) {
    event.preventDefault();
    console.log(`new `, !this.active);
    this.activeChange.emit(!this.active);
  }
}
