import { ChangeDetectorRef, Component, Input, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { AppProfile } from 'src/app/services';
import { AppProfileService } from 'src/app/services/app-profile.service';
import { InspectedProfile } from 'src/app/services/connection-tracker.service';
import { ConnectionStatistics } from 'src/app/services/connection-tracker.types';
import { fadeInAnimation } from '../../shared/animations';

@Component({
  selector: 'app-monitor-application',
  templateUrl: './application-view.html',
  styleUrls: ['./application-view.scss'],
  animations: [
    fadeInAnimation,
  ],
})
export class MonitorApplicationViewComponent implements OnDestroy {
  private profileSub = Subscription.EMPTY;

  get loading() {
    return this.profile?.loading;
  }

  get stats() {
    return this._profile?.stats || new ConnectionStatistics();
  }

  @Input()
  set profile(p: InspectedProfile | null) {
    if (!!p) {
      if (p.profile.id !== this._profile?.profile.id) {
        this._profile = p;

        // set the app profile to null so we display the
        // loading text-placeholders
        this.appProfile = null;

        this.profileSub.unsubscribe();

        this.profileSub = this.profileSerivce.watchAppProfile(p.profile.id)
          .pipe(debounceTime(100))
          .subscribe(p => {
            this.appProfile = p;
          });
      }
    } else {
      this.appProfile = null;
      this._profile = null;
    }

  }
  get profile() { return this._profile }

  private _profile: InspectedProfile | null = null;

  appProfile: AppProfile | null = null;

  constructor(
    private profileSerivce: AppProfileService,
    private changeDetector: ChangeDetectorRef
  ) { }

  ngOnDestroy() {
    this.profileSub.unsubscribe();
  }
}
