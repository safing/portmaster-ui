import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BehaviorSubject, combineLatest, of, Subscription } from 'rxjs';
import { delayWhen, switchMap, withLatestFrom } from 'rxjs/operators';
import { AppProfile, ConfigService, flattenProfileConfig, isDefaultValue, setAppSetting, Setting } from 'src/app/services';
import { AppProfileService } from 'src/app/services/app-profile.service';
import { ConnTracker } from 'src/app/services/connection-tracker.service';
import { fadeInAnimation, fadeOutAnimation } from 'src/app/shared/animations';
import { SaveSettingEvent } from 'src/app/shared/config/generic-setting/generic-setting';

@Component({
  templateUrl: './app-settings.html',
  styleUrls: ['./app-settings.scss'],
  animations: [
    fadeOutAnimation,
    fadeInAnimation,
  ]
})
export class AppSettingsPageComponent implements OnInit, OnDestroy {
  private subscription = Subscription.EMPTY;

  viewSettingChange = new BehaviorSubject<'all' | 'active'>('active');

  appProfile: AppProfile | null = null;
  showOverview = false;
  settings: Setting[] = [];
  searchTerm = '';

  viewSetting: 'all' | 'active' = 'active';

  constructor(
    private profileService: AppProfileService,
    private route: ActivatedRoute,
    private connTrack: ConnTracker,
    private configService: ConfigService,
  ) { }

  saveSetting(event: SaveSettingEvent) {
    if (!this.appProfile) {
      return;
    }

    if (event.isDefault) {
      setAppSetting(this.appProfile!.Config, event.key, undefined);
    } else {
      setAppSetting(this.appProfile!.Config, event.key, event.value);
    }

    this.profileService.saveProfile(this.appProfile!)
      .subscribe({
        next: () => { },
        error: console.error,
      })
  }

  ngOnInit() {
    const param = this.route.paramMap
      .pipe(
        delayWhen(() => this.connTrack.ready),
        switchMap(params => {
          const source = params.get("source");
          if (source === null) {
            return of(null);
          }

          const id = params.get("id")
          if (id === null) {
            return of(null);
          }

          return this.profileService.watchAppProfile(source, id);
        })
      );

    this.subscription =
      combineLatest([
        param,
        this.profileService.globalConfig(),
        this.configService.query(""),
        this.viewSettingChange,
      ])
        .subscribe(([profile, global, allSettings, viewSetting]) => {
          this.appProfile = profile;
          this.showOverview = this.appProfile === null;
          this.viewSetting = viewSetting;

          if (!!profile) {
            const key = `core:profiles/${profile.Source}/${profile.ID}`;
            this.connTrack.inspect(key);

            const profileConfig = flattenProfileConfig(profile!.Config);

            this.settings = allSettings
              .map(setting => {
                setting.Value = profileConfig[setting.Key];
                setting.DefaultValue = global[setting.Key];
                return setting;
              })
              .filter(setting => {
                if (!(setting.Key in global)) {
                  return false;
                }

                if (viewSetting === 'all') {
                  return true;
                }

                const isDefault = isDefaultValue(setting.Value, setting.DefaultValue);
                return !isDefault;
              });

          } else {
            this.connTrack.clearInspection();
          }
        });
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
    this.connTrack.clearInspection();
  }
}
