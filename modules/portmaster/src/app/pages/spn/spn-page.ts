import { coerceElement } from "@angular/cdk/coercion";
import { Overlay, OverlayContainer } from "@angular/cdk/overlay";
import { ComponentPortal } from '@angular/cdk/portal';
import { HttpClient } from '@angular/common/http';
import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ComponentRef, DestroyRef, ElementRef, Inject, Injectable, InjectionToken, Injector, OnDestroy, OnInit, QueryList, TemplateRef, ViewChild, ViewChildren, inject } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { ActivatedRoute, ParamMap, Router } from "@angular/router";
import { AppProfile, ConfigService, Connection, ExpertiseLevel, GeoCoordinates, Netquery, PORTMASTER_HTTP_API_ENDPOINT, PortapiService, SPNService, SPNStatus, UserProfile } from "@safing/portmaster-api";
import { SfngDialogService } from "@safing/ui";
import { Observable, Subscription, combineLatest, interval, of } from "rxjs";
import { catchError, debounceTime, map, mergeMap, share, startWith, switchMap, take, takeUntil, withLatestFrom } from "rxjs/operators";
import { fadeInAnimation, fadeInListAnimation, fadeOutAnimation } from "src/app/shared/animations";
import { ExpertiseService } from "src/app/shared/expertise/expertise.service";
import { SPNAccountDetailsComponent } from "src/app/shared/spn-account-details";
import { CountryDetailsComponent } from "./country-details";
import { CountryEvent, MapRendererComponent, Path, PinEvent } from "./map-renderer/map-renderer";
import { MapPin, MapService } from "./map.service";
import { PinDetailsComponent } from "./pin-details";
import { PinOverlayComponent } from "./pin-overlay";
import { OVERLAY_REF } from './utils';

export const MapOverlay = new InjectionToken<Overlay>('MAP_OVERLAY')

/**
 * A custom class that implements the OverlayContainer interface of CDK. This
 * is used so we can configure a custom container element that will hold all overlays created
 * by the map component. This way the overlays will be bound to the map container and not overflow
 * the sidebar or other overlays that are created by the "root" app.
 */
@Injectable()
class MapOverlayContainer {
  private _overlayContainer?: HTMLElement;

  setOverlayContainer(element: ElementRef<HTMLElement> | HTMLElement) {
    this._overlayContainer = coerceElement(element);
  }

  getContainerElement(): HTMLElement {
    if (!this._overlayContainer) {
      throw new Error("Overlay container element not initialized. Call setOverlayContainer first.")
    }

    return this._overlayContainer;
  }
}

@Component({
  templateUrl: './spn-page.html',
  styleUrls: ['./spn-page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    MapOverlayContainer,
    { provide: MapOverlay, useClass: Overlay },
    { provide: OverlayContainer, useExisting: MapOverlayContainer },
  ],
  animations: [
    fadeInListAnimation,
    fadeInAnimation,
    fadeOutAnimation
  ]
})
export class SpnPageComponent implements OnInit, OnDestroy, AfterViewInit {
  private destroyRef = inject(DestroyRef);

  private countryDebounceTimer: any | null = null;

  /** a list of opened country details. required to close them on destry */
  private openedCountryDetails: CountryDetailsComponent[] = [];

  paths: Path[] = [];

  @ViewChild('overlayContainer', { static: true, read: ElementRef })
  overlayContainer!: ElementRef<HTMLElement>;

  @ViewChild(MapRendererComponent, { static: true })
  mapRenderer!: MapRendererComponent;

  @ViewChild('accountDetails', { read: TemplateRef, static: true })
  accountDetails: TemplateRef<any> | null = null;

  /** A list of pro-tip templates in our view */
  @ViewChildren('proTip', { read: TemplateRef })
  proTipTemplates!: QueryList<TemplateRef<any>>;

  /** The selected pro-tip template */
  proTipTemplate: TemplateRef<any> | null = null;

  /** currentUser holds the current SPN user profile if any */
  currentUser: UserProfile | null = null;

  /** An observable that emits all active processes. */
  activeProfiles$: Observable<AppProfile[]>;

  /** Whether or not we are still waiting for all data in order to satisfy a "show process/pin" request by query-params */
  loading = true;

  /** a list of currently selected pins */
  selectedPins: PinOverlayComponent[] = [];

