import { BehaviorSubject, Observable } from "rxjs";
import { debounceTime, map, take, tap, withLatestFrom } from "rxjs/operators";

export interface Pagination<T> {
  /**
   * Total should return the total number of pages
   */
  total: number;

  /**
   * pageNumber$ should emit the currently displayed page
   */
  pageNumber$: Observable<number>;

  /**
   * pageItems$ should emit all items of the current page
   */
  pageItems$: Observable<T[]>;

  /**
   * nextPage should progress to the next page. If there are no more
   * pages than nextPage() should be a no-op.
   */
  nextPage(): void;

  /**
   * prevPage should move back the the previous page. If there is no
   * previous page, prevPage should be a no-op.
   */
  prevPage(): void;

  /**
   * openPage opens the page @pageNumber. If pageNumber is greater than
   * the total amount of pages it is clipped to the lastPage. If it is
   * less than 1, it is clipped to 1.
   */
  openPage(pageNumber: number): void
}

/**
 * Generates an array of page numbers that should be displayed in paginations.
 *
 * @param current The current page number
 * @param countPages The total number of pages
 * @returns An array of page numbers to display
 */
export function generatePageNumbers(current: number, countPages: number): number[] {
  let delta = 2;
  let leftRange = current - delta;
  let rightRange = current + delta + 1;

  return Array.from({ length: countPages }, (v, k) => k + 1)
    .filter(i => i === 1 || i === countPages || (i >= leftRange && i < rightRange));
}

export class SnapshotPaginator<T> implements Pagination<T> {
  private _itemSnapshot: T[] = [];
  private _activePageItems = new BehaviorSubject<T[]>([]);
  private _totalPages = 1;
  private _updatePending = false;

  constructor(
    public items$: Observable<T[]>,
    public readonly pageSize: number,
  ) {
    items$
      .pipe(debounceTime(100))
      .subscribe(data => {
        this._itemSnapshot = data;
        this.openPage(this._currentPage.getValue());
      });

    this._currentPage
      .subscribe(page => {
        this._updatePending = false;
        const start = this.pageSize * (page - 1);
        const end = this.pageSize * page;
        this._totalPages = Math.ceil(this._itemSnapshot.length / this.pageSize) || 1;
        this._activePageItems.next(this._itemSnapshot.slice(start, end));
      })
  }

  private _currentPage = new BehaviorSubject<number>(0);

  get updatePending() {
    return this._updatePending;
  }
  get pageNumber$(): Observable<number> {
    return this._activePageItems.pipe(map(() => this._currentPage.getValue()));
  }
  get pageNumber(): number {
    return this._currentPage.getValue();
  }
  get total(): number {
    return this._totalPages
  }
  get pageItems$(): Observable<T[]> {
    return this._activePageItems.asObservable();
  }
  get pageItems(): T[] {
    return this._activePageItems.getValue();
  }
  get snapshot(): T[] { return this._itemSnapshot };

  reload(): void { this.openPage(this._currentPage.getValue()) }

  nextPage(): void { this.openPage(this._currentPage.getValue() + 1) }

  prevPage(): void { this.openPage(this._currentPage.getValue() - 1) }

  openPage(pageNumber: number): void {
    if (pageNumber < 1) {
      pageNumber = 1;
    }
    if (pageNumber > this.total && this.total > 0) {
      pageNumber = this.total;
    }
    this._currentPage.next(pageNumber);
  }
}
