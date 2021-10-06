import { EventEmitter, ChangeDetectionStrategy, ChangeDetectorRef, Component, ContentChild, Directive, Input, OnChanges, OnDestroy, Output, SimpleChanges, TemplateRef } from '@angular/core';
import { combineLatest, Subscription } from 'rxjs';
import { generatePageNumbers, Pagination } from '../types';

@Directive({
  selector: '[appPaginationContent]'
})
export class PaginationContentDirective<T = any> {
  constructor(public readonly templateRef: TemplateRef<T>) { }
}

export interface PageChangeEvent {
  totalPages: number;
  currentPage: number;
}

@Component({
  selector: 'app-pagination',
  templateUrl: './pagination.html',
  styleUrls: ['./pagination.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaginationWrapperComponent<T = any> implements OnChanges, OnDestroy {
  private _sub: Subscription = Subscription.EMPTY;

  @Input()
  source: Pagination<T> | null = null;

  @Output()
  pageChange = new EventEmitter<PageChangeEvent>();

  @ContentChild(PaginationContentDirective)
  content: PaginationContentDirective | null = null;

  currentPageIdx = 0;
  pageNumbers: number[] = [];

  ngOnChanges(changes: SimpleChanges) {
    if ('source' in changes) {
      this.subscribeToSource(changes.source.currentValue);
    }
  }

  ngOnDestroy() {
    this._sub.unsubscribe();
  }

  private subscribeToSource(source: Pagination<T>) {
    // Unsubscribe from the previous pagination, if any
    this._sub.unsubscribe();

    this._sub = new Subscription();

    this._sub.add(
      source.pageNumber$
        .subscribe(current => {
          this.currentPageIdx = current;
          this.pageNumbers = generatePageNumbers(current - 1, source.total);
          this.cdr.markForCheck();

          this.pageChange.next({
            totalPages: source.total,
            currentPage: current,
          });
        })
    );
  }

  constructor(private cdr: ChangeDetectorRef) { }
}
