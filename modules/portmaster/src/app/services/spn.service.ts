import { HttpClient, HttpParams, HttpResponse } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable } from "rxjs";
import { filter, multicast, refCount } from "rxjs/operators";
import { environment } from "src/environments/environment";
import { SPNStatus } from ".";
import { PortapiService } from "./portapi.service";
import { Pin, UserProfile } from "./spn.types";

@Injectable({ providedIn: 'root' })
export class SPNService {

  /** Emits the SPN status whenever it changes */
  status$: Observable<SPNStatus>;

  constructor(
    private portapi: PortapiService,
    private http: HttpClient,
  ) {
    this.status$ = this.portapi.watch<SPNStatus>('runtime:spn/status')
      .pipe(
        multicast(() => new BehaviorSubject<any | null>(null)),
        refCount(),
        filter(val => val !== null),
      )
  }

  /**
   * Watches all pins of the "main" SPN map.
   */
  watchPins(): Observable<Pin[]> {
    return this.portapi.watchAll<Pin>("map:main/")
  }

  /**
   *  Logs into the SPN user account
   */
  login({ username, password }: { username: string, password: string }): Observable<HttpResponse<string>> {
    return this.http.post(`${environment.httpAPI}/v1/spn/account/login`, undefined, {
      headers: {
        Authorization: `Basic ${window.btoa(username + ':' + password)}`
      },
      responseType: 'text',
      observe: 'response'
    });
  }

  /**
   * Log out of the SPN user account
   *
   * @param purge Whether or not the portmaster should keep user/device information for the next login
   */
  logout(purge = false): Observable<HttpResponse<string>> {
    let params = new HttpParams();
    if (!!purge) {
      params.set("purge", "true")
    }
    return this.http.delete(`${environment.httpAPI}/v1/spn/account/logout`, {
      params,
      responseType: 'text',
      observe: 'response'
    })
  }

  /**
   * Returns the current SPN user profile.
   *
   * @param refresh Whether or not the user profile should be refreshed from the ticket agent
   * @returns
   */
  userProfile(refresh = false): Observable<UserProfile> {
    let params = new HttpParams();
    if (!!refresh) {
      params = params.set("refresh", true)
    }
    return this.http.get<UserProfile>(`${environment.httpAPI}/v1/spn/account/user/profile`, {
      params
    });
  }
}
