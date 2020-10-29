import { Injectable, Inject } from '@angular/core';
import { PortapiService } from './portapi.service';
import { AppProfile, ConfigMap, FlatConfigObject, flattenProfileConfig } from './app-profile.types';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AppProfileService {
  constructor(private portapi: PortapiService) { }

  getAppProfile(id: string): Observable<AppProfile>;
  getAppProfile(source: string, id: string): Observable<AppProfile>;

  getAppProfile(idOrSource: string, id?: string): Observable<AppProfile> {
    let key = idOrSource;

    if (!!id) {
      key = `core:profiles/${idOrSource}/${id}`;
    }

    return this.portapi.get(key)
  }

  globalConfig(): Observable<FlatConfigObject> {
    return this.getAppProfile('special', 'global-config')
      .pipe(
        map(profile => flattenProfileConfig(profile.Config)),
      )
  }

  watchAppProfile(id: string): Observable<AppProfile>;
  watchAppProfile(source: string, id: string): Observable<AppProfile>;

  watchAppProfile(idOrSource: string, id?: string): Observable<AppProfile> {
    let key = idOrSource;

    if (!!id) {
      key = `core:profiles/${idOrSource}/${id}`;
    }

    return this.portapi.watch(key)
  }

  /** @deprecated use saveProfile instead */
  saveLocalProfile(profile: AppProfile): Observable<void> {
    return this.saveProfile(profile);
  }

  saveProfile(profile: AppProfile): Observable<void> {
    return this.portapi.update(`core:profiles/${profile.Source}/${profile.ID}`, profile);
  }

  watchProfiles(): Observable<AppProfile[]> {
    return this.portapi.watchAll<AppProfile>('core:profiles/')
  }
}