  /** the currently hovered country, if any */
  hoveredCountry: {
    countryName: string;
    countryCode: string;
  } | null = null;

  liveMode = false;
  liveModePaths: Path[] = [];

  private liveModeSubscription = Subscription.EMPTY;

  countryCenters: { [key: string]: GeoCoordinates } = {};

  /**
   * spnStatusTranslation translates the spn status to the text that is displayed
   * at the view
   */
  readonly spnStatusTranslation: Readonly<Record<SPNStatus['Status'], string>> = {
    connected: 'Connected',
    connecting: 'Connecting',
    disabled: 'Disabled',
    failed: 'Failure'
  }

  constructor(
    private configService: ConfigService,
    private spnService: SPNService,
    private netquery: Netquery,
    private expertiseService: ExpertiseService,
    private router: Router,
    private route: ActivatedRoute,
    private portapi: PortapiService,
    @Inject(PORTMASTER_HTTP_API_ENDPOINT) private httpAPI: string,
    private http: HttpClient,
    public mapService: MapService,
    @Inject(MapOverlay) private mapOverlay: Overlay,
    private dialog: SfngDialogService,
    private overlayContainerService: MapOverlayContainer,
    private cdr: ChangeDetectorRef,
    private injector: Injector,
  ) {
    this.activeProfiles$ = interval(5000)
      .pipe(
        startWith(-1),
        switchMap(() => this.netquery.getActiveProfiles()),
        share()
      )
  }

  ngAfterViewInit() {
    // configure our custom overlay container
    this.overlayContainerService.setOverlayContainer(this.overlayContainer);

    // Select a random "Pro-Tip" template and run change detection
    this.proTipTemplate = this.proTipTemplates.get(Math.floor(Math.random() * this.proTipTemplates.length)) || null;
    this.cdr.detectChanges();
  }

  openAccountDetails() {
    this.dialog.create(SPNAccountDetailsComponent, {
      autoclose: true,
      backdrop: 'light'
    })
  }

