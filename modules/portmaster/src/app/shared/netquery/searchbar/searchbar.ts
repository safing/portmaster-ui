import { CdkOverlayOrigin } from "@angular/cdk/overlay";
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, forwardRef, Input, Output, TrackByFunction, ViewChild } from "@angular/core";
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from "@angular/forms";
import { forkJoin, Observable, of } from "rxjs";
import { catchError, map } from "rxjs/operators";
import { Netquery, NetqueryConnection } from "src/app/services";
import { SfngDropdown } from "../../dropdown/dropdown";
import { SfngNetqueryConnectionRowComponent } from "../connection-row";
import { Parser } from "../textql";

export type SfngSearchbarFields = {
  [key in keyof Partial<NetqueryConnection>]: any[];
}

export type SfngSearchbarSuggestionValue<K extends keyof NetqueryConnection> = {
  value: NetqueryConnection[K];
  count: number;
}

export type SfngSearchbarSuggestion<K extends keyof NetqueryConnection> = {
  field: K;
  values: SfngSearchbarSuggestionValue<K>[];
}

@Component({
  selector: 'sfng-netquery-searchbar',
  templateUrl: './searchbar.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SfngNetquerySearchbar),
      multi: true,
    }
  ]
})
export class SfngNetquerySearchbar implements ControlValueAccessor {
  @ViewChild(CdkOverlayOrigin)
  searchBoxOverlayOrigin!: CdkOverlayOrigin;

  @ViewChild(SfngDropdown)
  suggestionDropDown!: SfngDropdown;

  @Output()
  onFieldsParsed = new EventEmitter<SfngSearchbarFields>();

  @Input()
  labels: { [key: string]: string } = {}

  suggestions: SfngSearchbarSuggestion<any>[] = [];

  textSearch = '';
  private _lastValue = '';

  writeValue(val: string): void {
    const result = Parser.parse(this.textSearch);
    this.textSearch = result.textQuery;
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

  /** @private Callback for keyboard events on the search-input */
  onSearchKeyDown(event: KeyboardEvent) {
    if (this.textSearch.length >= 3) {

      this.loadSuggestions();

    } else if (this.suggestionDropDown.isOpen) {
      // close the suggestion dropdown if the search input contains less than
      // 3 characters and we're currently showing the dropdown
      this.suggestionDropDown.close();
    }

    // we're done here if the key is different than "Enter".
    if (event.key !== 'Enter') {
      return;
    }

    const result = Parser.parse(this.textSearch);
    this.textSearch = result.textQuery;

    // only emit the current free-text-search value if it changed
    if (this.textSearch !== this._lastValue) {
      this._onChange(this.textSearch);
      this._lastValue = this.textSearch;
    }

    if (Object.keys(result.conditions).length > 0) {
      this.onFieldsParsed.next(result.conditions);
    }

    this.cdr.markForCheck();
  }

  applySuggestion(field: keyof NetqueryConnection, val: any) {
    this.onFieldsParsed.next({
      [field]: [val]
    })
    this.suggestionDropDown.close();
    this.textSearch = '';
    this.cdr.markForCheck();
  }

  loadSuggestions() {
    const fields: (keyof NetqueryConnection)[] = [
      'domain',
      'as_owner',
      'path',
    ];

    const queries: { [key in keyof Partial<NetqueryConnection>]: Observable<SfngSearchbarSuggestion<any>> } = {};

    fields.forEach(field => {
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
        query: {
          [field]: {
            $like: `%${this.textSearch}%`
          }
        },
        groupBy: [
          field,
        ],
        orderBy: [{ field: "count", desc: true }]
      })
        .pipe(
          map(results => {
            let val: SfngSearchbarSuggestion<typeof field> = {
              field: field,
              values: [],
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

    forkJoin(queries)
      .subscribe(result => {
        this.suggestions = Object.keys(result)
          .map(key => result[key])
          .filter((sug: SfngSearchbarSuggestion<any>) => sug.values?.length > 0)

        if (this.suggestions.length > 0) {
          // open the suggestion drop down if it's still closed
          if (!this.suggestionDropDown.isOpen) {
            this.suggestionDropDown.show(this.searchBoxOverlayOrigin);
          }
        } else {
          // we close the dropdown if we don't have any suggestions for the user
          if (this.suggestionDropDown.isOpen) {
            this.suggestionDropDown.close();
          }
        }

        this.cdr.markForCheck();
      })
  }

  trackSuggestion: TrackByFunction<SfngSearchbarSuggestion<any>> = (_: number, val: SfngSearchbarSuggestion<any>) => val.field;

  constructor(
    private cdr: ChangeDetectorRef,
    private netquery: Netquery,
  ) { }
}
