import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AppProfile, FlatConfigObject, flattenProfileConfig, LayeredProfile } from './app-profile.types';
import { PortapiService } from './portapi.service';

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

  /**
   * Returns the database key of a profile
   *
   * @param p The app-profile itself..
   */
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

  /**
   * Load an application profile.
   *
   * @param sourceAndId The full profile ID including source
   */
  getAppProfile(sourceAndId: string): Observable<AppProfile>;

  /**
   * Load an application profile.
   *
   * @param source The source of the profile
   * @param id The ID of the profile
   */
  getAppProfile(source: string, id: string): Observable<AppProfile>;

  getAppProfile(sourceOrSourceAndID: string, id?: string): Observable<AppProfile> {
    let source = sourceOrSourceAndID;
    if (id !== undefined) {
      source += "/" + id
    }
    const key = `core:profiles/${source}`
    return this.getAppProfileFromKey(key);
  }

  /**
   * Loads an application profile by it's database key.
   *
   * @param key The key of the application profile.
   */
  getAppProfileFromKey(key: string): Observable<AppProfile> {
    return this.portapi.get(key)
  }

  /**
   * Loads the global-configuration profile.
   */
  globalConfig(): Observable<FlatConfigObject> {
    return this.getAppProfile('special', 'global-config')
      .pipe(
        map(profile => flattenProfileConfig(profile.Config)),
      )
  }

  /**
   * Watches an application profile for changes.
   *
   * @param source The source of the profile
   * @param id The ID of the profile
   */
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
    profile.LastEdited = Math.floor((new Date()).getTime() / 1000);
    return this.portapi.update(`core:profiles/${profile.Source}/${profile.ID}`, profile);
  }

  /**
   * Watch all application profiles
   */
  watchProfiles(): Observable<AppProfile[]> {
    return this.portapi.watchAll<AppProfile>('core:profiles/')
  }

  watchLayeredProfile(source: string, id: string): Observable<LayeredProfile>;

  /**
   * Watches the layered runtime profile for a given application
   * profile.
   *
   * @param profile The app profile
   */
  watchLayeredProfile(profile: AppProfile): Observable<LayeredProfile>;

  watchLayeredProfile(profileOrSource: string | AppProfile, id?: string): Observable<LayeredProfile> {
    if (typeof profileOrSource == "object") {
      id = profileOrSource.ID;
      profileOrSource = profileOrSource.Source;
    }

    const key = `runtime:layeredProfile/${profileOrSource}/${id}`;
    return this.portapi.watch<LayeredProfile>(key);
  }

  /**
   * Loads the layered runtime profile for a given application
   * profile.
   *
   * @param profile The app profile
   */
  getLayeredProfile(profile: AppProfile): Observable<LayeredProfile> {
    const key = `runtime:layeredProfile/${profile.Source}/${profile.ID}`;
    return this.portapi.get<LayeredProfile>(key);
  }

  /**
   * Delete an application profile.
   *
   * @param profile The profile to delete
   */
  deleteProfile(profile: AppProfile): Observable<void> {
    return this.portapi.delete(`core:profiles/${profile.Source}/${profile.ID}`);
  }
}
