import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit } from "@angular/core";
import { ConfigService, Setting } from "@safing/portmaster-api";
import { Step } from "@safing/ui";
import { of, Subject } from "rxjs";
import { mergeMap, takeUntil } from "rxjs/operators";
import { SaveSettingEvent } from "src/app/shared/config/generic-setting";

@Component({
  templateUrl: './step-2-trackers.html',
  styleUrls: ['../step.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Step2TrackersComponent implements Step, OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  validChange = of(true)

  setting: Setting | null = null;

  constructor(
    public configService: ConfigService,
    public readonly elementRef: ElementRef,
    private cdr: ChangeDetectorRef,
  ) { }

  ngOnInit(): void {
    this.configService.get('filter/lists')
      .pipe(
        mergeMap(setting => {
          this.setting = setting;

          return this.configService.watch(setting.Key)
        }),
        takeUntil(this.destroy$),
      )
      .subscribe(value => {
        this.setting!.Value = value;

        this.cdr.markForCheck();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  saveSetting(event: SaveSettingEvent) {
    this.configService.save(event.key, event.value)
      .subscribe()
  }
}
