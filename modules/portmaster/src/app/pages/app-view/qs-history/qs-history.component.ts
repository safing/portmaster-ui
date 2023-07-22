import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BoolSetting, Feature, SPNService, Setting, getActualValue } from '@safing/portmaster-api';
import { BehaviorSubject, Observable, map } from 'rxjs';
import { share } from 'rxjs/operators';
import { SaveSettingEvent } from 'src/app/shared/config';

@Component({
  selector: 'app-qs-history',
  templateUrl: './qs-history.component.html',
  styleUrls: ['./qs-history.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class QsHistoryComponent implements OnChanges {
  currentValue = false;
  historyFeatureAllowed: Observable<boolean> = inject(SPNService)
    .profile$
    .pipe(
      takeUntilDestroyed(),
      map(profile => {
        return (profile?.current_plan?.feature_ids?.includes(Feature.History)) || false;
      }),
      share({ connector: () => new BehaviorSubject<boolean>(false) })
    )

  @Input()
  settings: Setting[] = [];

  @Output()
  save = new EventEmitter<SaveSettingEvent<any>>();

  ngOnChanges(changes: SimpleChanges): void {
    if ('settings' in changes) {
      const historySetting = this.settings.find(s => s.Key === 'history/enable') as (BoolSetting | undefined);
      if (historySetting) {
        this.currentValue = getActualValue(historySetting);
      }
    }
  }

  updateHistoryEnabled(enabled: boolean) {
    this.save.next({
      isDefault: false,
      key: 'history/enable',
      value: enabled,
    })
  }
}
