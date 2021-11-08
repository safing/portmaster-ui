import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, RendererType2, TrackByFunction, ViewChild } from "@angular/core";
import { curveBasis, geoMercator, geoPath, interpolateString, json, line, select, SelectionOrTransition, Selection, zoom, BaseType } from 'd3';
import { BehaviorSubject, combineLatest, Observable, of, Subject } from "rxjs";
import { debounceTime, map, multicast, refCount, switchMap, take, takeUntil, withLatestFrom } from "rxjs/operators";
import { BoolSetting, ConfigService, ExpertiseLevel, GeoCoordinates, IntelEntity, SPNService } from "src/app/services";
import { ConnTracker, ProcessGroup } from "src/app/services/connection-tracker.service";
import { getPinCoords, Pin } from "src/app/services/spn.types";
import { ExpertiseService } from "src/app/shared/expertise/expertise.service";
import { feature } from 'topojson-client';

/**
 * TODO(ppacher):
 *  - maximum zoom
 *  - exit().remove()
 */

const markerSize = 5;
const markerStroke = 1;
const destinationHubFactor = 1.25;
const laneDashArray = 4;

const UnknownLocation: GeoCoordinates = {
  AccuracyRadius: 0,
  Latitude: 0,
  Longitude: 0
}

interface _PinModel extends Pin {
  isExit: boolean;
  preferredLocation: GeoCoordinates;
  preferredEntity: IntelEntity;
  countProcesses: number;
  collapsed?: boolean;
}

interface _ProcessGroupModel {
  process: ProcessGroup;
  exitPins: _PinModel[];
}

type Line = [_PinModel, _PinModel];

@Component({
  templateUrl: './spn-page.html',
  styleUrls: ['./spn-page.scss'],
})
export class SpnPageComponent implements OnInit, OnDestroy, AfterViewInit {
  private destroy$ = new Subject();

  @ViewChild('map', { read: ElementRef, static: true })
  mapElement: ElementRef<HTMLDivElement> | null = null;

  /** An obersvable that emits all active processes. */
  activeProfiles$: Observable<_ProcessGroupModel[]>;

  /** spnActive$ emits the value of the spn/enable setting */
  spnActive$: Observable<boolean>;

  /** pins$ emits all our map and SPN pins whenever the change */
  pins$ = new BehaviorSubject<_PinModel[]>([]);

  /** countExitNodes holds the number of exit nodes in use */
  countExitNodes = 0;

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

  /** highlightReason is displayed below the map and tells the user what is currently blue. */
  highlightReason = '';

  /** flagDir holds the path to the flag assets */
  private readonly flagDir = '/assets/img/flags';

  /** activeLanes holds a list of active lanes */
  private activeLanes = new Set<string>();

  /**
   * activePins holds a list of active/in-use pins.
   * This is calculated by navigating home from any exit node
   * in use. This is basically the same as activeLanes. We need to
   * gather that information ourself because Pin.Route might still
   * be set because there's an active session on that Pin.
   */
  private activePins = new Set<string>();

  /** currentScaleLevel holds the scale level */
  private currentScaleLevel = 1;

  /** hoveredPin is set to the ID of the pin that is currently hovered */
  private hoveredPin = '';

  // create a group element for our world data, our markers and the
  // lanes between them.
  // We need `null as any` here because otherwise tslint will complain about
  // missing initializers. That's only partly correct because they are initialized
  // after the view has been created by angular but not - as tslint checks - in the
  // constructor.
  private worldGroup: Selection<SVGGElement, unknown, null, undefined> = null as any;
  private laneGroup: Selection<SVGGElement, unknown, null, undefined> = null as any;
  private markerGroup: Selection<SVGGElement, unknown, null, undefined> = null as any;

  trackProfile: TrackByFunction<_ProcessGroupModel> = (_: number, grp: _ProcessGroupModel) => grp.process.ID;
  trackPin: TrackByFunction<_PinModel> = (_: number, pin: _PinModel) => pin.ID;

