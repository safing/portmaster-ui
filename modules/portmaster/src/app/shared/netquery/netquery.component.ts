import { coerceArray } from "@angular/cdk/coercion";
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnDestroy, OnInit, TrackByFunction } from "@angular/core";
import { forkJoin, Observable, of, Subject } from "rxjs";
import { catchError, debounceTime, map, switchMap } from "rxjs/operators";
import { ChartResult, Condition, Netquery, NetqueryConnection, PossilbeValue, Query, QueryResult, Select, Verdict } from "src/app/services";
import { ActionIndicatorService } from "../action-indicator";
import { ExpertiseService } from "../expertise";
import { SfngSearchbarFields } from "./searchbar";
import { SfngTagbarValue } from "./tag-bar";

interface Suggestion<T = any> extends PossilbeValue<T> {
  count: number;
}

interface Model<T> {
  suggestions: Suggestion<T>[];
  searchValues: any[];
  visible: boolean;
}


const freeTextSearchFields: (keyof Partial<NetqueryConnection>)[] = [
  'domain',
  'as_owner',
  'path',
]

const groupByKeys: (keyof Partial<NetqueryConnection>)[] = [
  'domain',
  'as_owner',
  'country',
  'direction',
  'path'
]

const orderByKeys: (keyof Partial<NetqueryConnection>)[] = [
  'domain',
  'as_owner',
  'country',
  'direction',
  'path',
  'started',
  'ended'
]

