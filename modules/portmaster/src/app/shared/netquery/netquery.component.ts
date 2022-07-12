import { coerceArray } from "@angular/cdk/coercion";
import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnDestroy, OnInit, QueryList, TemplateRef, TrackByFunction, ViewChildren } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { Datasource, DynamicItemsPaginator } from "@safing/ui";
import { BehaviorSubject, combineLatest, forkJoin, Observable, of, Subject } from "rxjs";
import { catchError, debounceTime, map, switchMap, takeUntil } from "rxjs/operators";
import { ChartResult, Condition, IPScope, Netquery, NetqueryConnection, PossilbeValue, Query, QueryResult, Select, Verdict } from "src/app/services";
import { ActionIndicatorService } from "../action-indicator";
import { ExpertiseService } from "../expertise";
import { objKeys } from "../utils";
import { NetqueryHelper } from "./connection-helper.service";
import { SfngSearchbarFields } from "./searchbar";
import { SfngTagbarValue } from "./tag-bar";
import { Parser } from "./textql";
import { connectionFieldTranslation, mergeConditions } from "./utils";

interface Suggestion<T = any> extends PossilbeValue<T> {
  count: number;
  selected?: boolean;
}

interface Model<T> {
  suggestions: Suggestion<T>[];
  searchValues: any[];
  visible: boolean | 'combinedMenu';
  menuTitle?: string;
  tipupKey?: string;
}

const freeTextSearchFields: (keyof Partial<NetqueryConnection>)[] = [
  'domain',
  'as_owner',
  'path',
  'profile_name',
]

const groupByKeys: (keyof Partial<NetqueryConnection>)[] = [
  'domain',
  'as_owner',
  'country',
  'direction',
  'path',
  'profile'
]

const orderByKeys: (keyof Partial<NetqueryConnection>)[] = [
  'domain',
  'as_owner',
  'country',
  'direction',
  'path',
  'started',
  'ended',
  'profile',
]

interface LocalQueryResult extends QueryResult {
  _chart: Observable<ChartResult[]> | null;
  _group: Observable<DynamicItemsPaginator<NetqueryConnection>> | null;
}

