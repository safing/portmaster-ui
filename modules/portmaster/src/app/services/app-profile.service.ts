import { Injectable, Inject } from '@angular/core';
import { PortapiService } from './portapi.service';
import { AppProfile } from './app-profile.types';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AppProfileService {
  constructor(private portapi: PortapiService) { }

  getAppProfile(id: string): Observable<AppProfile> {
    return this.portapi.get(id)
  }

  watchAppProfile(id: string): Observable<AppProfile> {
    return this.portapi.watch(id)
  }

  saveLocalProfile(profile: AppProfile): Observable<void> {
    return this.portapi.update(`core:profiles/local/${profile.ID}`, profile);
  }
}
