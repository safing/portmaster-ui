import { coerceBooleanProperty, coerceNumberProperty } from '@angular/cdk/coercion';
import { AfterViewInit, Component, ElementRef, Input, OnChanges, OnInit, SimpleChange, SimpleChanges, ViewEncapsulation } from '@angular/core';
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
    .hideAxis path {
      display: none;
    }
    `
  ],
  templateUrl: './line-chart.html',
})
export class NetqueryLineChart implements OnChanges, OnInit, AfterViewInit {
  @Input()
  data: ChartResult[] = [];

  private width = 700;
  private height = 250;

  @Input()
  set margin(v: any) {
    this._margin = coerceNumberProperty(v);
  }
  get margin() { return this._margin; }
  private _margin = 20;

  svg!: Selection<any, any, any, any>;
  svgInner!: any;
  yScale!: any;
  xScale!: any;
  xAxis!: any;
  yAxis!: any;
  lineGroup!: any;

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

  private initializeChart(): void {
    this.svg = d3
      .select(this.chartElem.nativeElement)
      .select('.linechart')
      .append('svg')
      .attr('height', '100%');
    this.svgInner = this.svg

      .append('g')
      .style('transform', 'translate(' + this.margin + 'px, ' + this.margin + 'px)');

    this.yScale = d3
      .scaleLinear()
      .domain([d3.max(this.data, d => d.value)! + 1, 0])
      .range([0, this.height - 2 * this.margin]);

    this.data.sort((a, b) => a.timestamp - b.timestamp)

    this.xScale = d3.scaleTime().domain(d3.extent(this.data, d => d.timestamp * 1000) as any);

    if (this.showAxis) {
      this.yAxis = this.svgInner
        .append('g')
        .attr('id', 'y-axis')
        .attr('class', 'text-secondary text-opacity-50 hideAxis')
        .style('transform', 'translate(' + this.margin + 'px,  0)');

      this.xAxis = this.svgInner
        .append('g')
        .attr('id', 'x-axis')
        .attr('class', 'text-secondary text-opacity-50 hideAxis')
        .style('transform', 'translate(0, ' + (this.height - 2 * this.margin) + 'px)');
    }

    this.lineGroup = this.svgInner
      .append('g')
      .append('path')
      .attr('id', 'line')
      .style('fill', 'none')
      .style('stroke', 'currentColor')
      .style('stroke-width', '1')
  }

  private drawChart(): void {
    this.width = this.chartElem.nativeElement.getBoundingClientRect().width;
    this.height = this.chartElem.nativeElement.getBoundingClientRect().height;
    this.svg.attr('width', this.width);

    this.xScale.range([this.margin, this.width - 2 * this.margin]);

    if (this.showAxis) {
      const xAxis = d3
        .axisBottom(this.xScale)
        .ticks(4)
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

    const points: [number, number][] = this.data.map(d => [
      this.xScale(new Date(d.timestamp * 1000)),
      this.yScale(d.value),
    ]);

    this.lineGroup.attr('d', line(points));
  }
}
