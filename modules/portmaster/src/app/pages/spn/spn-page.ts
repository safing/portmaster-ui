import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, TrackByFunction, ViewChild } from "@angular/core";
import { curveBasis, geoMercator, geoPath, interpolateString, json, line, pointer, select, Selection, zoom, zoomIdentity, ZoomTransform } from 'd3';
import { BehaviorSubject, combineLatest, interval, Observable, of, Subject } from "rxjs";
import { debounceTime, distinctUntilChanged, map, mergeMap, startWith, switchMap, takeUntil, withLatestFrom } from "rxjs/operators";
import { ConfigService, ExpertiseLevel, GeoCoordinates, UnknownLocation, IntelEntity, SPNService } from "src/app/services";
import { ConnTracker, ProcessGroup } from "src/app/services/connection-tracker.service";
import { getPinCoords, Pin, SPNStatus } from "src/app/services/spn.types";
import { ExpertiseService } from "src/app/shared/expertise/expertise.service";
import { feature } from 'topojson-client';

const markerSize = 5;
const markerStroke = 1;

interface _PinModel extends Pin {
  isExit: boolean;
  preferredLocation: GeoCoordinates;
  preferredEntity: IntelEntity;
  countProcesses: number;
  collapsed?: boolean;
  route: _PinModel[];
}

interface _ProcessGroupModel {
  process: ProcessGroup;
  exitPins: _PinModel[];
}

type Line = [_PinModel, _PinModel];

