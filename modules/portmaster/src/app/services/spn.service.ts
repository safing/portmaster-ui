import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable, of } from "rxjs";
import { PortapiService } from "./portapi.service";
import { Pin, Lane } from "./spn.types";

const id1: string = 'ZwqVRUxTriN6LZ1cDaRBGSMZKrEJ2HF1TERRQ91h1QMRyY';
const id2: string = 'Zwpg5FoXYVYidzgbdvDyvBBcrArmmHvK9nH3v7KDHiywtt';
const id3: string = 'ZwvTyGpjEELMCWMgyt8GELiBGP4vRyZ56mKy3XMmLGfYCo';
const id4: string = 'id4';

@Injectable({ providedIn: 'root' })
export class SPNService {
  constructor(
    private http: HttpClient,
    private portapi: PortapiService,
  ) { }

  watchPins(): Observable<Pin[]> {
    return this.portapi.watchAll<Pin>("map:main/")
  }
}