  constructor(
    private tracker: ConnTracker,
    private configService: ConfigService,
    private spnService: SPNService,
    private expertiseService: ExpertiseService
  ) {
    this.activeProfiles$ = combineLatest([
      this.tracker.profiles,
      this.pins$,
    ])
      .pipe(
        map(([profiles, pins]) => {
          let lm = new Map<string, _PinModel>();
          pins.forEach(p => lm.set(p.ID, p))

          return profiles
            .filter(p => !!p.exitNodes)
            .map(p => ({
              process: p,
              exitPins: p.exitNodes!
                .map(n => lm.get(n))
                .filter(n => !!n)
            })) as any;
        })
      );


    combineLatest([
      this.spnService.watchPins(),
      this.tracker.profiles
        .pipe(
          map(profiles => profiles
            .filter(p => !!p.exitNodes)
            .map(p => p.exitNodes$)
          ),
          switchMap(exitNodes$ => combineLatest(exitNodes$))
        )])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([pins, exitNodes]) => {
        let existing = new Map<string, _PinModel>();
        this.pins$.getValue().forEach(p => existing.set(p.ID, p));

        // create a lookup map for the pins and convert each Pin into our
        // local for-display _PinModel
        let lm = new Map<string, _PinModel>();
        pins.forEach(p => {
          lm.set(p.ID, {
            ...p,
            isExit: false,
            preferredLocation: getPinCoords(p) || UnknownLocation,
            preferredEntity: (p.EntityV4 || p.EntityV6)!, // there must always be one entity
            countProcesses: 0,
            collapsed: existing.get(p.ID)?.collapsed || false,
          })
        })

        exitNodes.forEach(nodes => {
          nodes?.forEach(n => {
            const p = lm.get(n || '');
            if (!!p) {
              p.isExit = true;
              p.countProcesses++;
            }
          })
        })

        const displayModels = Array.from(lm.values());
        this.countExitNodes = displayModels.filter(p => p.isExit).length;

        this.pins$.next(displayModels);
      })