@Component({
  templateUrl: './spn-page.html',
  styleUrls: ['./spn-page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpnPageComponent implements OnInit, OnDestroy, AfterViewInit {
  private destroy$ = new Subject();

  @ViewChild('map', { read: ElementRef, static: true })
  mapElement: ElementRef<HTMLDivElement> | null = null;

  /**
   * activeSince holds the pre-formatted duration since the SPN is active
   * it formats the duration as "HH:MM:SS"
   */
  activeSince: string | null = null;

  /** An observable that emits all active processes. */
  activeProfiles$: Observable<_ProcessGroupModel[]>;

  /** countExitNodes holds the number of exit nodes in use */
  countExitNodes = 0;

  /** countTransitNodes holds the number of transit nodes in use */
  countTransitNodes = 0;

  /**
   * selectPin$ emits everytime the user selects a pin.
   * Pin selection can occur when:
   *  - the user selects a pin on the map
   *  - the user clicks on a exit-node of a process group
   *    in the left-hand pane
   */
  selectedPins$ = new BehaviorSubject<string[]>([]);

  /**
   * selectedPinID holds the ID of the last pin that was selected by the user.
   */
  selectedPinIDs: Set<string> | null = null;

  /**
   * selectedPins is a list of selected PINs
   */
  selectedPins: _PinModel[] | null = null;

  /** selectedProcessGroup holds the ID of the currently selected process group */
  selectedProcessGroup = '';

  /** Status is the current SPN status */
  spnStatus: SPNStatus | null = null;

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

  /** flagDir holds the path to the flag assets */
  private readonly flagDir = '/assets/img/flags';

  /** activeLanes holds a list of active lanes */
  private activeLanes = new Set<string>();

  /** pins$ emits all our map and SPN pins whenever the change */
  private pins$ = new BehaviorSubject<Map<string, _PinModel>>(new Map());

  /**
   * activePins holds a list of active/in-use pins.
   * This is calculated by navigating home from any exit node
   * in use. This is basically the same as activeLanes. We need to
   * gather that information ourself because Pin.Route might still
   * be set because there's an active session on that Pin.
   */
  private activePins = new Set<string>();

  /** render$ emits when all map annotations (markers, lanes, ...) should be updated */
  private render$ = new Subject();

  /** renderLines$ should emit when lines should be rendered. */
  private renderLines$ = new Subject();

  /** hoveredPin is set to the ID of the pin that is currently hovered */
  private hoveredPin: _PinModel | null = null;

  // create a group element for our world data, our markers and the
  // lanes between them.
  // We need `null as any` here because otherwise tslint will complain about
  // missing initializers. That's only partly correct because they are initialized
  // after the view has been created by angular but not - as tslint checks - in the
  // constructor.
  private svg: Selection<SVGSVGElement, unknown, null, undefined> = null as any;
  private worldGroup: Selection<SVGGElement, unknown, null, undefined> = null as any;
  private laneGroup: Selection<SVGGElement, unknown, null, undefined> = null as any;
  private markerGroup: Selection<SVGGElement, unknown, null, undefined> = null as any;

  /**
   * trackProfile is the TrackBy function used when rendering the list of process profiles that use the SPN.
   * See activeProfiles$.
   */
  trackProfile: TrackByFunction<_ProcessGroupModel> = (_: number, grp: _ProcessGroupModel) => grp.process.ID;

  /**
   * trackPin is the TrackBy function when rendering the exit pins of a process profile.
   * See activeProfile$ and _ProcessGroupModel
   */
  trackPin: TrackByFunction<_PinModel> = (_: number, pin: _PinModel) => pin.ID;

  constructor(
    private tracker: ConnTracker,
    private configService: ConfigService,
    private spnService: SPNService,
    private expertiseService: ExpertiseService,
    private cdr: ChangeDetectorRef
  ) {
    // activeProfiles emits a list of process groups from the connection tracker
    // that are currently using the SPN (= have exit nodes). Those process groups
    // are enriched with a slice of exitPins and are used to display the process-exit-node
    // tree on the left side of the SPN page.
    this.activeProfiles$ = combineLatest([
      this.tracker.profiles,
      this.pins$,
    ])
      .pipe(
        map(([profiles, pins]) => {
          return profiles
            .filter(p => !!p.exitNodes)
            .map(p => ({
              process: p,
              exitPins: p.exitNodes!
                .map(n => pins.get(n))
                .filter(n => !!n)
            })) as any;
        })
      );
  }

  ngOnInit() {
    // subscribe to the SPN runtime status and re-calculate/format activeSince every second
    combineLatest([this.spnService.status$, interval(1000).pipe(startWith(-1))])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([status, _]) => {
        this.spnStatus = status;
        if (!!status.ConnectedSince) {
          const d = new Date(status.ConnectedSince);
          const diff = Math.floor((new Date().getTime() - d.getTime()) / 1000);
          const hours = Math.floor(diff / 3600);
          const minutes = Math.floor((diff - (hours * 3600)) / 60);
          const secs = diff - (hours * 3600) - (minutes * 60);
          const pad = (d: number) => d < 10 ? `0${d}` : '' + d;

          this.activeSince = `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
        } else {
          this.activeSince = null;
        }
        this.cdr.markForCheck();
      });

    // subscribe to the SPN runtime status and, depending on the state, start watching map pins
    // or emit an empty array. the empty array effectively cleans all markers from the map.
    // We also debounce for some time here to avoid re-rendering to often.
    const pinUpdates$ = this.spnService.status$
      .pipe(
        map(status => status.Status),
        distinctUntilChanged(),
        switchMap(status => {
          if (status !== 'disabled') {
            return this.spnService.watchPins()
          }
          return of([])
        }),
        debounceTime(5),
      )


    combineLatest([
      pinUpdates$,
      this.tracker.profiles
        .pipe(
          map(profiles => profiles.map(p => p.exitNodes$)),
          switchMap(exitNodes$ => {
            if (exitNodes$.length === 0) {
              return of([])
            }
            return combineLatest(exitNodes$);
          }),
        )])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([pins, exitNodes]) => {
        let existing = this.pins$.getValue();


        // create a lookup map for the pins and convert each Pin into our
        // local for-display _PinModel. It copies over the "collapsed" state
        // from the existing pin map - if any.
        let lm = new Map<string, _PinModel>();
        pins.forEach(p => {
          lm.set(p.ID, {
            ...p,
            isExit: false,
            preferredLocation: getPinCoords(p) || UnknownLocation,
            preferredEntity: (p.EntityV4 || p.EntityV6)!, // there must always be one entity
            countProcesses: 0,
            collapsed: existing.get(p.ID) ? existing.get(p.ID)!.collapsed : false,
            route: [],
          })
        })

        // now we have all pin models available. it's time to update the route
        // for each
        for (let p of lm.values()) {
          p.route = p.Route?.map(r => lm.get(r)!) || [];
        }

        exitNodes.forEach(nodes => {
          nodes?.forEach(n => {
            const p = lm.get(n || '');
            if (!!p) {
              p.isExit = true;
              p.countProcesses++;
            }
          })
        })


        // reset our counters as we will rebuild them now.
        this.countTransitNodes = 0;
        this.countExitNodes = 0;
        for (let p of lm.values()) {
          if (p.isExit) {
            this.countExitNodes++;
          }
          if (p.SessionActive) {
            this.countTransitNodes++;
          }
        }

        // emit the new pin map. to any other subscribers.
        this.pins$.next(lm);
      })

  }

  /** 
   * Either toggle the selection of a given pin or clear the complete selection.
   * 
   * @private - template only
   */
  clearSelection(id = '') {
    if (!!id) {
      this.selectedPins$.next(this.selectedPins$.getValue().filter(pinID => pinID !== id))
      return;
    }
    this.selectedPins$.next([]);
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
   * Select all pins that are used for transit.
   * 
   * @private - template only
   */
  selectTransitNodes(event: MouseEvent) {
    // search for all transit pins in the current pin map
    let pinIDs: string[] = [];
    for (let pin of this.pins$.getValue().values()) {
      if (pin.SessionActive) {
        pinIDs.push(pin.ID)
      }
    }
    if (event.shiftKey) {
      this.selectedPins$.next([...pinIDs, ...this.selectedPins$.getValue()]);
    } else {
      this.selectedPins$.next(pinIDs);
    }
  }

  /**
   * Select all pins that are used as an exit hub.
   * 
   * @private - template only
   */
  selectExitNodes(event: MouseEvent) {
    // search for all exit pins in the current pin map
    let pinIDs: string[] = [];
    for (let pin of this.pins$.getValue().values()) {
      if (pin.isExit) {
        pinIDs.push(pin.ID)
      }
    }
    if (event.shiftKey) {
      this.selectedPins$.next([...pinIDs, ...this.selectedPins$.getValue()]);
    } else {
      this.selectedPins$.next(pinIDs);
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.pins$.complete();
    this.selectedPins$.complete();

    if (!!this.svg) {
      this.svg.remove();
    }
  }

  /** We need angular to have initialized our view before we can start rendering the map */
  ngAfterViewInit() {
    this.renderMap();
  }

  /**
   * Marks a process group as selected and either selects one or all exit pins
   * of that group. If shiftKey is pressed during click, the ID(s) will be added
   * to the list of selected pins instead of replacing it. If shiftKey is pressed
   * the process group itself will NOT be displayed as selected.
   * 
   * @private - template only
   */
  selectGroup(grp: _ProcessGroupModel, pin?: _PinModel | null, event?: MouseEvent) {
    const shiftKey = !!event && event.shiftKey;
    this.selectedProcessGroup = '';
    if (!!pin) {
      if (!!shiftKey) {
        this.selectedPins$.next([pin.ID, ...this.selectedPins$.getValue()]);
      } else {
        this.selectedPins$.next([pin.ID]);
      }
      return;
    }

    const newIDs = grp.exitPins.map(p => p.ID);
    if (shiftKey) {
      this.selectedPins$.next([...newIDs, ...this.selectedPins$.getValue()]);
    } else {
      this.selectedProcessGroup = grp.process.ID;
      this.selectedPins$.next(newIDs);
    }
  }

  /**
   * Called from the template when a exit pin is hovered or unhovered in the process list or on
   * the map.
   * 
   * @private - template only
   */
  exitNodeHover(pin: _PinModel, enter: boolean) {
    if (enter) {
      if (this.expertiseService.currentLevel === ExpertiseLevel.User) {
        return;
      }
      this.hoveredPin = pin;
    } else {
      if (this.hoveredPin === pin) {
        this.hoveredPin = null;
      }
    }

    this.renderLines$.next();
  }

  /**
   * Calculates and searches for all lines that should be displayed at the map right now.
   * This takes all pin selections, the hover-state and the current expertise level into
   * account.
   */
  private getAllLanes(): Line[] {
    const lm = this.pins$.getValue();

    let selectedPins = this.selectedPins || [];
    const s = new Set<string>();
    const result: Line[] = [];
    const addLine = (line: Line) => {
      const id = lineID(line)
      if (s.has(id)) {
        return;
      }
      s.add(id);
      result.push(line);
    }

    if (!!this.hoveredPin) {
      selectedPins = [...selectedPins, this.hoveredPin];

      this.getConnectedLanes(this.hoveredPin, lm)
        .forEach(line => addLine(line));
    }

    selectedPins.forEach(pin => {
      this.getRouteHome(pin, lm).forEach(line => addLine(line))
      if (this.expertiseService.currentLevel === 'developer') {
        this.getConnectedLanes(pin, lm).forEach(line => addLine(line));
      }
    })

    return result;
  }

  /** Returns a list of lines that represent the route from pin to home. */
  private getRouteHome(pin: _PinModel, lm: Map<string, _PinModel>): Line[] {
    let result: Line[] = [];
    // add lanes for the route to home
    let last: _PinModel | null = null;

    (pin.Route || []).forEach(hop => {
      const p1 = lm.get(hop);
      if (!!p1) {
        if (!!last) {
          result.push([
            last,
            p1
          ])
        }
        last = p1
      }
    })
    return result;
  }

  /** Returns a list of lines the represent all lanes to connected pins of pin */
  private getConnectedLanes(pin: _PinModel, lm: Map<string, _PinModel>): Line[] {
    let result: Line[] = [];

    // add all lanes for connected hubs
    Object.keys(pin.ConnectedTo).forEach(target => {
      const p = lm.get(target);
      if (!!p) {
        result.push([
          pin,
          p,
        ])
      }
    });

    return result;
  }

  private async renderMap() {
    if (!this.mapElement) {
      return;
    }

    // d3 heavily relies und binding callback functions
    // the the target element. Since we need that element most
    // of the time we cannot use ES6 arrow functions here so
    // use a good old "self" to actually reference "this"
    // component.
    const self = this;
    const rotate = 0; // so [-0, 0] is the initial center of the projection
    const maxlat = 83; // clip northern and southern pols (infinite in mercator)

    const map = select(this.mapElement.nativeElement);
    const width = map.node()!.getBoundingClientRect().width;
    const height = window.innerHeight;


    const projection = geoMercator()
      .rotate([rotate, 0])
      .scale(1)
      .translate([width / 2, height / 2]);

    console.log(width, height);

    // returns the top-left and the bottom-right of the current projection
    const mercatorBounds = () => {
      const yaw = projection.rotate()[0];
      const xymax = projection([-yaw + 180 - 1e-6, -maxlat])!;
      const xymin = projection([-yaw - 180 + 1e-6, maxlat])!;
      return [xymin, xymax];
    }

    const initialBounds = mercatorBounds();
    const s = width / (initialBounds[1][0] - initialBounds[0][0]);
    const scaleExtend = [s, 10 * s];
    const transform = zoomIdentity
      .scale(scaleExtend[0])
      .translate(projection.translate()[0], projection.translate()[1]);

    // scale the projection to the initial bounds
    projection.scale(scaleExtend[0]);

    // path is used to update the SVG path to match our mercator projection
    const path = geoPath().projection(projection);

    // we want to have straight lines between our hubs so we use a custom
    // path function that updates x and y coordinates based on the mercator projection
    // without, points will no be at the correct geo-coordinates.
    const lineFunc = line<_PinModel>()
      .x(d => {
        return projection([d.preferredLocation.Longitude, d.preferredLocation.Latitude])![0];
      })
      .y(d => projection([d.preferredLocation.Longitude, d.preferredLocation.Latitude])![1])
      .curve(curveBasis);

    // create the SVG that will hold the complete
    // visualization
    this.svg = map
      .append('svg')
      .attr("xmlns", "http://www.w3.org/2000/svg")
      .attr('width', '100%')
      .attr('preserveAspectRation', 'none')
      .attr('height', '100%')
      .classed('show-active', true);

    this.svg.append('circle')
      .attr('class', 'mouse')
      .attr('r', 2)
      .attr('fill', '#fff')

    // clicking the SVG or anything that does not have a dedicated
    // click listener resets the currently selected pin:
    this.svg.on('click', () => this.selectedPins$.next([]));

    // create a group element for our world data, our markers and the
    // lanes between them.
    this.worldGroup = this.svg.append('g').attr('id', 'world-group');
    this.laneGroup = this.svg.append('g').attr('id', 'lane-group');
    this.markerGroup = this.svg.append('g').attr('id', 'marker-group');

    combineLatest([
      this.renderLines$,
      this.expertiseService.change,
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        console.log("[DEBUG] rendering lanes")
        const lanes = this.getAllLanes();
        const lines = this.laneGroup.selectAll<SVGPathElement, Line>(`.lane`)
          .data(lanes, line => lineID(line))

        lines.enter()
          .append('path')
          .call(this.setupLane())
          .call(sel => this.updateLaneData(sel))
          .attr('class', `lane`)
          .style('fill', 'none')
          .transition("enter-lane")
          .duration(300)
          .attrTween('stroke-dasharray', tweenDashEnter)

        lines.exit()
          .transition("enter-lane")
          .duration(300)
          .style('opacity', 0)
          .remove();
      })

    combineLatest([
      this.render$,
      this.renderLines$
    ]).subscribe(() => {
      console.log("[DEBUG] re-rendering/updating map")

      this.worldGroup.selectAll('path')
        .attr('d', path as any)

      this.laneGroup.selectAll<SVGPathElement, Line>(`.lane`)
        .attr('d', lineFunc as any)
        .call(sel => this.updateLaneData(sel));

      this.markerGroup.selectAll<SVGGElement, _PinModel>('g[hub-id]')
        .call(d => this.updateHubData(d))
        .attr('transform', d => `translate(${projection([d.preferredLocation.Longitude, d.preferredLocation.Latitude])})`)

      this.cdr.markForCheck();
    })

    // whenever the users zooms we need to update our groups
    // individually to apply the zoom effect.
    let tlast = {
      x: 0,
      y: 0,
      k: 0,
    }
    let z = zoom()
      .scaleExtent(scaleExtend as [number, number])
      .on('zoom', (e) => {
        const t: ZoomTransform = e.transform;

        if (t.k != tlast.k) {
          let p = pointer(e)
          let scrollToMouse = () => { };

          if (!!p && !!p[0]) {
            const tp = projection.translate();
            const coords = projection!.invert!(p)
            scrollToMouse = () => {
              const newPos = projection(coords!)!;
              const yaw = projection.rotate()[0];
              projection.translate([tp[0], tp[1] + (p[1] - newPos[1])])
              projection.rotate([yaw + 360.0 * (p[0] - newPos[0]) / width * scaleExtend[0] / t.k, 0, 0])
            }
          }

          projection.scale(t.k);
          scrollToMouse();

        } else {
          let dy = t.y - tlast.y;
          const dx = t.x - tlast.x;
          const yaw = projection.rotate()[0]
          const tp = projection.translate();

          // use x translation to rotate based on current scale
          projection.rotate([yaw + 360.0 * dx / width * scaleExtend[0] / t.k, 0, 0])
          // use y translation to translate projection clamped to bounds
          let bounds = mercatorBounds();
          if (bounds[0][1] + dy > 0) {
            dy = -bounds[0][1];
          } else if (bounds[1][1] + dy < height) {
            dy = height - bounds[1][1];
          }
          projection.translate([tp[0], tp[1] + dy]);

        }

        this.render$.next()

        tlast = {
          x: t.x,
          y: t.y,
          k: t.k,
        }
      });


    // load the world-map data and start rendering
    const world = await json<any>('/assets/world-50m.json');

    // actually render the countries
    const data = (feature(world, world.objects.countries) as any).features;
    console.log("[DEBUG] received features ...")

    this.worldGroup.selectAll('path')
      .data(data)
      .enter()
      .append('path');

    // apply the zoom listeners to the whole SVG.
    this.svg.call(z as any);
    this.svg.call(z.transform as any, transform);

    // selectPin always emits when the user selects a pin on either
    // the map or through a exit-node on the left.
    this.selectedPins$
      .pipe(withLatestFrom(this.pins$))
      .subscribe(async ([pinIDs, pins]) => {

        this.selectedProcessGroup = '';
        this.selectedPins = null;

        this.selectedPinIDs = new Set();
        pinIDs.forEach(id => {
          if (!this.selectedPinIDs!.has(id)) {
            this.selectedPinIDs!.add(id);
            if (!this.selectedPins) {
              this.selectedPins = [];
            }
            const p = pins.get(id);
            if (!!p) {
              this.selectedPins.push(p);
            }
          }
        })

        this.renderLines$.next()
      });

    // Subscribe to our pins observable and render all markers and lanes.
    this.pins$
      .subscribe(pins => {
        console.log("[DEBUG] updating hubs and lanes ...")

        // build a list of active lanes by navigating home from all exit nodes
        // that are currently in use.
        this.activeLanes = new Set();
        this.activePins = new Set();
        const transitAndExitHubs: _PinModel[] = [];
        const homeHubs: _PinModel[] = [];

        pins.forEach(p => {
          // if p is an exit node we navigate through the loop
          if (p.isExit) {
            let current = (p.route || [])[0];
            (p.route || []).slice(1).forEach(hop => {
              this.activeLanes.add(lineID([current, hop]));
              this.activePins.add(current.ID);
              current = hop;
            })
          }

          // separate our pins into transit and home/exit hubs.
          // In theory, there should always be only one home hub but this
          // visualization supports more. Who knows how the SPN will
          // progress ;)
          if (p.HopDistance > 1) {
            transitAndExitHubs.push(p);
          } else if (p.HopDistance === 1) {
            homeHubs.push(p);
          }
        })

        // a small utility method for creating markers for a set of pins.
        // If home is set to true that the home icon will be rendered instead
        // of a circle.
        let updateMarkers = (pins: _PinModel[], home = false) => {
          const marker = this.markerGroup.selectAll<SVGElement, _PinModel>(`g[hub-id][is-home=${home}]`)
            .data(pins, p => p.ID)

          const markerEnter = marker
            .enter()
            .append('g')
            .call(d => this.updateHubData(d))
            .attr('transform', d => `translate(${projection([d.preferredLocation.Longitude, d.preferredLocation.Latitude])})`)

          // NOTE: we use named transitions below because otherwise d3 will interrupt the
          // transition when we try to do an update to early. That may happen if the user
          // performs a zoom or pan on the map while our markers are still their "enter"
          // transition.

          // on hover we show all connected pins even if the connection is not in use
          const addHoverListener = (sel: Selection<any, _PinModel, any, any>) => {
            sel
              .on("mouseenter", function (e: MouseEvent) {
                const pin = select(this).datum() as _PinModel;
                self.exitNodeHover(pin, true);
              })
              .on("mouseout", function (e: MouseEvent) {
                const pin = select(this).datum() as _PinModel;
                self.exitNodeHover(pin, false);
              })
          }

          if (!home) {
            markerEnter
              .append('circle')
              .attr('class', 'marker')
              .call(this.setupMarkerCircle())
              .call(addHoverListener)
              .on('click', function (e: MouseEvent) {
                // stop propagation to NOT trigger an unselect from <svg>-click listener
                e.stopImmediatePropagation();

                const d = select<SVGElement, _PinModel>(this).datum();

                // shift-key when clicking pins on the map allows to add or remove
                // a pin from the selection.
                if (e.shiftKey) {
                  let existingIDs = Array.from(self.selectedPinIDs?.values() || []);
                  const idx = existingIDs.findIndex(id => id === d.ID);
                  if (idx >= 0) {
                    existingIDs.splice(idx, 1);
                  } else {
                    existingIDs.push(d.ID);
                  }
                  self.selectedPins$.next([
                    ...existingIDs
                  ])
                } else {
                  self.selectedPins$.next([d.ID]);
                }
              })
              .call(scaleIn);
          } else {
            markerEnter
              .append('path')
              .call(addHoverListener)
              .attr('d', 'M8.559.014 6.681-1.645V-6.011a.512.512 0 0 0-.512-.512H4.121a.512.512 0 0 0-.512.512V-4.357L.37-7.217C.169-7.399-.214-7.547-.487-7.547s-.655.148-.856.33l-8.192 7.232A.585.585 0 0 0-9.703.396a.596.596 0 0 0 .131.343L-8.887 1.5a.676.676 0 0 0 .384.17 .693.693 0 0 0 .342-.132l.509-.448V7.813a1.024 1.024 0 0 0 1.024 1.024H5.657a1.024 1.024 0 0 0 1.024-1.024V1.089l.509.448A.702.702 0 0 0 7.533 1.669a.668.668 0 0 0 .38-.17l.685-.762A.692.692 0 0 0 8.729.395 .672.672 0 0 0 8.559.014ZM-.487-1.915a2.048 2.048 0 1 1-2.048 2.048A2.048 2.048 0 0 1-.487-1.915ZM3.097 6.789H-4.071a.512.512 0 0 1-.512-.512 3.072 3.072 0 0 1 3.072-3.072h2.048a3.072 3.072 0 0 1 3.072 3.072A.512.512 0 0 1 3.097 6.789Z')
              .call(scaleIn);
          }

          /** add flag */
          markerEnter
            .append('image')
            .attr('class', 'marker-flag')
            .attr('href', d => `${this.flagDir}/${d.preferredEntity.Country.toUpperCase()}.png`)
            .call(this.setupMarkerFlag())
            .call(moveInAnimation)

          markerEnter
            .append('text')
            .attr('class', 'marker-label')
            .text(d => d.Name)
            .call(this.setupMarkerLabel())
            .call(moveInAnimation);

          marker.exit().remove()
        }

        // create all markers for transit/destination and home hubs.
        updateMarkers(transitAndExitHubs)
        updateMarkers(homeHubs, true)

        // now we can finally instruct d3 to update all existing elements, their position
        // and path data.
        this.render$.next()
      })
  }

  private setupLane(): (sel: any) => void {
    return sel => {
      sel.attr('stroke-width', markerStroke)
    }
  }

  private setupMarkerCircle(): (sel: any) => void {
    return sel => {
      sel.attr('r', markerSize)
        .attr('stroke-width', markerStroke)
    }
  }

  private setupMarkerLabel(): (sel: any) => void {
    return sel => {
      sel
        .attr('x', (markerSize * 2 + 16 + 2))
        .attr('dy', (d: _PinModel) =>
          d.HopDistance === 1
            ? 4.5
            : (0.5 * markerSize))
        .attr('font-size', 9)
    }
  }

  private setupMarkerFlag(): (sel: any) => void {
    return sel => {
      sel.attr('x', (markerSize + 4))
        .attr('y', (d: _PinModel) =>
          d.HopDistance === 1
            ? -6
            : -8)
        .attr('height', 16)
        .attr('width', 16)
    }
  }

  private updateLaneData(sel: Selection<any, Line, any, any>) {
    let self = this;
    sel
      .attr('lane', d => `${d[0].ID}-${d[1].ID}`)
      .attr('in-use', d => {
        return this.activeLanes.has(`${d[0].ID}-${d[1].ID}`)
          || this.activeLanes.has(`${d[1].ID}-${d[0].ID}`)
      })
  }

  private updateHubData(sel: Selection<any, _PinModel, any, any>) {
    sel.attr('hub-id', d => d.ID)
      .attr('is-exit', d => d.isExit)
      .attr('in-use', d => this.activePins.has(d.ID) || d.isExit)
      .attr('is-home', d => d.HopDistance === 1)
  }
}

const tweenDashEnter = function (this: SVGPathElement) {
  const len = this.getTotalLength();
  const interpolate = interpolateString(`0, ${len}`, `${len}, ${len}`);
  return (t: number) => {
    if (t === 1) {
      return '0';
    }
    return interpolate(t);
  }
}

function scaleIn(sel: Selection<any, any, any, any>) {
  sel.style('opacity', 0)
    .attr('transform', 'scale(0)')
    .transition("enter-marker")
    /**/.duration(750)
    /**/.attr('transform', 'scale(1)')
    /**/.style('opacity', 1);
}

function lineID(l: Line): string {
  return [l[0].ID, l[1].ID].sort().join("-")
}

function moveInAnimation(sel: Selection<any, any, any, any>) {
  sel
    .style('opacity', '0')
    .attr('transform', 'translate(-20, 0)')
    .transition("enter-animation")
      /**/.delay(1000)
      /**/.duration(250)
      /**/.style('opacity', '1')
      /**/.attr('transform', 'translate(0, 0)');
}
