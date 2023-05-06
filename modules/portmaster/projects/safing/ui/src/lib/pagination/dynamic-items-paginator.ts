import { BehaviorSubject, Observable } from "rxjs";
import { clipPage, Pagination } from "./pagination";

export interface Datasource<T> {
  // view should emit all items in the given page using the specified page number.
  view(page: number, pageSize: number): Observable<T[]>;
}

export class DynamicItemsPaginator<T> implements Pagination<T> {
  private _total = 0;
  private _pageNumber$ = new BehaviorSubject<number>(1);
  private _pageItems$ = new BehaviorSubject<T[]>([]);
  private _pageLoading$ = new BehaviorSubject<boolean>(false);

  /** Returns the number of total pages. */
  get total() { return this._total; }

  /** Emits the current page number */
  get pageNumber$() { return this._pageNumber$.asObservable() }

  /** Emits all items of the current page */
  get pageItems$() { return this._pageItems$.asObservable() }

  /** Emits whether or not we're loading the next page */
  get pageLoading$() { return this._pageLoading$.asObservable() }

  constructor(
    private source: Datasource<T>,
    public readonly pageSize = 25,
  ) { }

  reset(newTotal: number) {
    this._total = Math.ceil(newTotal / this.pageSize);
    this.openPage(this._pageNumber$.value);
  }

  /** Clear resets the current total and emits an empty item set. */
  clear() {
    this._total = 0;
    this._pageItems$.next([]);
    this._pageNumber$.next(1);
  }

  openPage(pageNumber: number): void {
    pageNumber = clipPage(pageNumber, this.total);
    this._pageLoading$.next(true);
    this.source.view(pageNumber, this.pageSize)
      .subscribe(results => {
        this._pageLoading$.next(false);
        this._pageItems$.next(results);
        this._pageNumber$.next(pageNumber);
      });
  }

  nextPage(): void { this.openPage(this._pageNumber$.getValue() + 1) }
  prevPage(): void { this.openPage(this._pageNumber$.getValue() - 1) }
}
