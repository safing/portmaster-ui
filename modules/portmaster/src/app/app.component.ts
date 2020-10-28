import { ChangeDetectorRef, Component, NgZone, OnInit } from '@angular/core';
import { PortapiService } from './services/portapi.service';
import { fadeInAnimation, fadeOutAnimation } from './shared/animations';
import { debounceTime, startWith } from 'rxjs/operators';


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  animations: [
    fadeInAnimation,
    fadeOutAnimation,
  ]
})
export class AppComponent implements OnInit {
  readonly connected = this.portapi.connected$.pipe(
    debounceTime(250),
    startWith(false)
  );
  title = 'portmaster';

  showDebugPanel = false;

  constructor(public ngZone: NgZone,
    public portapi: PortapiService,
    public changeDetectorRef: ChangeDetectorRef) {

    (window as any).portapi = portapi;
    (window as any).toggleDebug = () => {
      // this may be called from outside of angulars execution zone.
      // make sure to call toggle and call inside angular.
      this.ngZone.runGuarded(() => {
        this.showDebugPanel = !this.showDebugPanel;
        this.changeDetectorRef.detectChanges();
      })
    }
  }

  ngOnInit() {
  }
}
