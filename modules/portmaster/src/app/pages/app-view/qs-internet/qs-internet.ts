import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from "@angular/core";
import { getActualValue, Setting, StringSetting } from "src/app/services";
import { SaveSettingEvent } from "src/app/shared/config/generic-setting/generic-setting";

const interferingSettings = {
  'permit': [
    'filter/blockInternet',
    'filter/blockLAN',
    'filter/blockLocal',
    'filter/blockP2P',
    'filter/blockInbound',
    'filter/endpoints',
    'filter/serviceEndpoints'
  ],
  'block': [
    'filter/endpoints',
    'filter/serviceEndpoints'
  ],
}

@Component({
  selector: 'app-qs-internet',
  templateUrl: './qs-internet.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class QuickSettingInternetButtonComponent implements OnChanges {
  @Input()
  settings: Setting[] = [];

  @Output()
  save = new EventEmitter<SaveSettingEvent>();

  currentValue = ''

  interferingSettings: Setting[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if ('settings' in changes) {
      this.currentValue = '';
      const defaultActionSetting = this.settings.find(s => s.Key == 'filter/defaultAction') as (StringSetting | undefined);
      if (!!defaultActionSetting) {
        this.currentValue = getActualValue(defaultActionSetting);
        this.updateInterfering();
      }
    }
  }

  updateUseInternet(allowed: boolean) {
    const newValue = allowed ? 'permit' : 'block';
    this.save.next({
      isDefault: false,
      key: 'filter/defaultAction',
      value: newValue,
    })
  }

  private updateInterfering() {
    this.interferingSettings = [];
    if (this.currentValue !== 'permit' && this.currentValue !== 'block') {
      return;
    }

    // create a lookup map for setting key to setting
    const lm = new Map<string, Setting>();
    this.settings.forEach(s => lm.set(s.Key, s))

    this.interferingSettings = interferingSettings[this.currentValue]
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