@Component({
  selector: 'sfng-netquery-viewer',
  templateUrl: './netquery.component.html',
  styles: [
    `
    :host {
      @apply flex flex-col h-full gap-3 overflow-hidden;
    }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SfngNetqueryViewer implements OnInit, OnDestroy {

  /** @private - used to trigger a reload of the current filter */
  private search$ = new Subject();

  /** @private - emits and completed when the component is destroyed */
  private destroy$ = new Subject();

  results: QueryResult[] = [];

  /** The value of the free-text search */
  textSearch: string = '';

  /** a list of allowed group-by keys */
  readonly allowedGroupBy = groupByKeys;

  /** a list of allowed order-by keys */
  readonly allowedOrderBy = orderByKeys;

  /** @private - whether or not we are currently loading data */
  loading = false;

  /** @private - the total amount of results */
  totalCount = 0;

  /** @private - the chart data */
  chartData: ChartResult[] = [];

  constructor(
    private netquery: Netquery,
    private expertise: ExpertiseService,
    private cdr: ChangeDetectorRef,
    private actionIndicator: ActionIndicatorService
  ) { }

  @Input()
  set filters(v: any) {
    v = coerceArray(v);
    Object.keys(this.models).forEach((key: any) => {
      this.models[key as keyof NetqueryConnection]!.visible = false;
    })

    v.forEach((val: any) => {
      if (typeof val !== 'string') {
        throw new Error("invalid value for @Input() filters")
      }

      if (!this.isValidFilter(val)) {
        throw new Error('invalid filter key ' + val)
      }

      this.models[val]!.visible = true;
    })
  }

  /** @private Holds the value displayed in the tag-bar */
  tagbarValues: SfngTagbarValue[] = [];

  models: { [key in keyof Partial<NetqueryConnection>]: Model<any> } = {
    domain: {
      searchValues: [],
      suggestions: [],
      visible: true,
    },
    path: {
      searchValues: [],
      suggestions: [],
      visible: true,
    },
    as_owner: {
      searchValues: [],
      suggestions: [],
      visible: true,
    },
    country: {
      searchValues: [],
      suggestions: [],
      visible: true,
    }
  }

  keyTranslation: { [key: string]: string } = {
    domain: "Domain",
    path: "Application",
    as_owner: "Organization",
    country: "Country",
    direction: 'Direction',
    started: 'Started',
    ended: 'Ended'
  }

  groupByKeys: string[] = [];
  orderByKeys: string[] = [];

  ngOnInit(): void {
    this.search$
      .pipe(
        debounceTime(1000),
        switchMap(() => {
          this.loading = true;
          this.cdr.markForCheck();

          const query = this.getQuery();

          return forkJoin({
            results: this.netquery.query(query)
              .pipe(
                catchError(err => {
                  this.actionIndicator.error(
                    'Internal Error',
                    'Failed to perform search: ' + this.actionIndicator.getErrorMessgae(err)
                  );

                  return of([] as QueryResult[]);
                }),
              ),
            chart: this.netquery.activeConnectionChart(query.query!)
              .pipe(
                catchError(err => {
                  this.actionIndicator.error(
                    'Internal Error',
                    'Failed to load chart: ' + this.actionIndicator.getErrorMessgae(err)
                  );

                  return of([] as ChartResult[]);
                }),
              ),
            totalCount: this.groupByKeys.length === 0
              ? this.netquery.query({
                query: query.query,
                select: { $count: { field: '*', as: 'totalCount' } },
              }).pipe(map(result => result[0].totalCount || null))
              : of(null),
          })
        }),
      )
      .subscribe(result => {
        this.results = (result.results || []).map(r => {
          const grpFilter: Condition = {};
          this.groupByKeys.forEach(key => {
            grpFilter[key] = r[key];
          })

          return {
            ...r,
            _chart: this.groupByKeys.length > 0 ? this.getGroupChart(grpFilter) : null,
          }
        });
        this.chartData = result.chart;
        if (result.totalCount === null) {
          this.totalCount = result.results?.length || 0;
        } else {
          this.totalCount = result.totalCount;
        }
        this.loading = false;
        this.cdr.markForCheck();
      })
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.search$.complete();
  }

  getGroupChart(groupFilter: Condition): Observable<ChartResult[]> {
    const query = this.getQuery().query || {};

    Object.keys(groupFilter).forEach(key => {
      query[key] = [groupFilter[key] as any];
    });

    return this.netquery.activeConnectionChart(query);
  }

  loadSuggestion(field: string): void;
  loadSuggestion<T extends keyof NetqueryConnection>(field: T) {
    const search = this.getQuery([field]);

    this.netquery.query({
      select: [
        field,
        {
          $count: {
            field: "*",
            as: "count"
          },
        }
      ],
      query: search.query,
      groupBy: [
        field,
      ],
      orderBy: [{ field: "count", desc: true }]
    })
      .subscribe(result => {
        // create a set that we can use to lookup if a value
        // is currently selected.
        // This is needed to ensure selected values are sorted to the top.
        let currentlySelected = new Set<any>();
        this.models[field]!.searchValues.forEach(
          val => currentlySelected.add(val)
        );

        this.models[field]!.suggestions =
          result.map(record => ({
            Name: record[field]!,
            Value: record[field]!,
            Description: '',
            count: record.count,
          }))
            .sort((a, b) => {
              const hasA = currentlySelected.has(a.Value);
              const hasB = currentlySelected.has(b.Value);

              if (hasA && !hasB) {
                return -1;
              }
              if (hasB && !hasA) {
                return 1;
              }

              return b.count - a.count;
            }) as any;

        this.cdr.markForCheck();
      })
  }

  /** @private Callback for keyboard events on the search-input */
  onFieldsParsed(fields: SfngSearchbarFields) {
    const allowedKeys = new Set<string>();
    Object.keys(this.models).forEach(key => allowedKeys.add(key));

    Object.keys(fields).forEach(key => {
      if (!allowedKeys.has(key)) {
        this.actionIndicator.error("Invalid search query", "Column " + key + " is not allowed for filtering");
        return;
      }

      fields[key as keyof NetqueryConnection]!.forEach(val => {
        // quick fix to make sure domains always end in a period.
        if (key === 'domain' && typeof val === 'string' && !val.endsWith('.')) {
          val = `${val}.`
        }

        if (typeof val === 'object' && '$ne' in val) {
          this.actionIndicator.error("NOT conditions are not yet supported")
          return;
        }

        const k = key as keyof NetqueryConnection;
        this.models[k]!.searchValues = [
          ...this.models[k]!.searchValues,
          val,
        ]
      })
    })

    this.cdr.markForCheck();

    this.performSearch();
  }

  /** @private Query the portmaster service for connections matching the current settings */
  performSearch() {
    this.updateTagbarValues();
    this.search$.next();

  }

  /** @private Constructs a query from the current page settings. Supports excluding certain fields from the query. */
  getQuery(excludeFields: string[] = []): Query {
    let query: Condition = {}

    // create the query conditions for all keys on this.models
    const keys: (keyof NetqueryConnection)[] = Object.keys(this.models) as any;
    keys.forEach((key: keyof NetqueryConnection) => {
      if (excludeFields.includes(key)) {
        return;
      }

      if (this.models[key]!.searchValues.length > 0) {
        query[key] = {
          $in: this.models[key]!.searchValues,
        }
      }
    })

    if (this.expertise.currentLevel !== 'developer') {
      query["internal"] = {
        $eq: false,
      }
    }

    if (this.textSearch !== '') {
      freeTextSearchFields.forEach(key => {
        let existing = query[key];
        if (existing === undefined) {
          existing = [];
        } else {
          if (!Array.isArray(existing)) {
            existing = [existing];
          }
        }

        existing.push({
          $like: "%" + this.textSearch + "%"
        })
        query[key] = existing;
      });
    }

    let select: (Select | string)[] | undefined = undefined;
    if (this.groupByKeys.length > 0) {
      // we always want to show the total and the number of allowed connections
      // per group so we need to add those to the select part of the query
      select = [
        {
          $count: {
            field: "*",
            as: "totalCount",
          },
        },
        {
          $sum: {
            condition: {
              verdict: {
                $in: [
                  Verdict.Accept,
                  Verdict.RerouteToNs,
                  Verdict.RerouteToTunnel
                ],
              }
            },
            as: "countAllowed"
          }
        },
        ...this.groupByKeys,
      ]
    }

    return {
      select: select,
      query: query,
      groupBy: this.groupByKeys,
      orderBy: this.orderByKeys,
    }
  }

  /** @private Updates the current model form all values emited by the tag-bar. */
  onTagbarChange(tagKinds: SfngTagbarValue[]) {
    Object.keys(this.models).forEach(key => {
      this.models[key as keyof NetqueryConnection]!.searchValues = [];
    });

    tagKinds.forEach(kind => {
      this.models[kind.key as keyof NetqueryConnection]!.searchValues = kind.values;
    })

    this.performSearch();
  }

  /** Updates the {@link tagbarValues} from {@link models}*/
  private updateTagbarValues() {
    this.tagbarValues = [];
    Object.keys(this.models)
      .sort() // make sure we always output values in a constant order
      .forEach(modelKey => {
        const values = this.models[modelKey as keyof NetqueryConnection]!.searchValues;
        if (values.length > 0) {
          this.tagbarValues.push({
            key: modelKey,
            values: values,
          })
        }
      })
  }

  private isValidFilter(key: string): key is keyof NetqueryConnection {
    return Object.keys(this.models).includes(key);
  }

  trackSuggestion: TrackByFunction<Suggestion> = (_: number, s: Suggestion) => s.Value;



  //
  // Debug-Code
  //
  collapseQueryInspector = true;
}
