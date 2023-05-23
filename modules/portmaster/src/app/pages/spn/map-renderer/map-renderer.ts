import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, ElementRef, EventEmitter, Input, OnDestroy, Output, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Line as D3Line, GeoPath, GeoPermissibleObjects, GeoProjection, Selection, ZoomTransform, geoMercator, geoPath, interpolateString, json, line, pointer, select, zoom, zoomIdentity } from 'd3';
import { BehaviorSubject } from 'rxjs';
import { feature } from 'topojson-client';
import { MapPin } from '../map.service';

export interface Path {
  id: string;
  points: (MapPin | [number, number])[];
  attributes?: {
    [key: string]: string;
  }
}

export interface PinEvent {
  event?: MouseEvent;
  mapPin: MapPin;
}

export interface CountryEvent {
  event?: MouseEvent;
  countryCode: string;
  countryName: string;
}

type MapRoot = Selection<SVGSVGElement, unknown, null, never>;
type WorldGroup = Selection<SVGGElement, unknown, null, unknown>
type PinGroup = Selection<SVGGElement, unknown, null, unknown>;
type LaneGroup = Selection<SVGGElement, unknown, null, unknown>;

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'spn-map-renderer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '',
  styleUrls: [
    './map-style.scss'
  ],
})
export class MapRendererComponent implements AfterViewInit, OnDestroy {
  static readonly Rotate = 0; // so [-0, 0] is the initial center of the projection
  static readonly Maxlat = 83; // clip northern and southern pols (infinite in mercator)
  static readonly MarkerSize = 4;
  static readonly LineAnimationDuration = 200;

  private destroyRef = inject(DestroyRef);
  private renderPaths$ = new BehaviorSubject<Path[]>([]);
  private renderPins$ = new BehaviorSubject<MapPin[]>([]);
  private highlightedPins = new Set<string>();

  readonly countryNames = new Map<string, string>();

  // SVG group elements
  private svg!: MapRoot;
  private worldGroup!: WorldGroup;
  private linesGroup!: LaneGroup;
  private pinsGroup!: PinGroup;

  // Projection and line rendering functions
  private projection!: GeoProjection;
  private lineFunc!: D3Line<(MapPin | [number, number])>;
  private pathFunc!: GeoPath<any, GeoPermissibleObjects>;

  @Input()
  set paths(paths: Path[]) {
    this.renderPaths$.next(paths);
  }

  @Input()
  set pins(pins: MapPin[]) {
    this.renderPins$.next(pins)
  }

  @Output()
  readonly pinHover = new EventEmitter<PinEvent | null>();

  @Output()
  readonly pinClick = new EventEmitter<PinEvent>();

  @Output()
  readonly countryHover = new EventEmitter<CountryEvent | null>()

  @Output()
  readonly countryClick = new EventEmitter<CountryEvent>();

  @Output()
  readonly zoomAndPan = new EventEmitter<void>();

  constructor(
    private mapRoot: ElementRef<HTMLElement>,
    private cdr: ChangeDetectorRef
  ) { }

  async ngAfterViewInit() {
    const map = select(this.mapRoot.nativeElement);

    // setup the basic SVG elements
    this.svg = map
      .append('svg')
      .attr('id', 'map')
      .attr("xmlns", "http://www.w3.org/2000/svg")
      .attr('width', '100%')
      .attr('preserveAspectRation', 'none')
      .attr('height', '100%')

    this.worldGroup = this.svg.append('g').attr('id', 'world-group')
    this.linesGroup = this.svg.append('g').attr('id', 'line-group')
    this.pinsGroup = this.svg.append('g').attr('id', 'pin-group')

    this.setupProjection();
    this.setupZoom();

    // we need to await the initial world render here because otherwise
    // the initial renderPins() will not be able to update the country attributes
    // and cause a delay before the state of the country (has-nodes, is-blocked, ...)
    // is visible.
    await this.renderWorld();

    this.renderPins$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(pins => this.renderPins(pins));

    this.renderPaths$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(paths => this.renderPaths(paths));
  }

