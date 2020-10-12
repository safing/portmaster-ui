import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Connection } from './network.types';
import { PortapiService } from './portapi.service';
import { shareBehavior } from './portapi.types';

@Injectable({
  providedIn: 'root'
})
export class NetworkService {
  readonly networkPrefix = "network:";

  readonly all$: Observable<Connection[]> = this.portapi.watchAll<Connection>(this.networkPrefix)
    .pipe(shareBehavior<Connection[]>([]));

  constructor(private portapi: PortapiService) { }
}
