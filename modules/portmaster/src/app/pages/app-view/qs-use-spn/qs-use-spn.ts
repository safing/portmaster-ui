import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from "@angular/core";
import { BoolSetting, FlatConfigObject, getActualValue, Setting } from "src/app/services";
import { SaveSettingEvent } from "src/app/shared/config/generic-setting/generic-setting";

const interferingSettingsWhenOn = [
  'spn/usagePolicy'
]

@Component({
  selector: 'app-qs-use-spn',
  templateUrl: './qs-use-spn.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class QuickSettingUseSPNButtonComponent implements OnChanges {
  @Input()
  globalSettings: FlatConfigObject | null = null;

  @Input()
  settings: Setting[] = [];

  @Output()
  save = new EventEmitter<SaveSettingEvent>();

  currentValue = false

  interferingSettings: Setting[] = [];

  spnDisabled = false;

  ngOnChanges(changes: SimpleChanges): void {
    if ('settings' in changes) {
      this.currentValue = false;

      const useSpnSetting = this.settings.find(s => s.Key === 'spn/use') as (BoolSetting | undefined);
      if (!!useSpnSetting) {
        this.currentValue = getActualValue(useSpnSetting);
        this.updateInterfering();
      }
    }

    if ('globalSettings' in changes) {
      this.spnDisabled = changes.globalSettings.currentValue['spn/enable']
    }
  }

  updateUseSpn(allowed: boolean) {
    this.save.next({
      isDefault: false,
      key: 'spn/use',
      value: allowed,
    })
  }

  private updateInterfering() {
    this.interferingSettings = [];

    // only enabled state has interfering settings
    if (!this.currentValue) {
      return
    }

    // create a lookup map for setting key to setting
    const lm = new Map<string, Setting>();
    this.settings.forEach(s => lm.set(s.Key, s))

    
    this.interferingSettings = interferingSettingsWhenOn
      .map(key => lm.get(key))
      .filter(setting => {
        if (!setting) {
          return false;
        }
        const value = getActualValue(setting);
        if (Array.isArray(value)) {
          return value.length > 0;
        }

        return !!value;
      }) as Setting[];
  }
}
