import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { PortapiService } from 'src/app/services/portapi.service';

@Component({
  selector: 'app-navigation',
  templateUrl: './navigation.html',
  styleUrls: ['./navigation.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavigationComponent {
  /** Emits the current portapi connection state on changes. */
  readonly connected$ = this.portapi.connected$;

  constructor(private portapi: PortapiService) { }
}