  ngOnDestroy() {
    if (!this.svg) {
      return;
    }

    this.svg.remove();
  }

  private async renderPaths(paths: Path[]) {
    const self = this;
    const renderedPaths = this.linesGroup.selectAll<SVGPathElement, Path>('path')
      .data(paths, p => p.id);

    renderedPaths
      .enter()
      .append('path')
      .attr('d', path => {
        return self.lineFunc(path.points)
      })
      .call(sel => {
        if (sel.empty()) {
          return;
        }
        const data = sel.datum()?.attributes || {};
        Object.keys(data)
          .forEach(key => {
            sel.attr(key, data[key])
          })
      })
      .transition("enter-lane")
      .duration(d => d.points.length * MapRendererComponent.LineAnimationDuration)
      .attrTween('stroke-dasharray', tweenDashEnter)

    renderedPaths.exit()
      .interrupt("enter-lane")
      .transition("leave-lane")
      .duration(200)
      .attrTween('stroke-dasharray', tweenDashExit)
      .remove();
  }

  private async renderPins(pins: MapPin[]) {
    console.log(`[MAP] Rendering ${pins.length} pins`)

    const countriesWithNodes = new Set<string>();

    pins.forEach(pin => {
      countriesWithNodes.add(pin.entity.Country)
    })

    const pinElements = this.pinsGroup.selectAll<SVGGElement, MapPin>('g')
      .data(pins, pin => pin.pin.ID)

    const self = this;

    // add new pins
    pinElements
      .enter()
      .append('g')
      .append(d => {
        if (d.pin.HopDistance === 1) {
          const homeIcon = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
          homeIcon.setAttribute('r', `${MapRendererComponent.MarkerSize * 1.25}`)

          return homeIcon;
        }

        if (d.pin.VerifiedOwner === 'Safing') {
          const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon')
          polygon.setAttribute('points', `0,-${MapRendererComponent.MarkerSize} -${MapRendererComponent.MarkerSize},${MapRendererComponent.MarkerSize} ${MapRendererComponent.MarkerSize},${MapRendererComponent.MarkerSize}`)

          return polygon;
        }

        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
        circle.setAttribute('r', `${MapRendererComponent.MarkerSize}`)

        return circle;
      })
      .call(selection => {
        selection
          .style('opacity', 0)
          .attr('transform', d => 'scale(0)')
          .transition('enter-marker')
          /**/.duration(1000)
          /**/.attr('transform', d => `scale(1)`)
          /**/.style('opacity', 1)
      })
      .on('click', function (e: MouseEvent) {
        const pin = select(this).datum() as MapPin;
        self.pinClick.next({
          event: e,
          mapPin: pin
        });
      })
      .on('mouseenter', function (e: MouseEvent) {
        const pin = select(this).datum() as MapPin;
        self.pinHover.next({
          event: e,
          mapPin: pin,
        })
      })
      .on('mouseout', function (e: MouseEvent) {
        self.pinHover.next(null);
      })

    // remove pins from the map that disappeared
    pinElements
      .exit()
      .remove()

    // update all pins to their correct position and update their attributes
    this.pinsGroup.selectAll<SVGGElement, MapPin>('g')
      .attr('hub-id', d => d.pin.ID)
      .attr('is-home', d => d.pin.HopDistance === 1)
      .attr('transform', d => `translate(${this.projection([d.location.Longitude, d.location.Latitude])})`)
      .attr('in-use', d => d.isTransit)
      .attr('is-exit', d => d.isExit)
      .attr('raise', d => this.highlightedPins.has(d.pin.ID))

    // update the attributes of the country shapes
    this.worldGroup.selectAll<SVGGElement, any>('path')
      .attr('has-nodes', d => countriesWithNodes.has(d.properties.iso_a2))

    // get all in-use pins and raise them to the top
    this.pinsGroup.selectAll<SVGGElement, MapPin>('g[in-use=true]')
      .raise()

    // finally, re-raise all pins that are highlighted
    this.pinsGroup.selectAll<SVGGElement, MapPin>('g[raise=true]')
      .raise()

    const activeCountrySet = new Set<string>();
    pins.forEach(pin => {
      if (pin.isTransit) {
        activeCountrySet.add(pin.pin.ID)
      }
    })

    // update the in-use attributes of the country shapes
    this.worldGroup.selectAll<SVGPathElement, any>('path')
      .attr('in-use', d => activeCountrySet.has(d.properties.iso_a2))

    this.cdr.detectChanges();
  }

