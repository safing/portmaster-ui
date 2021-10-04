import { Injectable, TrackByFunction, Version } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { delay, filter, map, multicast, refCount, repeatWhen, timestamp, toArray } from 'rxjs/operators';
import { SecurityLevel, trackById } from './core.types';
import { PortapiService } from './portapi.service';
import { DataReply, RetryableOpts, WatchOpts } from './portapi.types';
import { CoreStatus, Subsystem, VersionStatus } from './status.types';

@Injectable({
  providedIn: 'root'
})
export class StatusService {
  /**
   * A {@link TrackByFunction} from tracking subsystems.
   */
  static trackSubsystem: TrackByFunction<Subsystem> = trackById;
  readonly trackSubsystem = StatusService.trackSubsystem;

  readonly statusPrefix = 'runtime:';
  readonly subsystemPrefix = this.statusPrefix + 'subsystems/';

  /**
   * status$ watches the global core status. It's mutlicasted using a BehaviorSubject so new
   * subscribers will automatically get the latest version while only one subscription
   * to the backend is held.
   */
  readonly status$: Observable<CoreStatus> = this.portapi.qsub<CoreStatus>(`runtime:system/status`)
    .pipe(
      repeatWhen(obs => obs.pipe(delay(2000))),
      map(reply => reply.data),
      multicast(() => {
        return new BehaviorSubject<CoreStatus | null>(null);
      }),
      refCount(),
      filter(value => value !== null),
    ) as Observable<CoreStatus>; // we filtered out the null values but we cannot make that typed with RxJS.

  constructor(private portapi: PortapiService) { }

  /** Returns the currently available versions for all resources. */
  getVersions(): Observable<VersionStatus> {
    return this.portapi.get<VersionStatus>('core:status/versions');
  }

  /**
   * Selectes a new security level. SecurityLevel.Off means that
   * the auto-pilot should take over.
   *
   * @param securityLevel The security level to select
   */
  selectLevel(securityLevel: SecurityLevel): Observable<void> {
    return this.portapi.update(`runtime:system/security-level`, {
      SelectedSecurityLevel: securityLevel,
    });
  }


  /**
   * Loads the current status of a subsystem.
   *
   * @param name The ID of the subsystem
   */
  getSubsystemStatus(id: string): Observable<Subsystem> {
    return this.portapi.get(this.subsystemPrefix + id);
  }

  /**
   * Loads the current status of all subsystems matching idPrefix.
   * If idPrefix is an empty string all subsystems are returned.
   *
   * @param idPrefix An optional ID prefix to limit the returned subsystems
   */
  querySubsystem(idPrefix: string = ''): Observable<Subsystem[]> {
    return this.portapi.query<Subsystem>(this.subsystemPrefix + idPrefix)
      .pipe(
        map(reply => reply.data),
        toArray(),
      );
  }

  /**
   * Watch a subsystem for changes. Completes when the subsystem is
   * deleted. See {@method PortAPI.watch} for more information.
   *
   * @param id The ID of the subsystem to watch.
   * @param opts Additional options for portapi.watch().
   */
  watchSubsystem(id: string, opts?: WatchOpts): Observable<Subsystem> {
    return this.portapi.watch(this.subsystemPrefix + id, opts);
  }

  /**
   * Watch for subsystem changes
   *
   * @param opts Additional options for portapi.sub().
   */
  watchSubsystems(opts?: RetryableOpts): Observable<Subsystem[]> {
    return this.portapi.watchAll<Subsystem>(this.subsystemPrefix, opts);
  }
}
