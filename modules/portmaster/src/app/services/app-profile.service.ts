import { Injectable, Inject } from '@angular/core';
import { PortapiService } from './portapi.service';
import { AppProfile } from './app-profile.types';

@Injectable({
  providedIn: 'root'
})
export class AppProfileSerivice {
  constructor(private portapi: PortapiService) { }
}
