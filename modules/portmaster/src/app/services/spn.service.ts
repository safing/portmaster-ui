import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable } from "rxjs";
import { filter, multicast, publishReplay, refCount, share } from "rxjs/operators";
import { SPNStatus } from ".";
import { PortapiService } from "./portapi.service";
import { Pin } from "./spn.types";

@Injectable({ providedIn: 'root' })
export class SPNService {
  status$: Observable<SPNStatus>;

  constructor(
    private portapi: PortapiService,
  ) {
    this.status$ = this.portapi.watch<SPNStatus>('runtime:spn/status')
      .pipe(
        multicast(() => new BehaviorSubject<any | null>(null)),
        refCount(),
        filter(val => val !== null),
      )
  }

  watchPins(): Observable<Pin[]> {
    return this.portapi.watchAll<Pin>("map:main/")
  }

}
