import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BehaviorSubject, combineLatest, of, Subscription } from 'rxjs';
import { delayWhen, distinctUntilChanged, filter, switchMap, withLatestFrom } from 'rxjs/operators';
import { AppProfile, ConfigService, FlatConfigObject, flattenProfileConfig, isDefaultValue, setAppSetting, Setting } from 'src/app/services';
import { AppProfileService } from 'src/app/services/app-profile.service';
import { ConnTracker, InspectedProfile } from 'src/app/services/connection-tracker.service';
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
  highlightSettingKey: string | null = null;

  viewSetting: 'all' | 'active' = 'active';

  /**
   * @private
   * True if the currently selected app profile is running and has
   * network connections.
   */
  get isActive() {
    return this.connTrack.inspected !== null;
  }

  /**
   * @private
   * The inspected application profile, if any.
   */
  get inspected(): InspectedProfile | null {
    return this.connTrack.inspected;
  }

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
        this.route.queryParamMap,
        this.profileService.globalConfig(),
        this.configService.query(""),
        this.viewSettingChange.pipe(
          distinctUntilChanged(),
        ),
      ])
        .subscribe(([profile, queryMap, global, allSettings, viewSetting]) => {
          this.appProfile = profile;
          this.showOverview = this.appProfile === null;
          this.viewSetting = viewSetting;
          this.highlightSettingKey = queryMap.get('setting');
          let profileConfig: FlatConfigObject = {};

          if (!!profile) {
            profileConfig = flattenProfileConfig(profile!.Config);
          }

          // if we should highlight a setting make sure to switch the
          // viewSetting to all if it's the "global" default (that is, no
          // value is set). Otherwise the setting won't render and we cannot
          // highlight it.
          if (!!this.highlightSettingKey) {
            if (profileConfig[this.highlightSettingKey] === undefined) {
              this.viewSetting = 'all';
              this.viewSettingChange.next('all');
            }
          }

          if (!!profile) {
            const key = `core:profiles/${profile.Source}/${profile.ID}`;
            this.connTrack.inspect(key);

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

                if (this.viewSetting === 'all') {
                  return true;
                }
                return setting.Value !== undefined;
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
