import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment as env } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class DebugAPI {
  constructor(private http: HttpClient) { }

  ping(): Observable<string> {
    return this.http.get(`${env.httpAPI}/v1/ping`, {
      responseType: 'text'
    })
  }

  getStack(): Observable<string> {
    return this.http.get(`${env.httpAPI}/v1/debug/stack`, {
      responseType: 'text'
    })
  }

  getDebugInfo(style = 'github'): Observable<string> {
    return this.http.get(`${env.httpAPI}/v1/debug/info`, {
      params: {
        style,
      },
      responseType: 'text',
    })
  }
}