  private async renderWorld() {
    // load the world-map data and start rendering
    const world = await json<any>('/assets/world-50m.json');

    // actually render the countries
    const data = (feature(world, world.objects.countries) as any).features;
    const self = this;

    data.forEach((country: any) => {
      this.countryNames.set(country.properties.iso_a2, country.properties.name)
    })

    this.worldGroup.selectAll()
      .data<GeoPermissibleObjects>(data)
      .enter()
      .append('path')
      .attr('countryCode', (d: any) => d.properties.iso_a2)
      .attr('name', (d: any) => d.properties.name)
      .attr('d', this.pathFunc)
      .on('mouseenter', function (event: MouseEvent) {
        const country = select(this).datum() as any;
        self.countryHover.next({
          event: event,
          countryCode: country.properties.iso_a2,
          countryName: country.properties.name,
        })
      })
      .on('mouseout', function (event: MouseEvent) {
        self.countryHover.next(null)
      })
      .on('click', function (event: MouseEvent) {
        const country = select(this).datum() as any;
        self.countryClick.next({
          event: event,
          countryCode: country.properties.iso_a2,
          countryName: country.properties.name,
        })
      })
  }

  private setupProjection() {
    const width = this.mapRoot.nativeElement.getBoundingClientRect().width;
    const height = window.innerHeight;

    this.projection = geoMercator()
      .rotate([MapRendererComponent.Rotate, 0])
      .scale(1)
      .translate([width / 2, height / 2]);


    // path is used to update the SVG path to match our mercator projection
    this.pathFunc = geoPath().projection(this.projection);

    // we want to have straight lines between our hubs so we use a custom
    // path function that updates x and y coordinates based on the mercator projection
    // without, points will no be at the correct geo-coordinates.
    this.lineFunc = line<MapPin | [number, number]>()
      .x(d => {
        if (Array.isArray(d)) {
          return this.projection([d[0], d[1]])![0];
        }
        return this.projection([d.location.Longitude, d.location.Latitude])![0];
      })
      .y(d => {
        if (Array.isArray(d)) {
          return this.projection([d[0], d[1]])![1];
        }
        return this.projection([d.location.Longitude, d.location.Latitude])![1];
      })
  }

