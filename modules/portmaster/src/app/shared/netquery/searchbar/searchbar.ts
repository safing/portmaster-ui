import { ListKeyManager, ListKeyManagerOption } from "@angular/cdk/a11y";
import { Directionality } from "@angular/cdk/bidi";
import { CdkOverlayOrigin } from "@angular/cdk/overlay";
import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, Directive, ElementRef, EventEmitter, forwardRef, HostBinding, HostListener, Input, OnDestroy, OnInit, Output, QueryList, TrackByFunction, ViewChild, ViewChildren } from "@angular/core";
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from "@angular/forms";
import { timeHours } from "d3";
import { Direct } from "protractor/built/driverProviders";
import { forkJoin, Observable, of, Subject } from "rxjs";
import { catchError, debounceTime, map, switchMap, takeUntil } from "rxjs/operators";
import { Condition, ExpertiseLevel, Netquery, NetqueryConnection } from "src/app/services";
import { threadId } from "worker_threads";
import { fadeInAnimation, fadeInListAnimation } from "../../animations";
import { SfngDropdown } from "../../dropdown/dropdown";
import { ExpertiseService } from "../../expertise";
import { objKeys } from "../../utils";
import { Parser } from "../textql";

export type SfngSearchbarFields = {
  [key in keyof Partial<NetqueryConnection>]: any[];
}

export type SfngSearchbarSuggestionValue<K extends keyof NetqueryConnection> = {
  value: NetqueryConnection[K];
  count: number;
}

export type SfngSearchbarSuggestion<K extends keyof NetqueryConnection> = {
  start?: number;
  field: K;
  values: SfngSearchbarSuggestionValue<K>[];
}

@Directive({
  selector: '[sfng-netquery-suggestion]'
})
export class SfngNetquerySuggestionDirective<K extends keyof NetqueryConnection> {
  constructor() { }

  @Input(`sfngSuggestion`)
  sug?: SfngSearchbarSuggestion<K>;

  @Input('sfng-netquery-suggestion')
  value?: SfngSearchbarSuggestionValue<K> | string;

  @HostBinding('class.bg-gray-300')
  active: boolean = false;

  getLabel(): string {
    if (typeof this.value === 'string') {
      return this.value;
    }
    return '' + this.value?.value;
  }
}

@Component({
  selector: 'sfng-netquery-searchbar',
  templateUrl: './searchbar.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    fadeInAnimation,
    fadeInListAnimation
  ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SfngNetquerySearchbar),
      multi: true,
    }
  ]
})
export class SfngNetquerySearchbar implements ControlValueAccessor, OnInit, OnDestroy, AfterViewInit {
  private loadSuggestions$ = new Subject<void>();
  private triggerDropdownClose$ = new Subject<boolean>();
  private keyManager!: ListKeyManager<SfngNetquerySuggestionDirective<any>>;
  private destroy$ = new Subject<void>();

  /** Whether or not we are currently loading suggestions */
  loading = false;

  @ViewChild(CdkOverlayOrigin, { static: true })
  searchBoxOverlayOrigin!: CdkOverlayOrigin;

  @ViewChild(SfngDropdown)
  suggestionDropDown?: SfngDropdown;

  @ViewChild('searchBar', { static: true, read: ElementRef })
  searchBar!: ElementRef;

  @ViewChildren(SfngNetquerySuggestionDirective)
  suggestionValues!: QueryList<SfngNetquerySuggestionDirective<any>>;

  @Output()
  onFieldsParsed = new EventEmitter<SfngSearchbarFields>();

  @Input()
  labels: { [key: string]: string } = {}

  /** Controls whether or not suggestions are shown as a drop-down or inline */
  @Input()
  mode: 'inline' | 'default' = 'default';

  suggestions: SfngSearchbarSuggestion<any>[] = [];

  textSearch = '';

  @HostListener('focus')
  onFocus() {
    // move focus forward to the input element
    this.searchBar.nativeElement.focus();
  }

  @Input()
  @HostBinding('tabindex')
  tabindex = 0;

  writeValue(val: string): void {
    if (typeof val === 'string') {
      const result = Parser.parse(val);
      this.textSearch = result.textQuery;
    } else {
      this.textSearch = '';
    }
    this.cdr.markForCheck();
  }

  _onChange: (val: string) => void = () => { }
  registerOnChange(fn: any): void {
    this._onChange = fn;
  }

  _onTouched: () => void = () => { }
  registerOnTouched(fn: any): void {
    this._onTouched = fn
  }

  ngAfterViewInit(): void {
    this.keyManager = new ListKeyManager(this.suggestionValues)
      .withVerticalOrientation()
      .withTypeAhead()
      .withHomeAndEnd()
      .withWrap();

    this.keyManager.change
      .pipe(takeUntil(this.destroy$))
      .subscribe(idx => {
        console.log("new active index: ", idx)
        this.suggestionValues.forEach(val => val.active = false);
        this.suggestionValues.get(idx)!.active = true;
        this.cdr.markForCheck();
      });
  }