/**
 * Netquery Viewer
 *
 * This component is the actual viewer component for the netquery subsystem of the Portmaster.
 * It allows the user to specify connection filters in multiple different ways and allows
 * to do a deep-dive into all connections seen by the Portmaster (that are still stored in
 * the in-memory SQLite database of the netquery subsystem).
 *
 * The user is able to modify the filter query by either:
 *  - using the available drop-downs
 *  - using the searchbar which
 *    - supports typed searches for connection fields (i.e. country:AT domain:google.at)
 *    - free-text search across the list of supported "full-text" search fields (see freeTextSearchFields)
 *  - by shift-clicking any value that has a SfngAddToFilter directive
 *  - by removing values from the tag bar.
 */

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

  /** @private Used to trigger an update of all displayed values in the tag-bar. */
  private updateTagBar$ = new BehaviorSubject<void>(undefined);

  /** @private Whether or not the next update on ActivatedRoute should be ignored */
  private skipNextRouteUpdate = false;

  /** @private Whether or not we should update the URL when performSearch() finishes */
  private skipUrlUpdate = false;

  /** @private - The paginator used for the result set */
  paginator!: DynamicItemsPaginator<LocalQueryResult>;

  /** @private - The total amount of connections without the filter applied */
  totalConnCount: number = 0;

  /** @private - The total amount of connections with the filter applied */
  totalResultCount: number = 0;

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

  /** @private The list of "pro-tips" that are defined in the template. Only one pro-tip will be rendered depending on proTipIdx */
  @ViewChildren('proTip', { read: TemplateRef })
  proTips!: QueryList<TemplateRef<any>>

  /** @private The index of the pro-tip that is currently rendered. */
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
    objKeys(this.models).forEach(key => {
      // ignore any models that are marked as being shown in the combined-menu.
      if (this.models[key]?.visible !== 'combinedMenu') {
        this.models[key]!.visible = false;
      }
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

  /**
   * mergeFilter input can be used to apply an additional filter condition that cannot be modified by
   * the user (like forcing a "profile" filter for the App View)
   */
  @Input()
  mergeFilter: Condition | null = null;

  /** @private Holds the value displayed in the tag-bar */
  tagbarValues: SfngTagbarValue[] = [];

  models: { [key in keyof NetqueryConnection]?: Model<any> } = initializeModels({
    domain: {
      visible: true,
    },
    as_owner: {
      visible: true,
    },
    country: {
      visible: true,
    },
    profile: {
      visible: true
    },
    path: {},
    internal: {},
    allowed: {},
    type: {},
    tunneled: {},
    encrypted: {},
    scope: {
      visible: 'combinedMenu',
      menuTitle: 'Network Scope',
      suggestions: enumToSuggestionValue(IPScope),
    },
    verdict: {},
    started: {},
    ended: {},
    profile_revision: {},
    remote_ip: {},
    remote_port: {},
    local_ip: {},
    local_port: {},
    direction: {
      visible: 'combinedMenu',
      menuTitle: 'Direction',
      suggestions: [
        {
          Name: 'Inbound',
          Value: 'inbound',
          Description: '',
          count: 0,
        },
        {
          Name: 'Outbound',
          Value: 'outbound',
          Description: '',
          count: 0,
        }
      ]
    },
    exit_node: {},
    asn: {},
    active: {
      visible: 'combinedMenu',
      menuTitle: 'Active',
      suggestions: booleanSuggestionValues(),
    },
    spn_used: {
      visible: 'combinedMenu',
      menuTitle: 'SPN',
      suggestions: booleanSuggestionValues(),
      tipupKey: 'spn'
    }
  })

  /** Translations for the connection field names */
  keyTranslation = connectionFieldTranslation;

  /** A list of keys for group-by */
  groupByKeys: string[] = [];

  /** A list of keys for sorting */
  orderByKeys: string[] = [];

  ngOnInit(): void {
    // Prepare the datasource that is used to initialize the DynamicItemPaginator.
    // It basically has a "view" function that executes the current page query
    // but with page-number and page-size applied.
    // This is used by the paginator to support lazy-loading the different
    // result pages.
    const dataSource: Datasource<LocalQueryResult> = {
      view: (page: number, pageSize: number) => {
        const query = this.getQuery();
        query.page = page - 1; // UI starts at page 1 while the backend is 0-based
        query.pageSize = pageSize;

        return this.netquery.query(query)
          .pipe(
            this.helper.attachProfile(),
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

    // create a new paginator that will use the datasource from above.
    this.paginator = new DynamicItemsPaginator(dataSource)

    // subscribe to the search observable that emits a value each time we want to perform
    // a new query.
    // The actual searching is debounced by second so we don't flood the Portmaster service
    // with queries while the user is still configuring their filters.
    this.search$
      .pipe(
        debounceTime(1000),
        switchMap(() => {
          this.loading = true;
          this.cdr.markForCheck();

          const query = this.getQuery();

          // we only load the overall connection chart, the total connection count for the filter result
          // as well the the total connection count without any filters here. The actual results are
          // loaded by the DynamicItemsPaginator using the "view" function defined above.
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
                  // the the correct resulsts here which depend on whether or not
                  // we're applying a group by.
                  if (this.groupByKeys.length === 0) {
                    return result[0].totalCount;
                  }
                  return result.length;
                })
              ),

            totalConnCount: this.netquery.query({ select: { $count: { field: '*', as: 'totalConnCount' } } })
          })
        }),
      )
      .subscribe(result => {
        this.chartData = result.chart;

        // reset the paginator with the new total result count and
        // open the first page.
        this.paginator.reset(result.totalCount);
        this.totalConnCount = result.totalConnCount[0].totalConnCount;
        this.totalResultCount = result.totalCount;

        // update the current URL to include the new search
        // query and make sure we skip the parameter-update emitted by
        // router.
        if (!this.skipUrlUpdate) {
          this.skipNextRouteUpdate = true;

          // note that since we only update the query parameters and stay on
          // the current route this component will not get re-created but will
          // rather receive an update on the queryParamMap (see below).
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

    // subscribe to router updates so we apply the filter that is part of
    // the current query parameter "q".
    // We might ignore updates here depending on the value of "skipNextRouterUpdate".
    // This is required as we keep the route parameters in sync with the current filter.
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

    // we might get new search values from our helper service
    // in case the user "SHIFT-Clicks" a SfngAddToFilter directive.
    this.helper.onFieldsAdded()
      .pipe(takeUntil(this.destroy$))
      .subscribe(fields => this.onFieldsParsed(fields))

    // updateTagBar$ always emits a value when we need to update the current tag-bar values.
    // This must always be done if the current search filter has been modified in either of
    // the supported ways.
    this.updateTagBar$
      .pipe(
        takeUntil(this.destroy$),
        switchMap(() => {
          const obs: Observable<{ [key: string]: (PossilbeValue & QueryResult)[] }>[] = [];

          // for the tag bar we try to show some pretty names for values that are meant to be
          // internal (like the number-constants for the verdicts or using the profile name instead
          // of the profile ID). Since we might need to load data from the Portmaster for this (like
          // for profile names) we construct a list of observables using helper.encodeToPossibleValues
          // and use the result for the tagbar.
          objKeys(this.models)
            .sort() // make sure we always output values in a constant order
            .forEach(modelKey => {
              const values = this.models[modelKey]!.searchValues;

              if (values.length > 0) {
                obs.push(
                  of(values.map(val => ({
                    [modelKey]: val,
                  })))
                    .pipe(
                      this.helper.encodeToPossibleValues(modelKey),
                      map(result => ({
                        [modelKey]: result,
                      }))
                    )
                )
              }
            })

          if (obs.length === 0) {
            return of([]);
          }

          return combineLatest(obs);
        })
      )
      .subscribe(tagBarValues => {
        this.tagbarValues = [];

        // reset the "selected" field of each model that is shown in the "combinedMenu".
        // we'll set the correct ones as "selected" again in the next step.
        objKeys(this.models).forEach(key => {
          if (this.models[key]?.visible === 'combinedMenu') {
            this.models[key]?.suggestions.forEach(val => val.selected = false);
          }
        })

        // finally construct a new list of tag-bar values and update the "selected" field of
        // suggested-values for the "combinedMenu" items based on the actual search values.
        tagBarValues.forEach(obj => {
          objKeys(obj).forEach(key => {
            if (obj[key].length > 0) {
              this.tagbarValues.push({
                key: key as string,
                values: obj[key],
              })

              // update the `selected` field of suggested-values for each model that is displayed in the combined-menu
              const modelsKey = key as keyof NetqueryConnection;
              if (this.models[modelsKey]?.visible === 'combinedMenu')
                this.models[modelsKey]?.suggestions.forEach(suggestedValue => {
                  suggestedValue.selected = obj[key].some(val => val.Value === suggestedValue.Value);
                })
            }
          })
        })

        this.cdr.markForCheck();
      })
  }

  ngAfterViewInit(): void {
    // once we are initialized decide which pro-tip we want to show this time...
    this.proTipIdx = Math.floor(Math.random() * this.proTips.length);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.search$.complete();
    this.helper.dispose();
  }

  // lazyLoadGroup returns an observable that will emit a DynamicItemsPaginator once subscribed.
  // This is used in "group-by" views to lazy-load the content of the group once the user
  // expands it.
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
      })
        .subscribe(result => {
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

  // Returns an observable that loads the current active connection chart using the
  // current page query but only for the condition of the displayed group.
  getGroupChart(groupFilter: Condition): Observable<ChartResult[]> {
    const query = this.getQuery().query || {};

    Object.keys(groupFilter).forEach(key => {
      query[key] = [groupFilter[key] as any];
    });

    return this.netquery.activeConnectionChart(query);
  }

  // loadSuggestion loads possible values for a given connection field
  // and updates the "suggestions" field of the correct models entry.
  // It also uses helper.encodeToPossibleValues to make sure we show
  // pretty names for otherwise "internal" values like verdict constants
  // or profile IDs.
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
      .pipe(this.helper.encodeToPossibleValues(field))
      .subscribe(result => {
        // create a set that we can use to lookup if a value
        // is currently selected.
        // This is needed to ensure selected values are sorted to the top.
        let currentlySelected = new Set<any>();
        this.models[field]!.searchValues.forEach(
          val => currentlySelected.add(val)
        );

        this.models[field]!.suggestions =
          result
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
      if (key === 'groupBy') {
        this.groupByKeys = fields.groupBy || this.groupByKeys;

        return;
      }

      if (key === 'orderBy') {
        this.orderByKeys = fields.orderBy || this.orderByKeys;

        return;
      }

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
    this.search$.next();
    this.updateTagbarValues();
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

    this.groupByKeys.forEach(key => {
      result += `groupby:"${key}" `
    })
    this.orderByKeys.forEach(key => {
      result += `orderby:"${key}" `
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
      const key = kind.key as keyof NetqueryConnection;
      this.models[key]!.searchValues = kind.values.map(possibleValue => possibleValue.Value);

      if (this.models[key]?.visible === 'combinedMenu')
        this.models[key]?.suggestions.forEach(val => {
          val.selected = this.models[key]!.searchValues.find(searchValue => searchValue === val.Value)
        })
    })

    this.performSearch();
  }

  /** Updates the {@link tagbarValues} from {@link models}*/
  private updateTagbarValues() {
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

  /** @private - used by the combined filter menu */
  toggleCombinedMenuFilter(key: string, value: Suggestion) {
    const k = key as keyof NetqueryConnection;
    if (value.selected) {
      this.models[k]!.searchValues = this.models[k]?.searchValues.filter(val => val !== value.Value) || [];
    } else {
      this.models[k]!.searchValues.push(value.Value)
    }

    this.updateTagbarValues();
    this.performSearch();
  }

  trackSuggestion: TrackByFunction<Suggestion> = (_: number, s: Suggestion) => s.Name + '::' + s.Value;
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

function enumToSuggestionValue(val: any): Suggestion<any>[] {
  return Object.keys(val)
    .filter(key => isNaN(+key))
    .map(key => {
      return {
        Name: key,
        Value: val[key],
        count: 0,
        Description: '',
      }
    })
}

function booleanSuggestionValues(): Suggestion<any>[] {
  return [
    {
      Name: 'Yes',
      Value: true,
      Description: '',
      count: 0,
    },
    {
      Name: 'No',
      Value: false,
      Description: '',
      count: 0,
    },
  ]
}
