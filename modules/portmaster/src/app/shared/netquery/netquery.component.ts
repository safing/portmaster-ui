import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit, TrackByFunction } from "@angular/core";
import { forkJoin, Subject } from "rxjs";
import { Netquery, PossilbeValue } from "src/app/services";

interface Suggestion extends PossilbeValue {
  selected: boolean;
}

interface Suggestions {
  domains: Suggestion[];
}

@Component({
  selector: 'sfng-netquery-viewer',
  templateUrl: './netquery.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NetqueryViewer implements OnInit, OnDestroy {
  /** @private - used to trigger a reload of the current filter */
  private reload$ = new Subject();

  /** @private - emits and completed when the component is destroyed */
  private destroy$ = new Subject();

  constructor(
    private netquery: Netquery,
    private cdr: ChangeDetectorRef
  ) { }

  suggestions: Suggestions = {
    domains: [],
  };

  ngOnInit(): void {

  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.reload$.complete();
  }

  private loadSuggestions() {
    forkJoin({
      domains: this.netquery.query({
        select: {
          $distinct: 'domain'
        }
      }),
    })
      .subscribe(result => {
        this.suggestions = {
          domains: result.domains.map(record => ({
            Name: record.domain!,
            Value: record.domain!,
            Description: '',
            selected: false, // FIXME
          }))
        }

        this.cdr.markForCheck();
      })
  }

  trackSuggestion: TrackByFunction<Suggestion> = (_: number, s: Suggestion) => s.Value;
}