    this.spnActive$ = this.configService.watch<BoolSetting>('spn/enable')
      .pipe(
        multicast(() => new BehaviorSubject(false)),
        refCount(),
      );
  }

  clearSelection(id = '') {
    if (!!id) {
      this.selectedPins$.next(this.selectedPins$.getValue().filter(pinID => pinID !== id))
      return;
    }
    this.selectedPins$.next([]);
  }

  toggleSPN() {
    this.spnActive$.pipe(take(1))
      .subscribe(active => {
        this.configService.save('spn/enable', !active).subscribe();
      })
  }

  ngOnInit() {

  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.pins$.complete();
    this.selectedPins$.complete();
  }

  ngAfterViewInit() {
    this.renderMap();
  }

  /*
   * A small utility method for selecting all lanes and pins
   * from `last` to `home` and adding or removing the
   * highlight class based on `set`.
   *
   * Only call hightlightRoute after the view has been initialized
   * and renderMap() has been called and resolved.
   */
  private async highlightRoute(last: string, set: boolean, pins: _PinModel[]) {
    const pin = pins.find(p => last === p.ID);
    if (!!pin) {
      (pin.Route || []).forEach(hop => {
        // update lanes between the pins
        const lane = this.laneGroup.select(`.lane[lane=${last}-${hop}]`)
          .merge(
            this.laneGroup.select(`.lane[lane=${hop}-${last}]`)
          );
        const marker = this.markerGroup.select(`[hub-id=${last}] .marker`)

        lane.classed('highlight', set);
        marker.classed('highlight', set);
        last = hop;
      });
    }
  }

  private lineTransition(path: Selection<SVGPathElement, any, any, any>): Promise<void> {
    return new Promise(resolve => {
      path
        .style('opacity', 0)
        .transition("enter-lane")
        .delay(500)
        .style('opacity', 1)
        .duration(500)
        .attrTween('stroke-dasharray', tweenDash)
        .on('end', function () {
          resolve();
        });
    })
  }

  selectGroup(grp: _ProcessGroupModel, pin?: _PinModel) {
    this.selectedProcessGroup = '';
    if (!!pin) {
      this.selectedPins$.next([pin.ID]);
      return;
    }
    this.selectedPins$.next(grp.exitPins.map(p => p.ID));
    this.selectedProcessGroup = grp.process.ID;
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

    const map = select(this.mapElement.nativeElement);
    const width = map.node()!.getBoundingClientRect().width;
    const height = map.node()!.parentElement!.getBoundingClientRect().height;

    const projection = geoMercator()
      .scale(350)
      .translate([width / 100 * 70, height / 100 * 80]);

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
    const svg = map
      .append('svg')
      .attr("xmlns", "http://www.w3.org/2000/svg")
      .attr('width', '100%')
      .attr('preserveAspectRation', 'none')
      .attr('height', '100%')
      .classed('show-active', true);
    this.highlightReason = 'Showing all active connections';

    // clicking the SVG or anything that does not have a dedicated
    // click listener resets the currently selected pin:
    svg.on('click', () => this.selectedPins$.next([]));

    // create a group element for our world data, our markers and the
    // lanes between them.
    this.worldGroup = svg.append('g').attr('id', 'world-group');
    this.laneGroup = svg.append('g').attr('id', 'lane-group');
    this.markerGroup = svg.append('g').attr('id', 'marker-group');

    // a simple helper function to update the world and lanes
    // as they need to account for scaling
    const render = () => {
      this.worldGroup.selectAll('path')
        .attr('d', path as any)

      this.markerGroup.selectAll<SVGGElement, _PinModel>('g[hub-id]')
        .call(d => this.updateHubData(d))

      this.laneGroup.selectAll<SVGPathElement, Line>('.lane')
        .attr('d', lineFunc as any)
        .call(sel => this.updateLaneData(sel));
    }

    // whenever the users zooms we need to update our groups
    // indivitually to apply the zoom effect.
    let z = zoom()
      .on('zoom', (e) => {
        // apply the zoom transformation (that's zoom and pan)
        // to all groups so the scale the same.
        this.worldGroup.attr('transform', e.transform);
        this.markerGroup.attr('transform', e.transform);
        this.laneGroup.attr('transform', e.transform);

        this.currentScaleLevel = e.transform.k;

        // zooming the groups will also zoom the markers
        // texts and lanes so we should invert the zoom effect
        // there. We to this with a little animation to make
        // the user happy :)

        this.markerGroup.selectAll('.marker-home')
          .transition()
          /**/.duration(500)
          /**/.attr('transform', `scale(${1 / e.transform.k})`);

        this.markerGroup.selectAll<SVGCircleElement, _PinModel>('.marker')
          .transition()
          /**/.duration(500)
          /**/.call(this.setupMarkerCircle())

        this.markerGroup.selectAll('.marker-label')
          .transition()
          /**/.duration(500)
          /**/.call(this.setupMarkerLabel());

        this.markerGroup.selectAll('.marker-flag')
          .transition()
          /**/.duration(500)
          /**/.call(this.setupMarkerFlag());

        this.laneGroup.selectAll<SVGPathElement, Line>('.lane')
          .transition()
          /**/.duration(500)
          /**/.call(this.setupLane())
      });

    // apply the zoom listeners to the whole SVG.
    svg.call(z as any);

    // load the world-map data and start rendering
    const world = await json<any>('assets/world-50m.json')

    // actually render the countries
    const data = (feature(world, world.objects.countries) as any).features;
    this.worldGroup.selectAll('path')
      .data(data)
      .enter()
      .append('path');

    // immediately render the the country paths now
    // as we might not yet have pin data available.
    render();

    // selectPin always emits when the user selects a pin on either
    // the map or thourgh a exit-node on the left.
    this.selectedPins$
      .pipe(withLatestFrom(this.pins$))
      .subscribe(async ([pinIDs, pins]) => {
        this.laneGroup.selectAll('.lane.highlight')
          .classed('highlight', false);

        this.markerGroup.selectAll('.marker.highlight')
          .classed('highlight', false);

        this.selectedProcessGroup = '';
        this.selectedPins = null;

        this.selectedPinIDs = new Set();
        // finally, if there's a new ID to select - and not just
        // toggeling the old one - make sure we add the "highlight"
        // class to all pins and lanes from `id` to `home`
        pinIDs.forEach(id => {
          if (!this.selectedPinIDs!.has(id)) {
            this.selectedPinIDs!.add(id);
            if (!this.selectedPins) {
              this.selectedPins = [];
            }
            const p = pins.find(p => p.ID === id);
            if (!!p) {
              this.selectedPins.push(p);
            }
          }
          this.highlightRoute(id, true, pins);
        })

        if (this.selectedPinIDs.size === 0) {
          this.highlightReason = 'Showing all active connections'
          svg.classed('show-active', true);
        } else {
          this.highlightReason = 'Showing paths to selected hubs'
          svg.classed('show-active', false);
        }
      });

    // we need to re-render when the expertise level changes.
    this.expertiseService.change
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => render());

    // Subscribe to our pins observable and render all markers and lanes.
    this.pins$
      .pipe(debounceTime(100))
      .subscribe(pins => {
        console.log("rendering ....", pins)

        // create a lookup map for PinID to PIN.
        const lm = new Map<string, _PinModel>();
        pins.forEach(p => lm.set(p.ID, p));

        // build a list of active lanes by navigating home from all exit nodes
        // that are currently in use.
        this.activeLanes = new Set();
        this.activePins = new Set();
        pins.filter(p => p.isExit).forEach(pin => {
          let current = (pin.Route || [])[0];
          (pin.Route || []).slice(1).forEach(hop => {
            this.activeLanes.add(`${current}-${hop}`)
            this.activePins.add(current);
            current = hop;
          });
        })

        // Next prepare a map of lanes from ConnectedTo map of
        // each pin. We group the lanes by ID "<start-id>-<end-id>". Since
        // we naturally see both sides once as start and once as end we need
        // to check for the reversed ID as well ("<end-id>-<start-id>").
        const lines = new Map<string, Line>();
        pins.forEach(pin => {
          Object.keys(pin.ConnectedTo).forEach(dest => {
            const destPin = lm.get(dest);
            if (!destPin) {
              return;
            }
            const key = `${pin.ID}-${dest}`;
            const revKey = `${dest}-${pin.ID}`;
            if (lines.has(key) || lines.has(revKey)) {
              return;
            }
            lines.set(`${pin.ID}-${dest}`, [pin, destPin])
          });
        })

        // separate our pins into transit/destination and home hubs.
        // In theory, there should always be only one home hub but this
        // visualization supports more. Who knows how the SPN will
        // progress ;)
        const hubs = pins.filter(p => p.HopDistance > 1)
        const homeHubs = pins.filter(p => p.HopDistance === 1)

        // a small utility method for creating markers for a set of pins.
        // If home is set to true that the home icon will be rendered instead
        // of a circle.
        let createMarkers = (pins: _PinModel[], home = false) => {
          let markerEnter = this.markerGroup.selectAll(`g[hub-id][is-home=${home}]`)
            .data(pins)
            .enter()
            .append('g')
            .call(d => this.updateHubData(d))
            .attr('transform', d => `translate(${projection([d.preferredLocation.Longitude, d.preferredLocation.Latitude])})`)

          // NOTE: we use named transitions below because otherwise d3 will interup the
          // transition when we try to do an update to early. That may happen if the user
          // performs a zoom or pan on the map while our markers are still their "enter"
          // transition.

          // on hover we show all connected pins even if the connection is not in use
          const addHoverListener = (sel: Selection<any, _PinModel, any, any>) => {
            sel
              .on("mouseenter", function (e: MouseEvent) {
                if (self.expertiseService.currentLevel === ExpertiseLevel.User) {
                  return;
                }
                self.hoveredPin = (select(this).datum() as _PinModel).ID;
                render();
              })
              .on("mouseout", function (e: MouseEvent) {
                if (self.expertiseService.currentLevel === ExpertiseLevel.User) {
                  return;
                }
                self.hoveredPin = '';
                render();
              })
          }

          let text: string | null = null;
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
            text = 'HOME';
            markerEnter
              .append('path')
              .attr('d', 'M8.559.014 6.681-1.645V-6.011a.512.512 0 0 0-.512-.512H4.121a.512.512 0 0 0-.512.512V-4.357L.37-7.217C.169-7.399-.214-7.547-.487-7.547s-.655.148-.856.33l-8.192 7.232A.585.585 0 0 0-9.703.396a.596.596 0 0 0 .131.343L-8.887 1.5a.676.676 0 0 0 .384.17 .693.693 0 0 0 .342-.132l.509-.448V7.813a1.024 1.024 0 0 0 1.024 1.024H5.657a1.024 1.024 0 0 0 1.024-1.024V1.089l.509.448A.702.702 0 0 0 7.533 1.669a.668.668 0 0 0 .38-.17l.685-.762A.692.692 0 0 0 8.729.395 .672.672 0 0 0 8.559.014ZM-.487-1.915a2.048 2.048 0 1 1-2.048 2.048A2.048 2.048 0 0 1-.487-1.915ZM3.097 6.789H-4.071a.512.512 0 0 1-.512-.512 3.072 3.072 0 0 1 3.072-3.072h2.048a3.072 3.072 0 0 1 3.072 3.072A.512.512 0 0 1 3.097 6.789Z')
              .attr('class', 'marker-home')
              .call(addHoverListener)
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
            .text(d => text || d.Name)
            .call(this.setupMarkerLabel())
            .call(moveInAnimation);
        }

        // create all markers for transit/destination and home hubs.
        createMarkers(hubs)
        createMarkers(homeHubs, true)

        // next, add our lane data.
        this.laneGroup.selectAll('.lane')
          .data(Array.from(lines.values()))
          .enter()
          .append('path')
          .call(this.setupLane())
          .call(sel => this.updateLaneData(sel))
          .attr('class', 'lane')
          .style('fill', 'none')
          .filter(function () {
            return select(this).style("visibility") === 'visible'
          })
          .call(sel => this.lineTransition(sel));

        // now we can finally instruct d3 to update all existing elements, their position
        // and path data.
        render();
      })
  }

  private setupLane(scaleFactor: number = this.currentScaleLevel): (sel: any) => void {
    return sel => {
      sel.attr('stroke-width', (markerStroke / scaleFactor))
        .attr('stroke-dasharray', function (this: any) {
          if (select(this).attr("in-use") === 'true') {
            return 0;
          }
          return (laneDashArray / scaleFactor);
        });
    }
  }

  private setupMarkerCircle(scaleFactor: number = this.currentScaleLevel): (sel: any) => void {
    return sel => {
      sel.attr('r', (d: _PinModel) => (d.isExit ? markerSize * destinationHubFactor : markerSize) / scaleFactor)
        .attr('stroke-width', (markerStroke) / scaleFactor)
    }
  }

  private setupMarkerLabel(scaleFactor: number = this.currentScaleLevel): (sel: any) => void {
    return sel => {
      sel.attr('x', (markerSize * 2 + 16 + 2) / scaleFactor)
        .attr('dy', (0.5 * markerSize) / scaleFactor)
        .attr('font-size', 9 / scaleFactor)
    }
  }

  private setupMarkerFlag(scaleFactor: number = this.currentScaleLevel): (sel: any) => void {
    return sel => {
      sel.attr('x', (markerSize + 4) / scaleFactor)
        .attr('y', -(1.25 * markerSize) / scaleFactor)
        .attr('height', 16 / scaleFactor)
        .attr('width', 16 / scaleFactor)
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
      .style('visibility', function (d) {
        const inUse = select(this).attr('in-use');
        if (self.expertiseService.currentLevel === ExpertiseLevel.Developer) {
          return 'visible';
        }
        if (inUse === 'true') { // this is a string!!
          return 'visible';
        }
        if (d[0].ID === self.hoveredPin || d[1].ID === self.hoveredPin) {
          return 'visible';
        }
        return 'hidden';
      })
  }

  private updateHubData(sel: Selection<any, _PinModel, any, any>) {
    sel.attr('hub-id', d => d.ID)
      .attr('is-exit', d => d.isExit)
      .attr('in-use', d => this.activePins.has(d.ID))
      .attr('is-home', d => d.HopDistance === 1)
  }
}

const tweenDash = function (this: SVGPathElement) {
  const len = this.getTotalLength();
  const interpolate = interpolateString(`0, ${len}`, `${len}, ${len}`);
  return (t: number) => {
    if (t === 1) {
      return select(this).attr('in-use') === 'true' ? '0' : `${laneDashArray}`;
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
