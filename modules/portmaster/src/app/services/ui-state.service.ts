import { Injectable } from "@angular/core";
import { Observable, of } from "rxjs";
import { catchError } from "rxjs/operators";
import { PortapiService } from "./portapi.service";
import { Record } from './portapi.types';

export interface UIState extends Record {
  hideExitScreen?: boolean;
  introScreenFinished?: boolean;
}

const defaultState: UIState = {
  hideExitScreen: false,
  introScreenFinished: false
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
