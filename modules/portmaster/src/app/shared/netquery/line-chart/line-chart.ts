import { coerceBooleanProperty, coerceNumberProperty } from '@angular/cdk/coercion';
import { AfterViewInit, Component, DestroyRef, ElementRef, Input, OnChanges, OnInit, SimpleChanges, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ChartResult } from '@safing/portmaster-api';
import * as d3 from 'd3';
import { Selection } from 'd3';
import { AppComponent } from 'src/app/app.component';
import { timeAgo } from '../../pipes';

@Component({
  selector: 'sfng-netquery-line-chart',
  styles: [
    `
    :host {
      @apply block;
    }
    `
  ],
  template: '',
})
export class SfngNetqueryLineChartComponent implements OnChanges, OnInit, AfterViewInit {
  private destroyRef = inject(DestroyRef);

  @Input()
  data: ChartResult[] = [];

  @Input()
  set hideBlocked(v: any) {
    this._hideBlockedConnections = coerceBooleanProperty(v);
  }
  get hideBlocked() { return this._hideBlockedConnections; }
  private _hideBlockedConnections = false;

  private width = 700;
  private height = 250;

  @Input()
  set margin(v: any) {
    this._margin = coerceNumberProperty(v);
  }
  get margin() { return this._margin; }
  private _margin = 0;

  @Input()
  activeConnectionColor = 'text-green-300';

  @Input()
  blockedConnectionColor = 'text-red-300';

  @Input()
  activeConnectionAreaColor = 'text-green-100';

  @Input()
  blockedConnectionAreaColor = 'text-red-100';


  svg!: Selection<any, any, any, any>;
  svgInner!: any;
  yScale!: any;
  xScale!: any;
  xAxis!: any;
  yAxis!: any;
  activeConnGroup!: any;
  blockedConnGroup!: any;

  @Input()
  set showAxis(v: any) {
    this._showAxis = coerceBooleanProperty(v);
  }
  get showAxis() {
    return this._showAxis;
  }
  private _showAxis = true;

  constructor(
    public chartElem: ElementRef,
    private app: AppComponent
  ) { }

  private requestedAnimationFrame: any;
  ngOnInit() {
    this.app.onContentSizeChange$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (!!this.requestedAnimationFrame) {
          cancelAnimationFrame(this.requestedAnimationFrame);
        }

        this.requestedAnimationFrame = requestAnimationFrame(() => {
          this.redraw();
          this.requestedAnimationFrame = undefined;
        })
      })
  }

  ngAfterViewInit(): void {
    this.redraw();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.hasOwnProperty('data') && this.data) {
      this.redraw();
    }
  }

  get yMargin() {
    if (this.showAxis) {
      return 16;
    }
    return 0;
  }

  private redraw(event?: Event) {
    if (!!this.svg) {
      this.svg.remove();
    }

    this.initializeChart();
    this.drawChart();
  }

  private initializeChart(): void {
    this.width = this.chartElem.nativeElement.getBoundingClientRect().width;
    this.height = this.chartElem.nativeElement.getBoundingClientRect().height;

    this.svg = d3
      .select(this.chartElem.nativeElement)
      .append('svg')

    this.svg.attr('width', this.width);
    this.svg.attr('height', this.height);

    this.svgInner = this.svg
      .append('g')
      .attr('height', '100%');


    this.yScale = d3
      .scaleLinear()
      .domain([d3.max(this.data, d => d.value + d.countBlocked)! + 1, 0])
      .range([0, this.height - this.yMargin]);

    this.data.sort((a, b) => a.timestamp - b.timestamp)

    const now = new Date();
    this.xScale = d3.scaleTime().domain([new Date(now.getTime() - 10 * 60 * 1000), now]);

    this.svgInner
      .append('path')
      .attr("fill", "currentColor")
      .attr("class", "active-area " + this.activeConnectionAreaColor)

    this.svgInner
      .append('path')
      .attr("fill", "currentColor")
      .attr("class", "blocked-area " + this.blockedConnectionAreaColor)

    this.activeConnGroup = this.svgInner
      .append('g')
      .append('path')
      .attr('id', 'line')
      .style('fill', 'none')
      .style('stroke', 'currentColor')
      .style('stroke-width', '1')
      .attr('class', this.activeConnectionColor)

    if (!this._hideBlockedConnections) {
      this.blockedConnGroup = this.svgInner
        .append('g')
        .append('path')
        .attr('id', 'blocked-line')
        .style('fill', 'none')
        .style('stroke', 'currentColor')
        .style('stroke-width', '1')
        .attr("class", this.blockedConnectionColor)
    }

    if (this.showAxis) {
      this.yAxis = this.svgInner
        .append('g')
        .attr('id', 'y-axis')
        .attr('class', 'text-secondary text-opacity-75 ')
        .style('transform', 'translate(' + (this.width - this.yMargin) + 'px,  0)');

      this.xAxis = this.svgInner
        .append('g')
        .attr('id', 'x-axis')
        .attr('class', 'text-secondary text-opacity-50 ')
        .style('transform', 'translate(0, ' + (this.height - this.yMargin) + 'px)');
    }

  }

  private drawChart(): void {

    this.xScale.range([0, this.width - this.yMargin]);

    if (this.showAxis) {
      const xAxis = d3
        .axisBottom(this.xScale)
        .ticks(5)
        .tickFormat((val, idx) => {
          return timeAgo(val as any);
        })

      this.xAxis.call(xAxis);

      const yAxis = d3
        .axisLeft(this.yScale)
        .ticks(2)

      this.yAxis.call(yAxis);
    }

    const line = d3
      .line()
      .x(d => d[0])
      .y(d => d[1])
      .curve(d3.curveMonotoneX);

    // define the area
    const area = d3.area()
      .x(d => d[0])
      .y0(this.height - this.yMargin)
      .y1(d => d[1])
      .curve(d3.curveMonotoneX)

    const activeConnPoints: [number, number][] = this.data.map(d => [
      this.xScale(new Date(d.timestamp * 1000)),
      this.yScale(d.value + d.countBlocked),
    ]);

    this.svgInner.selectAll('.active-area')
      .data([activeConnPoints])
      .attr('d', area(activeConnPoints))

    if (!this.hideBlocked) {
      const blockedConnPoints: [number, number][] = this.data.map(d => [
        this.xScale(new Date(d.timestamp * 1000)),
        this.yScale(d.countBlocked),
      ]);
      this.blockedConnGroup.attr('d', line(blockedConnPoints))

      this.svgInner.selectAll('.blocked-area')
        .data([blockedConnPoints])
        .attr('d', area(blockedConnPoints))

      this.blockedConnGroup.attr('d', line(blockedConnPoints));
    }

    this.activeConnGroup.attr('d', line(activeConnPoints))
  }
}