  private setupZoom() {
    const width = this.mapRoot.nativeElement.getBoundingClientRect().width;
    const height = window.innerHeight;

    // returns the top-left and the bottom-right of the current projection
    const mercatorBounds = () => {
      const yaw = this.projection.rotate()[0];
      const xymax = this.projection([-yaw + 180 - 1e-6, -MapRendererComponent.Maxlat])!;
      const xymin = this.projection([-yaw - 180 + 1e-6, MapRendererComponent.Maxlat])!;
      return [xymin, xymax];
    }

    const initialBounds = mercatorBounds();

    const s = width / (initialBounds[1][0] - initialBounds[0][0]);
    const scaleExtend = [s, 10 * s];
    const transform = zoomIdentity
      .scale(scaleExtend[0])
      .translate(this.projection.translate()[0], this.projection.translate()[1]);

    // scale the projection to the initial bounds
    this.projection.scale(scaleExtend[0]);

    // whenever the users zooms we need to update our groups
    // individually to apply the zoom effect.
    let tlast = {
      x: 0,
      y: 0,
      k: 0,
    }
    let z = zoom<SVGSVGElement, unknown>()
      .scaleExtent(scaleExtend as [number, number])
      .on('zoom', (e) => {
        const t: ZoomTransform = e.transform;

        if (t.k != tlast.k) {
          let p = pointer(e)
          let scrollToMouse = () => { };

          if (!!p && !!p[0]) {
            const tp = this.projection.translate();
            const coords = this.projection!.invert!(p)
            scrollToMouse = () => {
              const newPos = this.projection(coords!)!;
              const yaw = this.projection.rotate()[0];
              this.projection.translate([tp[0], tp[1] + (p[1] - newPos[1])])
              this.projection.rotate([yaw + 360.0 * (p[0] - newPos[0]) / width * scaleExtend[0] / t.k, 0, 0])
            }
          }

          this.projection.scale(t.k);
          scrollToMouse();

        } else {
          let dy = t.y - tlast.y;
          const dx = t.x - tlast.x;
          const yaw = this.projection.rotate()[0]
          const tp = this.projection.translate();

          // use x translation to rotate based on current scale
          this.projection.rotate([yaw + 360.0 * dx / width * scaleExtend[0] / t.k, 0, 0])
          // use y translation to translate projection clamped to bounds
          let bounds = mercatorBounds();
          if (bounds[0][1] + dy > 0) {
            dy = -bounds[0][1];
          } else if (bounds[1][1] + dy < height) {
            dy = height - bounds[1][1];
          }
          this.projection.translate([tp[0], tp[1] + dy]);
        }

        tlast = {
          x: t.x,
          y: t.y,
          k: t.k,
        }

        // finally, re-render the SVG shapes according to the new projection
        this.worldGroup.selectAll<SVGPathElement, GeoPermissibleObjects>('path')
          .attr('d', this.pathFunc)

        this.pinsGroup.selectAll<SVGGElement, MapPin>('g')
          .attr('transform', d => `translate(${this.projection([d.location.Longitude, d.location.Latitude])})`)

        this.linesGroup.selectAll<SVGPathElement, Path>('path')
          .attr('d', d => this.lineFunc(d.points))

        this.zoomAndPan.next();
      });

    this.svg.call(z)
    this.svg.call(z.transform, transform);
  }

  public getCoords(lat: number, lng: number) {
    const loc = this.projection([lng, lat]);
    if (!loc) {
      return null;
    }

    const rootElem = this.mapRoot.nativeElement.getBoundingClientRect();
    const x = rootElem.x + loc[0];
    const y = rootElem.y + loc[1];

    return [x, y];
  }

  public coordsInView(lat: number, lng: number) {
    const loc = this.projection([lng, lat]);
    if (!loc) {
      return false
    }

    const rootElem = this.mapRoot.nativeElement.getBoundingClientRect();
    const x = rootElem.x + loc[0];
    const y = rootElem.y + loc[1];

    return x >= rootElem.left && x <= rootElem.right && y >= rootElem.top && y <= rootElem.bottom;
  }

  public getPinElem(pinID: string) {
    return this.pinsGroup.select<SVGGElement>(`g[hub-id=${pinID}]`)
      .node()
  }

  public clearPinHighlights() {
    this.pinsGroup.select<SVGGElement>(`g[raise=true]`)
      .attr('raise', false)

    this.highlightedPins.clear();
  }

  public highlightPin(pinID: string, highlight: boolean) {
    if (highlight) {
      this.highlightedPins.add(pinID)
    } else {
      this.highlightedPins.delete(pinID);
    }
    const pinElemn = this.pinsGroup.select<SVGGElement>(`g[hub-id=${pinID}]`)
      .attr('raise', highlight)

    if (highlight) {
      pinElemn
        .raise()
    }
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

const tweenDashExit = function (this: SVGPathElement) {
  const len = this.getTotalLength();
  const interpolate = interpolateString(`${len}, ${len}`, `0, ${len}`);
  return (t: number) => {
    if (t === 1) {
      return `${len}`;
    }
    return interpolate(t);
  }
}
