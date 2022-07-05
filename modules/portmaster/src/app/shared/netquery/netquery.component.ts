import { coerceArray } from "@angular/cdk/coercion";
import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnDestroy, OnInit, QueryList, TemplateRef, TrackByFunction, ViewChildren } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { combineLatest, forkJoin, Observable, of, Subject } from "rxjs";
import { catchError, debounceTime, map, switchMap, takeUntil } from "rxjs/operators";
import { ChartResult, Condition, Netquery, NetqueryConnection, PossilbeValue, Query, QueryResult, Select, Verdict } from "src/app/services";
import { ActionIndicatorService } from "../action-indicator";
import { ExpertiseService } from "../expertise";
import { Datasource, DynamicItemsPaginator } from "../pagination";
import { objKeys } from "../utils";
import { NetqueryHelper } from "./connection-helper.service";
import { SfngSearchbarFields } from "./searchbar";
import { SfngTagbarValue } from "./tag-bar";
import { Parser } from "./textql";
import { connectionFieldTranslation, mergeConditions } from "./utils";

interface Suggestion<T = any> extends PossilbeValue<T> {
  count: number;
}

interface Model<T> {
  suggestions: Suggestion<T>[];
  searchValues: any[];
  visible: boolean;
  decodeValue?: (val: string) => T,
  encodeValue?: (val: T) => string,
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
  'path',
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

interface LocalQueryResult extends QueryResult {
  _chart: Observable<ChartResult[]> | null;
  _group: Observable<DynamicItemsPaginator<NetqueryConnection>> | null;
}

@Component({
  selector: 'sfng-netquery-viewer',
  templateUrl: './netquery.component.html',
  providers: [
    NetqueryHelper,
  ],
  styles: [
    `
    :host {
      @apply flex flex-col gap-3 pr-3 min-h-full;
    }

    .protip pre {
      @apply inline-block text-xxs uppercase rounded-sm bg-gray-500 bg-opacity-25 font-mono border-gray-500 border px-0.5;
    }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SfngNetqueryViewer implements OnInit, OnDestroy, AfterViewInit {
  /** @private Used to trigger a reload of the current filter */
  private search$ = new Subject();

  /** @private Emits and completed when the component is destroyed */
  private destroy$ = new Subject();

  /** Used to trigger an update of all displayed values in the tag-bar. */
  private updateTagBar$ = new Subject<void>();

  /** @private Whether or not the next update on ActivatedRoute should be ignored */
  private skipNextRouteUpdate = false;

  /** @private Whether or not we should update the URL when performSearch() finishes */
  private skipUrlUpdate = false;

  /** @private - The paginator used for the result set */
  paginator!: DynamicItemsPaginator<LocalQueryResult>;

  /** The value of the free-text search */
  textSearch: string = '';

  /** a list of allowed group-by keys */
  readonly allowedGroupBy = groupByKeys;

  /** a list of allowed order-by keys */
  readonly allowedOrderBy = orderByKeys;

  /** @private Whether or not we are currently loading data */
  loading = false;

  /** @private The chart data */
  chartData: ChartResult[] = [];

  @ViewChildren('proTip', { read: TemplateRef })
  proTips!: QueryList<TemplateRef<any>>

  proTipIdx = 0;

  constructor(
    private netquery: Netquery,
    private helper: NetqueryHelper,
    private expertise: ExpertiseService,
    private cdr: ChangeDetectorRef,
    private actionIndicator: ActionIndicatorService,
    private route: ActivatedRoute,
    private router: Router,
  ) { }

  @Input()
  set filters(v: any | keyof this['models'] | (keyof this['models'])[]) {
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

  @Input()
  mergeFilter: Condition | null = null;

  /** @private Holds the value displayed in the tag-bar */
  tagbarValues: SfngTagbarValue[] = [];

  models: { [key in keyof NetqueryConnection]?: Model<any> } = initializeModels({
    domain: {
      visible: true,
    },
    path: {
      visible: true,
    },
    as_owner: {
      visible: true,
    },
    country: {
      visible: true,
    },
    internal: {},
    allowed: {},
    type: {},
    tunneled: {},
    encrypted: {},
    scope: {},
    verdict: {
      decodeValue: (val: string) => Verdict[val as any],
      encodeValue: (val: any) => Verdict[val],
    },
    started: {},
    ended: {},
    profile_revision: {},
    remote_ip: {},
    remote_port: {},
    local_ip: {},
    local_port: {},
    profile: {},
    direction: {},
    exit_node: {},
  })

  keyTranslation = connectionFieldTranslation;

  groupByKeys: string[] = [];
  orderByKeys: string[] = [];

  ngOnInit(): void {
    const dataSource: Datasource<LocalQueryResult> = {
      view: (page: number, pageSize: number) => {
        const query = this.getQuery();
        query.page = page - 1; // UI starts at page 1 while the backend is 0-based
        query.pageSize = pageSize;

        return this.netquery.query(query)
          .pipe(
            map(results => {
              return (results || []).map(r => {
                const grpFilter: Condition = {};
                this.groupByKeys.forEach(key => {
                  grpFilter[key] = r[key];
                })

                return {
                  ...r,
                  _chart: this.groupByKeys.length > 0 ? this.getGroupChart(grpFilter) : null,
                  _group: this.groupByKeys.length > 0 ? this.lazyLoadGroup(grpFilter) : null,
                }
              });
            })
          );
      }
    }

    this.paginator = new DynamicItemsPaginator(dataSource)

    this.search$
      .pipe(
        debounceTime(1000),
        switchMap(() => {
          this.loading = true;
          this.cdr.markForCheck();

          const query = this.getQuery();

          return forkJoin({
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
            totalCount: this.netquery.query({
              ...query,
              select: { $count: { field: '*', as: 'totalCount' } },
            })
              .pipe(
                map(result => {
                  if (this.groupByKeys.length === 0) {
                    return result[0].totalCount;
                  }
                  return result.length;
                })
              )
          })
        }),
      )
      .subscribe(result => {
        this.chartData = result.chart;

        // reset the paginator with the new total result count and
        // open the first page.
        this.paginator.reset(result.totalCount);

        // update the current URL to include the new search
        // query and make sure we skip the update
        if (!this.skipUrlUpdate) {
          this.skipNextRouteUpdate = true;
          this.router.navigate([], {
            relativeTo: this.route,
            queryParams: {
              ...this.route.snapshot.queryParams,
              q: this.getQueryString(),
            }
          })
        }
        this.skipUrlUpdate = false;

        this.loading = false;
        this.cdr.markForCheck();
      })

    this.route.queryParamMap
      .pipe(
        takeUntil(this.destroy$),
      )
      .subscribe(params => {
        if (this.skipNextRouteUpdate) {
          this.skipNextRouteUpdate = false;
          return;
        }

        const query = params.get("q")

        if (query !== null) {
          objKeys(this.models).forEach(key => {
            this.models[key]!.searchValues = [];
          })

          const result = Parser.parse(query!)

          this.onFieldsParsed(result.conditions);
          this.textSearch = result.textQuery;
        }

        this.skipUrlUpdate = true;
        this.performSearch();
      })

    this.helper.onFieldsAdded()
      .pipe(takeUntil(this.destroy$))
      .subscribe(fields => this.onFieldsParsed(fields))

    this.updateTagBar$
      .pipe(
        takeUntil(this.destroy$),
        switchMap(() => {
          const obs: Observable<{ [key: string]: (PossilbeValue & QueryResult)[] }>[] = [];

          objKeys(this.models)
            .sort() // make sure we always output values in a constant order
            .forEach(modelKey => {
              const values = this.models[modelKey as keyof NetqueryConnection]!.searchValues;

              if (values.length > 0) {
                obs.push(
                  this.helper.transformValues(modelKey)(of(values.map(val => ({
                    [modelKey]: val,
                  }))))
                    .pipe(map(result => ({
                      [modelKey]: result,
                    })))
                )
              }
            })

          return combineLatest(obs);
        })
      )
      .subscribe(tagBarValues => {
        this.tagbarValues = [];
        tagBarValues.forEach(obj => {
          objKeys(obj).forEach(key => {
            if (obj[key].length > 0) {
              this.tagbarValues.push({
                key: key as string,
                values: obj[key],
              })
            }
          })
        })

        console.log("tagBarValues", this.tagbarValues);

        this.cdr.markForCheck();
      })
  }

  ngAfterViewInit(): void {
    this.proTipIdx = Math.floor(Math.random() * this.proTips.length);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.search$.complete();
    this.helper.dispose();
  }

  lazyLoadGroup(groupFilter: Condition): Observable<DynamicItemsPaginator<NetqueryConnection>> {
    return new Observable(observer => {
      this.netquery.query({
        query: groupFilter,
        select: [
          { $count: { field: "*", as: "totalCount" } }
        ],
        orderBy: [
          { field: 'started', desc: true },
          { field: 'ended', desc: true }
        ],
      }).subscribe(result => {
        const paginator = new DynamicItemsPaginator<NetqueryConnection>({
          view: (pageNumber: number, pageSize: number) => {
            return this.netquery.query({
              query: groupFilter,
              orderBy: [
                { field: 'started', desc: true },
                { field: 'ended', desc: true }
              ],
              page: pageNumber - 1,
              pageSize: pageSize,
            }) as Observable<NetqueryConnection[]>;
          }
        }, 25)

        paginator.reset(result[0]?.totalCount || 0)

        observer.next(paginator)
      })
    })
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
            Name: this.models[field]!.encodeValue ? this.models[field]!.encodeValue!(record[field]!) : record[field],
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
    const allowedKeys = new Set(objKeys(this.models));

    objKeys(fields).forEach(key => {
      if (!allowedKeys.has(key)) {
        this.actionIndicator.error("Invalid search query", "Column " + key + " is not allowed for filtering");
        return;
      }

      fields[key]!.forEach(val => {
        // quick fix to make sure domains always end in a period.
        if (key === 'domain' && typeof val === 'string' && val.length > 0 && !val.endsWith('.')) {
          val = `${val}.`
        }

        if (typeof val === 'object' && '$ne' in val) {
          this.actionIndicator.error("NOT conditions are not yet supported")
          return;
        }

        // avoid duplicates
        if (this.models[key]!.searchValues.includes(val)) {
          return;
        }

        this.models[key]!.searchValues = [
          ...this.models[key]!.searchValues,
          val,
        ]
      })
    })

    this.cdr.markForCheck();

    this.performSearch();
  }

  /** @private Query the portmaster service for connections matching the current settings */
  performSearch() {
    this.loading = true;
    this.paginator.clear()
    this.updateTagbarValues();
    this.search$.next();
  }

  /** @private Returns the current query in it's string representation */
  getQueryString(): string {
    let result = '';

    objKeys(this.models).forEach(key => {
      this.models[key]?.searchValues.forEach(val => {
        // we use JSON.stringify here to make sure the value is
        // correclty quoted.
        result += `${key}:${JSON.stringify(val)} `;
      })
    })

    if (result.length > 0 && this.textSearch.length > 0) {
      result += ' '
    }

    result += `${this.textSearch}`

    return result;
  }

  /** @private Copies the current query into the user clipboard */
  copyQuery() {
    if ('clipboard' in window.navigator) {
      window.navigator.clipboard.writeText(this.getQueryString())
        .then(() => {
          this.actionIndicator.success("Query copied to clipboard", 'Go ahead and share your query!')
        })
        .catch((err) => {
          this.actionIndicator.error('Failed to copy to clipboard', this.actionIndicator.getErrorMessgae(err))
        })
    }
  }

  /** @private Clears the current query */
  clearQuery() {
    objKeys(this.models).forEach(key => {
      this.models[key]!.searchValues = [];
    })
    this.textSearch = '';

    this.updateTagbarValues();
    this.performSearch();
  }

  /** @private Constructs a query from the current page settings. Supports excluding certain fields from the query. */
  getQuery(excludeFields: string[] = []): Query {
    let query: Condition = {}
    let textSearch: Query['textSearch'];

    // create the query conditions for all keys on this.models
    objKeys(this.models).forEach((key: keyof NetqueryConnection) => {
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
      textSearch = {
        fields: freeTextSearchFields,
        value: this.textSearch
      }
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

    let normalizedQuery = mergeConditions(query, this.mergeFilter || {})

    return {
      select: select,
      query: normalizedQuery,
      groupBy: this.groupByKeys,
      orderBy: this.orderByKeys,
      textSearch,
    }
  }

  /** @private Updates the current model form all values emited by the tag-bar. */
  onTagbarChange(tagKinds: SfngTagbarValue[]) {
    objKeys(this.models).forEach(key => {
      this.models[key]!.searchValues = [];
    });

    tagKinds.forEach(kind => {
      this.models[kind.key as keyof NetqueryConnection]!.searchValues = kind.values;
    })

    this.performSearch();
  }

  /** Updates the {@link tagbarValues} from {@link models}*/
  private updateTagbarValues() {
    /*
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
    */
    this.updateTagBar$.next();
  }

  private isValidFilter(key: string): key is keyof NetqueryConnection {
    return Object.keys(this.models).includes(key);
  }

  useAsFilter(rec: QueryResult) {
    const keys = new Set(objKeys(this.models))

    // reset the search values
    keys.forEach(key => {
      this.models[key]!.searchValues = [];
    })

    objKeys(rec).forEach(key => {
      if (keys.has(key as keyof NetqueryConnection)) {
        this.models[key as keyof NetqueryConnection]!.searchValues = [rec[key]];
      }
    })

    // reset the group-by-keys since they don't make any sense anymore.
    this.groupByKeys = [];
    this.performSearch();
  }

  trackSuggestion: TrackByFunction<Suggestion> = (_: number, s: Suggestion) => s.Value;
}

function initializeModels(models: { [key: string]: Partial<Model<any>> }): { [key: string]: Model<any> } {
  objKeys(models).forEach(key => {
    models[key] = {
      suggestions: [],
      searchValues: [],
      visible: false,
      ...models[key],
    }
  })

  return models as any;
}
