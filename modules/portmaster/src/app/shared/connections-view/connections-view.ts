import { Component, Input, OnDestroy, TrackByFunction } from '@angular/core';
import { Subscription } from 'rxjs';
import { getAppSetting, ScopeTranslation, setAppSetting, Verdict } from 'src/app/services';
import { AppProfileService } from 'src/app/services/app-profile.service';
import { InspectedProfile, ScopeGroup } from 'src/app/services/connection-tracker.service';
import { deepClone } from '../utils';
import { Router } from '@angular/router';

@Component({
  selector: 'app-connections-view',
  templateUrl: './connections-view.html',
  styleUrls: ['./connections-view.scss'],
  //changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConnectionsViewComponent implements OnDestroy {
  readonly scopeTranslation = ScopeTranslation;
  readonly displayedColumns = ['state', 'reason', 'entity', 'started', 'ended'];
  readonly verdict = Verdict;
  private _profileUpdatesSub = Subscription.EMPTY;

  trackByScope: TrackByFunction<ScopeGroup> = (_: number, g: ScopeGroup) => g.scope;

  blockedDomains: string[] | null = null;

  @Input()
  set profile(p: InspectedProfile | null) {
    this._profile = p;

    this.blockedDomains = null;
    if (!!this._profile) {
      this._profileUpdatesSub.unsubscribe();

      this._profileUpdatesSub = this._profile.profileUpdates
        .subscribe(() => {
          this.blockedDomains = null;
          this.collectBlockedDomains();
        });
    }
  }
  get profile() {
    return this._profile;
  }
  private _profile: InspectedProfile | null = null;

  constructor(
    private profileService: AppProfileService,
    private router: Router,
  ) { }

  ngOnDestroy() {
    this._profileUpdatesSub.unsubscribe();
  }

  redirectToRules() {
    if (!this.profile || !this.profile.profile) {
      return;
    }

    this.router.navigate(
      ['/', 'app', this.profile.profile.Source, this.profile.profile.ID], {
      queryParams: {
        setting: 'filter/endpoints'
      }
    })
  }

  blockAll(grp: ScopeGroup) {
    if (!grp.domain) {
      // scope blocking not yet supported
      return
    }

    if (this.isScopeBlocked(grp)) {
      return;
    }

    const newRule = `- ${grp.scope}`;

    this.updateRules(newRule, true);
  }

  unblockAll(grp: ScopeGroup) {
    if (!grp.domain) {
      // scope blocking not yet supported
      return
    }

    if (!this.isScopeBlocked(grp)) {
      return;
    }

    const newRule = `- ${grp.scope}`;

    this.updateRules(newRule, false);
  }

  isScopeBlocked(grp: ScopeGroup) {
    // blocked domains are not yet loaded
    if (this.blockedDomains === null) {
      return false;
    }

    if (!!grp.domain) {
      return this.blockedDomains.some(rule => grp.scope === rule);
    } else {
      // TODO(ppacher): correctly handle all other scopes here.
    }

    return false;
  }

  private updateRules(newRule: string, add: boolean) {
    if (!this.profile) {
      return
    }

    let rules = getAppSetting<string[]>(this.profile!.profile!.Config, 'filter/endpoints') || [];
    rules = rules.filter(rule => rule !== newRule);

    if (add) {
      rules.splice(0, 0, newRule)
    }

    const profile = deepClone(this.profile!.profile);
    setAppSetting(profile.Config, 'filter/endpoints', rules);

    this.profileService.saveLocalProfile(profile)
      .subscribe();
  }

  private collectBlockedDomains() {
    let blockedDomains = new Set<string>();

    const rules = getAppSetting<string[]>(this.profile!.profile!.Config, 'filter/endpoints') || [];
    for (let i = 0; i < rules.length; i++) {
      const rule = rules[i];
      if (rule.startsWith('+ ')) {
        break;
      }

      blockedDomains.add(rule.substr(2))
    }

    this.blockedDomains = Array.from(blockedDomains)

  }
}
