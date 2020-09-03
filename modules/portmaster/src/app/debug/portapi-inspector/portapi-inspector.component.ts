import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { PortapiService } from '../../services/portapi.service';

@Component({
  selector: 'app-portapi-inspector',
  templateUrl: './portapi-inspector.component.html',
  styleUrls: ['./portapi-inspector.component.scss']
})
export class PortapiInspectorComponent implements OnInit {
  activeRequests: Observable<any[]>;

  constructor(private portapi: PortapiService) {
    this.activeRequests = this.portapi.activeRequests.pipe(
      map(value => {
        console.log(value);
        return Object.values(value);
      })
    )
  }

  ngOnInit(): void {
  }

  trackRequest(_: number, req: any) {
    return req.id;
  }
}
