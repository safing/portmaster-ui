import { Injectable, isDevMode } from '@angular/core';
import { AppProfile, GeoCoordinates, IntelEntity, Netquery, Pin, SPNService, UnknownLocation, getPinCoords } from '@safing/portmaster-api';
import { BehaviorSubject, Observable, combineLatest, debounceTime, interval, of, startWith, switchMap } from 'rxjs';
import { distinctUntilChanged, filter, map, share } from 'rxjs/operators';
import { SPNStatus } from './../../../../projects/safing/portmaster-api/src/lib/spn.types';

export interface MapPin {
  pin: Pin;
  // location is set to the geo-coordinates that should be used
  // for that pin.
  location: GeoCoordinates;
  // entity is set to the intel entity that should be used for
  // this pin.
  entity: IntelEntity;

  // whether or not the pin is currently used as an exit node
  isExit: boolean;

  // whether or not the pin is used as a transit node
  isTransit: boolean;

  // whether or not the pin is currently active.
  isActive: boolean;

  // whether or not the pin is used as the entry-node.
  isHome: boolean;

  // FIXME: remove me
  collapsed?: boolean;
}

@Injectable({ providedIn: 'root' })
export class MapService {
  /**
   * activeSince$ emits the pre-formatted duration since the SPN is active
   * it formats the duration as "HH:MM:SS" or null if the SPN is not enabled.
   */
  activeSince$: Observable<string | null>;

  /** Emits the current status of the SPN */
  status$: Observable<SPNStatus['Status']>;

  /** Emits all map pins */
  _pins$ = new BehaviorSubject<MapPin[]>([]);

  get pins$(): Observable<MapPin[]> {
    return this._pins$.asObservable();
  }

  pinsMap$ = this.pins$
    .pipe(
      filter(allPins => !!allPins.length),
      map(allPins => {
        const lm = new Map<string, MapPin>();
        allPins.forEach(pin => lm.set(pin.pin.ID, pin));

        return lm
      }),
      share(),
    )

  constructor(
    private spnService: SPNService,
    private netquery: Netquery,
  ) {
    this.status$ = this.spnService
      .status$
      .pipe(
        map(status => !!status ? status.Status : 'disabled'),
        distinctUntilChanged()
      );

    // setup the activeSince$ observable that emits every second how long the
    // SPN has been active.
    this.activeSince$ = combineLatest([
      this.spnService.status$,
      interval(1000).pipe(startWith(-1))
    ]).pipe(
      map(([status]) => !!status.ConnectedSince ? this.formatActiveSinceDate(status.ConnectedSince) : null),
      share(),
    );

    let pinMap = new Map<string, MapPin>();
    let pinResult: MapPin[] = [];

    // create a stream of pin updates from the SPN service if it is enabled.
    this.status$
      .pipe(
        switchMap(status => {
          if (status !== 'disabled') {
            return combineLatest([
              this.spnService.watchPins(),
              interval(5000)
                .pipe(
                  startWith(-1),
                  switchMap(() => this.getPinIDsUsedAsExit())
                )
            ])
          }
          return of([[], []]);
        }),
        map(([pins, exitPinIDs]) => {
          const exitPins = new Set(exitPinIDs);
          const activePins = new Set<string>();
          const transitPins = new Set<string>();
          const seenPinIDs = new Set<string>();

          let hasChanges = false;

          pins.forEach(pin => pin.Route?.forEach((hop, index) => {
            if (index < pin.Route!.length - 1) {
              transitPins.add(hop)
            }

            activePins.add(hop);
          }));

          pins.forEach(pin => {
            const oldPinModel = pinMap.get(pin.ID);
            const isExit = exitPins.has(pin.ID);
            const isActive = activePins.has(pin.ID);
            const isTransit = transitPins.has(pin.ID)

            const pinHasChanged = !oldPinModel || oldPinModel.pin !== pin || oldPinModel.isExit !== isExit || oldPinModel.isActive !== isActive || oldPinModel.isTransit !== isTransit;
            seenPinIDs.add(pin.ID);

            if (pinHasChanged) {
              const newPinModel: MapPin = {
                pin: pin,
                location: getPinCoords(pin) || UnknownLocation,
                entity: (pin.EntityV4 || pin.EntityV6)!,
                isExit: exitPins.has(pin.ID),
                isTransit: isTransit,
                isActive: activePins.has(pin.ID),
                isHome: pin.HopDistance === 1,
              }

              pinMap.set(pin.ID, newPinModel);

              hasChanges = true;
              if (isDevMode()) {
                console.log(`[DEBUG] Pin ${pin.ID} has changed`)
              }
            }
          })

          for (let key of pinMap.keys()) {
            if (!seenPinIDs.has(key)) {
              // this pin has been removed
              pinMap.delete(key)
              hasChanges = true;
              if (isDevMode()) {
                console.log(`[DEBUG] Pin ${key} has been removed`)
              }
            }
          }

          if (hasChanges) {
            if (isDevMode()) {
              console.log(`[DEBUG] Received pin updates`)
            }
            pinResult = Array.from(pinMap.values());
          }

          return pinResult;
        }),
        debounceTime(10),
        distinctUntilChanged(),
      )
      .subscribe(pins => this._pins$.next(pins))

  }

  getExitPinIDsForProfile(profile: AppProfile) {
    return this.netquery
      .query({
        select: ['exit_node'],
        groupBy: ['exit_node'],
        query: {
          profile: { $eq: `${profile.Source}/${profile.ID}` },
        }
      })
      .pipe(map(result => result.map(row => row.exit_node!)))
  }

  getPinIDsWithActiveSession() {
    return this.pins$
      .pipe(
        map(result => result.filter(pin => pin.pin.SessionActive).map(pin => pin.pin.ID))
      )
  }

  getPinIDsUsedAsExit() {
    return this.netquery
      .query({
        select: ['exit_node'],
        groupBy: ['exit_node']
      })
      .pipe(
        map(result => result.map(row => row.exit_node!))
      )
  }

  getPinIDsWithActiveConnections() {
    return this.netquery.query({
      select: ['exit_node'],
      groupBy: ['exit_node'],
      query: {
        active: { $eq: true }
      }
    })
      .pipe(
        map(activeExitNodes => {
          const pins = this._pins$.getValue();

          const pinIDs = new Set<string>();
          const pinLookupMap = new Map<string, MapPin>();

          pins.forEach(p => pinLookupMap.set(p.pin.ID, p))

          activeExitNodes.map(row => {
            const pin = pinLookupMap.get(row.exit_node!);
            if (!!pin) {
              pin.pin.Route?.forEach(hop => {
                pinIDs.add(hop)
              })
            }
          })

          return Array.from(pinIDs);
        })
      )
  }

  private formatActiveSinceDate(date: string): string {
    const d = new Date(date);
    const diff = Math.floor((new Date().getTime() - d.getTime()) / 1000);
    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff - (hours * 3600)) / 60);
    const secs = diff - (hours * 3600) - (minutes * 60);
    const pad = (d: number) => d < 10 ? `0${d}` : '' + d;

    return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
  }
}