  ngOnInit(): void {
    this.loadSuggestions$
      .pipe(
        debounceTime(500),
        switchMap(() => {
          let fields: (keyof NetqueryConnection)[] = [
            'path',
            'domain',
            'as_owner',
            'remote_ip',
          ];

          const parser = new Parser(this.textSearch);
          const parseResult = parser.process();

          const queries: { [key in keyof Partial<NetqueryConnection>]: Observable<SfngSearchbarSuggestion<any>> } = {};

          // FIXME(ppacher): confirm .type is an actually allowed field
          if (!!parser.lastUnterminatedCondition) {
            fields = [parser.lastUnterminatedCondition.type as keyof NetqueryConnection];
          }

          fields.forEach(field => {
            const query: Condition = {
              [field]: {
                $like: `%${!!parser.lastUnterminatedCondition ? parser.lastUnterminatedCondition.value : parseResult.textQuery}%`
              },
            }

            // hide internal connections if the user is not a developer
            if (this.expertiseService.currentLevel !== ExpertiseLevel.Developer) {
              query.internal = {
                $eq: false
              }
            }

            const obs = this.netquery.query({
              select: [
                field,
                {
                  $count: {
                    field: "*",
                    as: "count"
                  },
                }
              ],
              query: query,
              groupBy: [
                field,
              ],
              page: 0,
              pageSize: 5,
              orderBy: [{ field: "count", desc: true }]
            })
              .pipe(
                map(results => {
                  let val: SfngSearchbarSuggestion<typeof field> = {
                    field: field,
                    values: [],
                    start: parser.lastUnterminatedCondition ? parser.lastUnterminatedCondition.start : undefined,
                  }

                  results.forEach(res => {
                    (val.values).push({
                      value: res[field],
                      count: res.count,
                    })
                  })

                  return val;
                }),
                catchError(err => {
                  return of({
                    field: field,
                    values: []
                  })
                })
              )

            queries[field] = obs;
          })

          return forkJoin(queries)
        })
      )
      .subscribe(result => {
        this.loading = false;
        this.suggestions = Object.keys(result)
          .map(key => result[key])
          .filter((sug: SfngSearchbarSuggestion<any>) => sug.values?.length > 0)



        this.keyManager.setActiveItem(0);

        this.cdr.markForCheck();
      })

    this.triggerDropdownClose$
      .pipe(debounceTime(100))
      .subscribe(shouldClose => {
        if (shouldClose) {
          this.suggestionDropDown?.close();
        }
      })

    if (this.mode === 'inline') {
      this.loadSuggestions();
    }
  }

  ngOnDestroy(): void {
    this.loadSuggestions$.complete();
    this.triggerDropdownClose$.complete();
    this.destroy$.next()
    this.destroy$.complete();
  }

  cancelDropdownClose() {
    this.triggerDropdownClose$.next(false);
  }

  onSearchModelChange(value: string) {
    if (value.length >= 3 || this.mode === 'inline') {
      this.loadSuggestions();
    } else if (this.suggestionDropDown?.isOpen) {
      // close the suggestion dropdown if the search input contains less than
      // 3 characters and we're currently showing the dropdown
      this.suggestionDropDown?.close();
    }
  }

  /** @private Callback for keyboard events on the search-input */
  onSearchKeyDown(event: KeyboardEvent) {
    if (event.key === ' ' && event.ctrlKey) {
      this.loadSuggestions();
      event.preventDefault();
      event.stopPropagation()
      return;
    }

    if (event.key === 'Enter') {

      const selectedSuggestion = this.suggestionValues.toArray().findIndex(val => val.active);
      if (selectedSuggestion > 0) { // we must skip 0 here as well as that's the dummy element
        const sug = this.suggestionValues.get(selectedSuggestion);
        this.applySuggestion(sug?.sug?.field, sug?.value, event, sug?.sug?.start)

        return;
      }

      this.suggestionDropDown?.close();
      this.parseAndEmit();
      this.cdr.markForCheck();

      return;
    }

    this.keyManager.onKeydown(event);
  }

  onFocusLost(event: FocusEvent) {
    this._onTouched();
    this.triggerDropdownClose$.next(true)
  }

  private parseAndEmit() {
    const result = Parser.parse(this.textSearch);
    this.textSearch = result.textQuery;

    if (Object.keys(result.conditions).length > 0) {
      this.onFieldsParsed.next(result.conditions);
    }

    this._onChange(this.textSearch);
  }

  applySuggestion(field: keyof NetqueryConnection, val: any, event: { shiftKey: boolean }, start?: number) {
    if (start !== undefined) {
      this.textSearch = this.textSearch.slice(0, start)
    } else if (!event.shiftKey) {
      this.textSearch = '';
    } else {
      // the user pressed shift-key and used free-text search so we remove
      // the remaining part
      const parseRes = Parser.parse(this.textSearch);
      let query = "";
      objKeys(parseRes.conditions).forEach(field => {
        parseRes.conditions[field]?.forEach(value => {
          query += `${field}:${JSON.stringify(value)} `
        })
      })
      this.textSearch = query;
    }

    if (event.shiftKey) {
      const textqlVal = `${field}:${JSON.stringify(val)}`
      if (!this.textSearch.includes(textqlVal)) {
        if (this.textSearch !== '') {
          this.textSearch += " "
        }
        this.textSearch += textqlVal + " "
        this.triggerDropdownClose$.next(false)
        // load new suggestions based on the new input
        this.loadSuggestions();
      }

      return;
    }

    // directly emit the new value and reset the text search
    this.onFieldsParsed.next({
      [field]: [val]
    })

    // parse and emit the current search field but without the suggestion value
    this.parseAndEmit();

    this.suggestionDropDown?.close();

    this.cdr.markForCheck();
  }

  resetKeyboardSelection() {
    this.keyManager.setActiveItem(0);
  }

  loadSuggestions() {
    this.loading = true;
    this.loadSuggestions$.next();
    this.suggestionDropDown?.show(this.searchBoxOverlayOrigin)
  }

  trackSuggestion: TrackByFunction<SfngSearchbarSuggestion<any>> = (_: number, val: SfngSearchbarSuggestion<any>) => val.field;

  constructor(
    private cdr: ChangeDetectorRef,
    private expertiseService: ExpertiseService,
    private netquery: Netquery,
  ) { }
}