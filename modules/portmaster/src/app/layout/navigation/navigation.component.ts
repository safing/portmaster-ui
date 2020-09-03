import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { PortapiService } from 'src/app/services/portapi.service';

@Component({
  selector: 'app-navigation',
  templateUrl: './navigation.component.html',
  styleUrls: ['./navigation.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavigationComponent implements OnInit {
  readonly connected$ = this.portapi.connected$;

  constructor(private portapi: PortapiService) { }

  ngOnInit(): void {
  }

}
