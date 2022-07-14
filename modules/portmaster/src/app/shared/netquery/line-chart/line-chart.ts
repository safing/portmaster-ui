import { coerceBooleanProperty, coerceNumberProperty } from '@angular/cdk/coercion';
import { AfterViewInit, Component, ElementRef, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import * as d3 from 'd3';
import { Selection } from 'd3';
import { ChartResult } from 'src/app/services';
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
export class SfngNetqueryLineChart implements OnChanges, OnInit, AfterViewInit {
  @Input()
  data: ChartResult[] = [];

  private width = 700;
  private height = 250;

  @Input()
  set margin(v: any) {
    this._margin = coerceNumberProperty(v);
  }
  get margin() { return this._margin; }
  private _margin = 0;

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

  constructor(public chartElem: ElementRef) {
  }

  ngOnInit() {
    // remove event listener when done
    window.addEventListener('resize', () => this.drawChart());
  }

  ngAfterViewInit(): void {
    if (!!this.svg) {
      this.svg.remove();
    }
    this.initializeChart();
    this.drawChart();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.hasOwnProperty('data') && this.data) {
      if (!!this.svg) {
        this.svg.remove();
      }
      this.initializeChart();
      this.drawChart();
    }
  }

  get yMargin() {
    if (this.showAxis) {
      return 16;
    }
    return 0;
  }

  private initializeChart(): void {
    this.svg = d3
      .select(this.chartElem.nativeElement)
      .append('svg')

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
      .attr("class", "active-area text-green-100")

    this.svgInner
      .append('path')
      .attr("fill", "currentColor")
      .attr("class", "blocked-area text-red-100")

    this.activeConnGroup = this.svgInner
      .append('g')
      .append('path')
      .attr('id', 'line')
      .style('fill', 'none')
      .style('stroke', 'currentColor')
      .style('stroke-width', '1')
      .attr('class', 'text-green-300')

    this.blockedConnGroup = this.svgInner
      .append('g')
      .append('path')
      .attr('id', 'blocked-line')
      .style('fill', 'none')
      .style('stroke', 'currentColor')
      .style('stroke-width', '1')
      .attr("class", "text-red-300")

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
    this.width = this.chartElem.nativeElement.getBoundingClientRect().width;
    this.height = this.chartElem.nativeElement.getBoundingClientRect().height;
    this.svg.attr('width', this.width);
    this.svg.attr('height', this.height);

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

    const blockedConnPoints: [number, number][] = this.data.map(d => [
      this.xScale(new Date(d.timestamp * 1000)),
      this.yScale(d.countBlocked),
    ]);

    this.blockedConnGroup.attr('d', line(blockedConnPoints))

    this.svgInner.selectAll('.active-area')
      .data([activeConnPoints])
      .attr('d', area(activeConnPoints))

    this.svgInner.selectAll('.blocked-area')
      .data([blockedConnPoints])
      .attr('d', area(blockedConnPoints))

    this.blockedConnGroup.attr('d', line(blockedConnPoints));

    this.activeConnGroup.attr('d', line(activeConnPoints))

  }
}