  ngOnInit() {
    // load country center data
    this.http.get<typeof this['countryCenters']>(`${this.httpAPI}/v1/intel/geoip/country-centers`)
      .subscribe(centers => this.countryCenters = centers);

    this.spnService
      .watchProfile()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => of(null))
      )
      .subscribe((user: UserProfile | null) => {
        if (user?.state !== '') {
          this.currentUser = user || null;
        } else {
          this.currentUser = null;
        }

        this.cdr.markForCheck();
      })

    let previousQueryMap: ParamMap | null = null;

    combineLatest([
      this.route.queryParamMap,
      this.mapService.pins$,
      this.activeProfiles$,
    ])
      .pipe(
        takeUntilDestroyed(this.destroyRef),
      ).subscribe(([params, pins, profiles]) => {
        if (params !== previousQueryMap) {
          const app = params.get("app")
          if (!!app) {
            const profile = profiles.find(p => `${p.Source}/${p.ID}` === app);
            if (!!profile) {
              const pinID = params.get("pin")
              const pin = pins.find(p => p.pin.ID === pinID);

              this.selectGroup(profile, pin)
            }
          }

          previousQueryMap = params;
        }

        // we're done with everything now.
        this.loading = false;
      })

  }

  toggleLiveMode(enabled: boolean) {
    this.liveMode = enabled;

    if (!enabled) {
      this.liveModeSubscription.unsubscribe();
      this.liveModePaths = [];
      this.updatePaths([]);
      this.cdr.markForCheck();

      return;
    }

    this.liveModeSubscription = this.portapi.watchAll<Connection>("network:tree")
      .pipe(
        withLatestFrom(this.mapService.pinsMap$),
        takeUntilDestroyed(this.destroyRef),
        debounceTime(100),
      )
      .subscribe(([connections, mapPins]) => {
        connections = connections.filter(conn => conn.Ended === 0 && !!conn.TunnelContext);

        this.liveModePaths = connections.map(conn => {
          const points: (MapPin | [number, number])[] = conn.TunnelContext!.Path.map(hop => mapPins.get(hop.ID)!)

          if (!!conn.Entity.Coordinates) {
            points.push([conn.Entity.Coordinates.Longitude, conn.Entity.Coordinates.Latitude])
          } else {
            if (!!conn.Entity.Country) {
              const coords = this.countryCenters[conn.Entity.Country.toUpperCase()]
              if (!!coords) {
                points.push([coords.Longitude, coords.Latitude])
              }
            }
          }

          return {
            id: conn.Entity.Domain || conn.ID,
            points: points,
            attributes: {
              'is-live': 'true',
              'is-encrypted': `${conn.Encrypted}`
            }
          }
        })

        this.updatePaths([])
        this.cdr.markForCheck();
      })
  }

  /**
   * Toggle the spn/enable setting. This does NOT update the view as that
   * will happen as soon as we get an update from the db qsub.
   *
   * @private - template only
   */
  toggleSPN() {
    this.configService.get('spn/enable')
      .pipe(
        map(setting => setting.Value ?? setting.DefaultValue),
        mergeMap(active => this.configService.save('spn/enable', !active))
      )
      .subscribe()
  }

  /**
   * Select one or more pins by ID. If shift key is hold then all currently
   * selected pin overlays will be cleared before selecting the new ones.
   */
  private selectPins(event: MouseEvent | undefined, pinIDs: Observable<string[]>) {
    combineLatest([
      this.mapService.pins$,
      pinIDs,
    ])
      .pipe(take(1))
      .subscribe(([allPins, pinIDs]) => {
        if (event?.shiftKey !== true) {
          this.selectedPins
            .filter(overlay => !overlay.hasBeenMoved)
            .forEach(selected => selected.disposeOverlay())
        }

        pinIDs
          .filter(id => !this.selectedPins.find(selectedPin => selectedPin.mapPin.pin.ID === id))
          .map(id => allPins.find(pin => pin.pin.ID === id))
          .filter(mapPin => !!mapPin)
          .forEach(mapPin => this.onPinClick({
            mapPin: mapPin!,
          }));
      })
  }

  /**
   * Select all pins that are used for transit.
   *
   * @private - template only
   */
  selectTransitNodes(event: MouseEvent) {
    this.selectPins(event, this.mapService.getPinIDsWithActiveSession())
  }

  /**
   * Select all pins that are used as an exit hub.
   *
   * @private - template only
   */
  selectExitNodes(event: MouseEvent) {
    this.selectPins(event, this.mapService.getPinIDsUsedAsExit())
  }

  /**
   * Select all pins that currently host alive connections.
   *
   * @private - template only
   */
  selectNodesWithAliveConnections(event: MouseEvent) {
    this.selectPins(event, this.mapService.getPinIDsWithActiveConnections())
  }

  navigateToMonitor(process: AppProfile) {
    this.router.navigate(['/app', process.Source, process.ID])
  }

  ngOnDestroy() {
    this.openedCountryDetails.forEach(cmp => cmp.dialogRef!.close());
  }

  onZoomAndPan() {
    this.updateOverlayPositions();
  }

  private createPinOverlay(pinEvent: PinEvent, lm: Map<string, MapPin>): PinOverlayComponent {
    const paths = this.getRouteHome(pinEvent.mapPin, lm, false)
    const overlayBoundingRect = this.overlayContainer.nativeElement.getBoundingClientRect();
    const target = pinEvent.event?.target || this.mapRenderer.getPinElem(pinEvent.mapPin.pin.ID)?.children[0];
    let delay = 0;
    if (paths.length > 0) {
      delay = paths[0].points.length * MapRendererComponent.LineAnimationDuration;
    }

    const overlayRef = this.mapOverlay.create({
      positionStrategy: this.mapOverlay.position()
        .flexibleConnectedTo(new ElementRef(target))
        .withDefaultOffsetY(-overlayBoundingRect.y - 10)
        .withDefaultOffsetX(-overlayBoundingRect.x + 20)
        .withPositions([
          {
            overlayX: 'start',
            overlayY: 'top',
            originX: 'start',
            originY: 'top'
          }
        ]),
      scrollStrategy: this.mapOverlay.scrollStrategies.reposition(),
    })

    const injector = Injector.create({
      providers: [
        {
          provide: OVERLAY_REF,
          useValue: overlayRef,
        }
      ],
      parent: this.injector
    })


    const pinOverlay = overlayRef.attach(
      new ComponentPortal(PinOverlayComponent, undefined, injector)
    ).instance;

    pinOverlay.delay = delay;
    pinOverlay.mapPin = pinEvent.mapPin;
    if (paths.length > 0) {
      pinOverlay.routeHome = {
        ...(paths[0]),
      }
      pinOverlay.additionalPaths = paths.slice(1);
    }

    return pinOverlay;
  }


  private openPinDetails(id: string) {
    this.dialog.create(PinDetailsComponent, {
      data: id,
      backdrop: false,
      autoclose: true,
      dragable: true,
    })
  }

  private openCountryDetails(event: CountryEvent) {
    // abort if we already have the country details open.
    if (this.openedCountryDetails.find(cmp => cmp.countryCode === event.countryCode)) {
      return;
    }

    const ref = this.dialog.create(CountryDetailsComponent, {
      data: {
        name: event.countryName,
        code: event.countryCode,
      },
      autoclose: false,
      dragable: true,
      backdrop: false,
    })
    const component = (ref.contentRef() as ComponentRef<CountryDetailsComponent>).instance;

    // used to track whether we highlighted a map pin
    let hasPinHighlightActive = false;

    combineLatest([
      component.pinHover,
      this.mapService.pins$,
    ])
      .pipe(
        takeUntil(ref.onClose),
      )
      .subscribe(([hovered, pins]) => {
        hasPinHighlightActive = hovered !== null;

        if (hovered !== null) {
          this.onPinHover({
            mapPin: pins.find(p => p.pin.ID === hovered)!,
          })
          this.mapRenderer.highlightPin(hovered, true)
        } else {
          this.onPinHover(null);
          this.mapRenderer.clearPinHighlights();
        }

        this.cdr.markForCheck();
      })

    ref.onClose
      .subscribe(() => {
        if (hasPinHighlightActive) {
          this.mapRenderer.clearPinHighlights();
        }

        const index = this.openedCountryDetails.findIndex(cmp => cmp === component);
        if (index >= 0) {
          this.openedCountryDetails.splice(index, 1);
        }
      })

    this.openedCountryDetails.push(component);
  }

  private updateOverlayPositions() {
    this.mapService.pinsMap$
      .pipe(take(1))
      .subscribe(allPins => {
        this.selectedPins.forEach(pin => {
          const pinObj = allPins.get(pin.mapPin.pin.ID);
          if (!pinObj) {
            return;
          }

          pin.overlayRef.updatePosition();
        })
      })
  }

  onCountryClick(countryEvent: CountryEvent) {
    this.openCountryDetails(countryEvent);
  }

  onCountryHover(countryEvent: CountryEvent | null) {
    if (this.countryDebounceTimer !== null) {
      clearTimeout(this.countryDebounceTimer);
    }

    if (!!countryEvent) {
      this.hoveredCountry = {
        countryCode: countryEvent.countryCode,
        countryName: countryEvent.countryName,
      }

      return;
    }

    this.countryDebounceTimer = setTimeout(() => {
      this.hoveredCountry = null;
      this.countryDebounceTimer = null;
      this.cdr.markForCheck();
    }, 200)
  }

  onPinClick(pinEvent: PinEvent) {
    // if the control key hold when clicking a map pin, we immediately open the
    // pin details instead of the overlay.
    if (pinEvent.event?.ctrlKey) {
      this.openPinDetails(pinEvent.mapPin.pin.ID);
    }

    const overlay = this.selectedPins.find(por => por.mapPin.pin.ID === pinEvent.mapPin.pin.ID);
    if (!!overlay) {
      overlay.disposeOverlay()
      return;
    }

    // if shiftKey was not pressed during the pinClick we dispose all active overlays that have not been
    // moved by the user
    if (!pinEvent.event?.shiftKey) {
      this.selectedPins
        .filter(overlay => !overlay.hasBeenMoved)
        .forEach(selected => selected.disposeOverlay())
    }

    this.mapService.pinsMap$
      .pipe(take(1))
      .subscribe(async lm => {
        const overlayComp = this.createPinOverlay(pinEvent, lm);

        // when the user wants to dispose a pin overlay (by clicking the X) we
        //  - make sure the pin is not highlighted anymore
        //  - remove the pin from the selectedPins list
        //  - remove lines showing the route to the home hub
        overlayComp.afterDispose
          .subscribe(pinID => {
            this.mapRenderer.highlightPin(pinID, false);

            const overlayIdx = this.selectedPins.findIndex(por => por.mapPin.pin.ID === pinEvent.mapPin.pin.ID);
            this.selectedPins.splice(overlayIdx, 1)

            this.updatePaths()
            this.cdr.markForCheck();
          })

        // when the user hovers/leaves a pin overlay, we:
        //   - move the pin-overlay to the top when the user hovers it so stacking order is correct
        //   - (un)hightlight the pin element on the map
        overlayComp.overlayHover
          .subscribe(evt => {
            this.mapRenderer.highlightPin(evt.pinID, evt.type === 'enter')

            // over the overlay component to the top
            if (evt.type === 'enter') {
              this.selectedPins.forEach(ref => {
                if (ref !== overlayComp && ref.overlayRef.hostElement) {
                  ref.overlayRef.hostElement.style.zIndex = '0';
                }
              })

              overlayComp.overlayRef.hostElement.style.zIndex = '';
            }
          })

        this.selectedPins.push(overlayComp)

        this.updatePaths([]);
        this.cdr.markForCheck();
      })
  }

  private updatePaths(additional: Path[] = []) {
    const paths = [
      ...(this.selectedPins
        .reduce((list, pin) => {
          if (pin.routeHome) {
            list.push(pin.routeHome)
          }

          return [
            ...list,
            ...(pin.additionalPaths || [])
          ]
        }, [] as Path[])),
      ...this.liveModePaths,
      ...additional
    ]

    this.paths = paths.map(p => {
      return {
        ...p,
        attributes: {
          class: 'lane',
          ...(p.attributes || {})
        }
      }
    });
  }

  onPinHover(pinEvent: PinEvent | null) {
    if (!pinEvent) {
      this.updatePaths([]);
      this.onCountryHover(null);

      return;
    }

    // we also emit a country hover event here to keep the country
    // overlay open.
    const countryName = this.mapRenderer.countryNames.get(pinEvent.mapPin.entity.Country)
    this.onCountryHover({
      event: pinEvent.event,
      countryCode: pinEvent.mapPin.entity.Country,
      countryName: countryName!,
    })

    // in developer mode, we show all connected lanes of the hovered pin.
    if (this.expertiseService.currentLevel === ExpertiseLevel.Developer) {
      this.mapService.pinsMap$
        .pipe(take(1))
        .subscribe(lm => {
          const lanes = this.getConnectedLanes(pinEvent?.mapPin, lm)
          this.updatePaths(lanes);
          this.cdr.markForCheck();
        })
    }
  }

  /**
   * Marks a process group as selected and either selects one or all exit pins
   * of that group. If shiftKey is pressed during click, the ID(s) will be added
   * to the list of selected pins instead of replacing it. If shiftKey is pressed
   * the process group itself will NOT be displayed as selected.
   *
   * @private - template only
   */
  selectGroup(grp: AppProfile, pin?: MapPin | null, event?: MouseEvent) {
    if (!!pin) {
      this.selectPins(event, of([pin.pin.ID]))
      return;
    }

    this.selectPins(event, this.mapService.getExitPinIDsForProfile(grp))
  }

  /** Returns a list of lines that represent the route from pin to home. */
  private getRouteHome(pin: MapPin, lm: Map<string, MapPin>, includeAllRoutes = false): Path[] {
    let pinsToEval: MapPin[] = [pin];

    // decide whether to draw all connection routes that travel through pin.
    if (includeAllRoutes) {
      pinsToEval = [
        ...pinsToEval,
        ...Array.from(lm.values())
          .filter(p => p.pin.Route?.includes(pin.pin.ID))
      ]
    }

    return pinsToEval.map(pin => ({
      id: `route-home-from-${pin.pin.ID}`,
      points: (pin.pin.Route || []).map(hop => lm.get(hop)!),
      attributes: {
        'in-use': 'true'
      }
    }));
  }

  /** Returns a list of lines the represent all lanes to connected pins of pin */
  private getConnectedLanes(pin: MapPin, lm: Map<string, MapPin>): Path[] {
    let result: Path[] = [];

    // add all lanes for connected hubs
    Object.keys(pin.pin.ConnectedTo).forEach(target => {
      const p = lm.get(target);
      if (!!p) {
        result.push({
          id: lineID([pin, p]),
          points: [
            pin,
            p
          ]
        })
      }
    });

    return result;
  }

}

function lineID(l: [MapPin, MapPin]): string {
  return [l[0].pin.ID, l[1].pin.ID].sort().join("-")
}
