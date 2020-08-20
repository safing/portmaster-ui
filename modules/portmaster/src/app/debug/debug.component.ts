import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-debug',
  templateUrl: './debug.component.html',
  styleUrls: ['./debug.component.scss']
})
export class DebugComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {

  }

  toggle() {
    if (!!(window as any)['toggleDebug']) {
      (window as any).toggleDebug();
    }
  }
}
