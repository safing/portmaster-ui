import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef } from "@angular/core";
import { of, Subject } from "rxjs";
import { mergeMap, takeUntil } from "rxjs/operators";
import { Setting, ConfigService, QuickSetting, applyQuickSetting } from "src/app/services";
import { SaveSettingEvent } from "src/app/shared/config/generic-setting";
import { Step } from "src/app/shared/overlay-stepper";

interface QuickSettingModel extends QuickSetting<any> {
  active: boolean;
}

@Component({
  templateUrl: './step-3-dns.html',
  styleUrls: ['../step.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Step3DNSComponent implements Step {
  private destroy$ = new Subject<void>();

  validChange = of(true)

  setting: Setting | null = null;
  quickSettings: QuickSettingModel[] = [];
  isCustomValue = false;

  constructor(
    public configService: ConfigService,
    public readonly elementRef: ElementRef,
    private cdr: ChangeDetectorRef,
  ) { }

  private getQuickSettings(): QuickSettingModel[] {
    if (!this.setting) {
      return [];
    }

    let val = this.setting.Annotations["safing/portbase:ui:quick-setting"];
    if (val === undefined) {
      return [];
    }

    if (!Array.isArray(val)) {
      return [{
        ...val,
        active: false,
      }]
    }

    return val.map(v => ({
      ...v,
      active: false,
    }))
  }

  ngOnInit(): void {
    this.configService.get('dns/nameservers')
      .pipe(
        mergeMap(setting => {
          this.setting = setting;
          this.quickSettings = this.getQuickSettings();
          return this.configService.watch(setting.Key)
        }),
        takeUntil(this.destroy$),
      )
      .subscribe(value => {
        this.setting!.Value = value;

        let hasActive = false;
        this.isCustomValue = false;

        this.quickSettings.forEach(setting => {
          if (this.setting?.Value !== undefined && JSON.stringify(this.setting.Value) === JSON.stringify(setting.Value)) {
            setting.active = true;
            hasActive = true;
          } else {
            setting.active = false;
          }
        });

        if (!hasActive) {
          if (this.setting?.Value !== undefined && JSON.stringify(this.setting!.Value) !== JSON.stringify(this.setting!.DefaultValue)) {
            this.isCustomValue = true;
          } else if (this.quickSettings.length > 0) {
            this.quickSettings[0].active = true;
          }
        }

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

  applyQuickSetting(action: QuickSetting<any>) {
    const newValue = applyQuickSetting(
      this.setting!.Value || this.setting!.DefaultValue,
      action,
    )
    this.configService.save(this.setting!.Key, newValue)
      .subscribe();
  }
}
