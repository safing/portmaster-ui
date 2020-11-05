import { Injectable, Inject } from '@angular/core';
import { PortapiService } from './portapi.service';
import { AppProfile, ConfigMap, FlatConfigObject, flattenProfileConfig, LayeredProfile } from './app-profile.types';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { keyframes } from '@angular/animations';

@Injectable({
  providedIn: 'root'
})
export class AppProfileService {
  constructor(private portapi: PortapiService) { }

  /**
   * Returns the database key of a profile.
   *
   * @param source The source of the profile.
   * @param id The profile ID.
   */
  getKey(source: string, id: string): string;
  getKey(p: AppProfile): string;
  getKey(idOrSourceOrProfile: string | AppProfile, id?: string): string {
    if (typeof idOrSourceOrProfile === 'object') {
      return this.getKey(idOrSourceOrProfile.Source, idOrSourceOrProfile.ID);
    }

    let key = idOrSourceOrProfile;

    if (!!id) {
      key = `core:profiles/${idOrSourceOrProfile}/${id}`;
    };

    return key;
  }

  getAppProfile(source: string, id: string): Observable<AppProfile> {
    const key = `core:profiles/${source}/${id}`;
    return this.getAppProfileFromKey(key);
  }

  getAppProfileFromKey(key: string): Observable<AppProfile> {
    return this.portapi.get(key)
  }

  globalConfig(): Observable<FlatConfigObject> {
    return this.getAppProfile('special', 'global-config')
      .pipe(
        map(profile => flattenProfileConfig(profile.Config)),
      )
  }

  watchAppProfile(source: string, id: string): Observable<AppProfile> {
    const key = `core:profiles/${source}/${id}`;
    return this.portapi.watch(key)
  }

  /** @deprecated use saveProfile instead */
  saveLocalProfile(profile: AppProfile): Observable<void> {
    return this.saveProfile(profile);
  }

  /**
   * Save an application profile.
   *
   * @param profile The profile to save
   */
  saveProfile(profile: AppProfile): Observable<void> {
    return this.portapi.update(`core:profiles/${profile.Source}/${profile.ID}`, profile);
  }

  /**
   * Watch all application profiles
   */
  watchProfiles(): Observable<AppProfile[]> {
    return this.portapi.watchAll<AppProfile>('core:profiles/')
  }

  getLayeredProfile(profile: AppProfile): Observable<LayeredProfile> {
    const key = `runtime:layeredProfile/${profile.Source}/${profile.ID}`;
    console.log(key);
    return this.portapi.get<LayeredProfile>(key);
  }
}
