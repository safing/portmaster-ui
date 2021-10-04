import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { environment as env } from '../../environments/environment';
import { map, catchError } from 'rxjs/operators';

export interface MetaEndpointParameter {
  Method: string;
  Field: string;
  Value: string;
  Description: string;
}

export interface MetaEndpoint {
  Path: string;
  MimeType: string;
  Read: number;
  Write: number;
  Name: string;
  Description: string;
  Parameters: MetaEndpointParameter[];
}

export interface AuthPermission {
  Read: number;
  Write: number;
  ReadRole: string;
  WriteRole: string;
}

@Injectable({
  providedIn: 'root',
})
export class MetaAPI {
  constructor(private http: HttpClient) { }

  listEndpoints(): Observable<MetaEndpoint[]> {
    return this.http.get<MetaEndpoint[]>(`${env.httpAPI}/v1/endpoints`);
  }

  permissions(): Observable<AuthPermission> {
    return this.http.get<AuthPermission>(`${env.httpAPI}/v1/auth/permissions`);
  }

  login(bearer: string): Observable<boolean>;
  login(username: string, password: string): Observable<boolean>;
  login(usernameOrBearer: string, password?: string): Observable<boolean> {
    let login: Observable<void>;

    if (!!password) {
      login = this.http.get<void>(`${env.httpAPI}/v1/auth/basic`, {
        headers: {
          Authorization: `Basic ${btoa(usernameOrBearer + ':' + password)}`
        }
      });
    } else {
      login = this.http.get<void>(`${env.httpAPI}/v1/auth/bearer`, {
        headers: {
          Authorization: `Bearer ${usernameOrBearer}`
        }
      });
    }

    return login.pipe(
      map(() => true),
      catchError(err => {
        if (err instanceof HttpErrorResponse) {
          if (err.status === 401) {
            return of(false);
          }
        }

        return throwError(err);
      })
    );
  }

  logout(): Observable<void> {
    return this.http.get<void>(`${env.httpAPI}/v1/auth/reset`);
  }
}
