import { HttpClient, HttpParams, HttpResponse } from "@angular/common/http";
import { Inject, Injectable } from "@angular/core";
import { BehaviorSubject, Observable } from "rxjs";
import { filter, map, multicast, refCount, share } from "rxjs/operators";
import { PORTMASTER_HTTP_API_ENDPOINT, PortapiService } from './portapi.service';
import { Pin, SPNStatus, UserProfile } from "./spn.types";

@Injectable({ providedIn: 'root' })
export class SPNService {

  /** Emits the SPN status whenever it changes */
  status$: Observable<SPNStatus>;

  profile$ = this.watchProfile()
    .pipe(
      share()
    );

  constructor(
    private portapi: PortapiService,
    private http: HttpClient,
    @Inject(PORTMASTER_HTTP_API_ENDPOINT) private httpAPI: string,
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
   * Encodes a unicode string to base64.
   * See https://developer.mozilla.org/en-US/docs/Web/API/btoa
   * and https://stackoverflow.com/questions/30106476/using-javascripts-atob-to-decode-base64-doesnt-properly-decode-utf-8-strings
   */
  b64EncodeUnicode(str: string): string {
    return window.btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function (match, p1) {
      return String.fromCharCode(parseInt(p1, 16))
    }))
  }

  /**
   *  Logs into the SPN user account
   */
  login({ username, password }: { username: string, password: string }): Observable<HttpResponse<string>> {
    return this.http.post(`${this.httpAPI}/v1/spn/account/login`, undefined, {
      headers: {
        Authorization: `Basic ${this.b64EncodeUnicode(username + ':' + password)}`
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
    return this.http.delete(`${this.httpAPI}/v1/spn/account/logout`, {
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
    return this.http.get<UserProfile>(`${this.httpAPI}/v1/spn/account/user/profile`, {
      params
    });
  }

  /**
   * Watches the user profile. It will emit null if there is no profile available yet.
   */
  watchProfile(): Observable<UserProfile | null> {
    let hasSent = false;
    return this.portapi.watch<UserProfile>('core:spn/account/user', {}, { forwardDone: true })
      .pipe(
        filter(result => {
          if ('type' in result && result.type === 'done') {
            if (hasSent) {
              return false;
            }
          }

          return true
        }),
        map(result => {
          hasSent = true;
          if ('type' in result) {
            return null;
          }

          return result;
        })
      );
  }
}
