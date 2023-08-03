import { Injectable } from "@angular/core";
import { PortapiService, Record } from '@safing/portmaster-api';
import { Observable, of } from "rxjs";
import { catchError } from "rxjs/operators";

export interface UIState extends Record {
  hideExitScreen?: boolean;
  introScreenFinished?: boolean;
  netscoutSortOrder?: string;
}

const defaultState: UIState = {
  hideExitScreen: false,
  introScreenFinished: false,
  netscoutSortOrder: 'A - Z',
}

@Injectable({ providedIn: 'root' })
export class UIStateService {
  constructor(private portapi: PortapiService) { }

  uiState(): Observable<UIState> {
    const key = 'core:ui/v1';
    return this.portapi.get<UIState>(key)
      .pipe(
        catchError(err => of(defaultState))
      )
  }

  saveState(state: UIState): Observable<void> {
    const key = 'core:ui/v1';
    return this.portapi.create(key, state);
  }
}
