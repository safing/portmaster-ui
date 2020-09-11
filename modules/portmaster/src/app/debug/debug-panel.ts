import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-debug',
  templateUrl: './debug-panel.html',
  styleUrls: ['./debug-panel.scss']
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
