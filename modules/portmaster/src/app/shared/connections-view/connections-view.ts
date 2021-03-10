import { Component, EventEmitter, Input, OnDestroy, Output, TrackByFunction } from '@angular/core';
import { BehaviorSubject, Subscription } from 'rxjs';
import { getAppSetting, ScopeTranslation, setAppSetting, Verdict, Connection, IPProtocol } from 'src/app/services';
import { AppProfileService } from 'src/app/services/app-profile.service';
import { InspectedProfile, ScopeGroup } from 'src/app/services/connection-tracker.service';
import { deepClone } from '../utils';
import { Router } from '@angular/router';

export type ConnectionDisplayMode = 'grouped' | 'ungrouped';
@Component({
  selector: 'app-connections-view',
  templateUrl: './connections-view.html',
  styleUrls: ['./connections-view.scss'],
})
export class ConnectionsViewComponent implements OnDestroy {
  /** @private
   *  Contants made available for the template.
   */
  readonly scopeTranslation = ScopeTranslation;
  readonly displayedColumns = ['state', 'entity', 'started', 'ended', 'reason', 'actions'];
  readonly verdict = Verdict;
  readonly Protocols = IPProtocol;

  /** Subscription to profile updates. */
  private _profileUpdatesSub = Subscription.EMPTY;

  /** TrackByFunction for scope-groups */
  trackByScope: TrackByFunction<ScopeGroup> = (_: number, g: ScopeGroup) => g.scope;

  /** TrackByFunction for connection */
  trackByConnection: TrackByFunction<Connection> = (_: number, c: Connection) => c.ID;

  /* A list of all blocked domains.
   * Required to show the correct menu-items for domain-scopes */
  private blockedDomains: string[] | null = null;

  /** Use to lazy-load the filtered, ungrouped list of connections */
  filteredUngroupedConnections = new BehaviorSubject<Connection[]>([]);

  readonly filter = {
    showAll: (c: Connection) => true,
    showBlocked: (c: Connection) => c.Verdict !== Verdict.Accept,
  };

  private ungroupedFilter: (c: Connection) => boolean = this.filter.showAll;

  /** The current display type */
  @Input()
  displayMode: ConnectionDisplayMode = 'grouped';

  /** Output that emits whenever the users changes the display mode */
  @Output()
  displayModeChange = new EventEmitter<ConnectionDisplayMode>();

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

  /**
   * @private
   * Returns the class used to color the connection's
   * verdict.
   *
   * @param conn The connection object
   */
  getVerdictClass(conn: Connection): string {
    switch (conn.Verdict) {
      case Verdict.Accept:
        return 'low';
      case Verdict.Block:
      case Verdict.Drop:
        return 'high';
      default:
        return 'medium';
    }
  }

  ngOnDestroy() {
    this._profileUpdatesSub.unsubscribe();
  }

  /**
   * @private
   * Redirect the user to "outgoing rules" setting in the
   * application profile/settings.
   */
  redirectToRules() {
    this.redirectToSetting('filter/endpoints');
  }

  /**
   * @private
   * Redirect the user to a settings key in the application
   * profile.
   *
   * @param key The settings key to redirect to
   */
  redirectToSetting(key: string) {
    if (!this.profile || !this.profile.profile) {
      return;
    }

    this.router.navigate(
      ['/', 'app', this.profile.profile.Source, this.profile.profile.ID], {
      queryParams: {
        setting: key
      }
    })
  }

  /**
   * @private
   * Creates a new "block domain" outgoing rules
   */
  blockAll(grp: ScopeGroup | string) {
    let domain: string;
    if (typeof grp === 'string') {
      domain = grp;
    } else {
      if (!grp.domain) {
        // scope blocking not yet supported
        return
      }
      domain = grp.scope;
    }

    if (this.isDomainBlocked(domain)) {
      return;
    }

    domain = domain.replace(/\.+$/, '');
    const newRule = `- ${domain}`;

    this.updateRules(newRule, true);
  }

  /**
   * @private
   * Removes a "block domain" rule from the outgoing rules
   */
  unblockAll(grp: ScopeGroup | string) {
    let domain: string;
    if (typeof grp === 'string') {
      domain = grp;
    } else {
      if (!grp.domain) {
        // scope blocking not yet supported
        return
      }
      domain = grp.scope;
    }

    if (!this.isDomainBlocked(domain)) {
      return;
    }

    domain = domain.replace(/\.+$/, '');

    const newRule = `- ${domain}`;

    this.updateRules(newRule, false);
  }

  /**
   * @private
   * Returns true if the scope (domain) is blocked.
   * Non-domain scopes are not yet supported.
   *
   * @param grp The scope group which should be blocked from now on.
   */
  isScopeBlocked(grp: ScopeGroup): boolean {
    // check if `grp.domain` is set. If, then grp.scope holdes
    // the complete domain of the connection.
    if (!!grp.domain) {
      return this.isDomainBlocked(grp.scope);
    } else {
      // TODO(ppacher): correctly handle all other scopes here.
    }

    return false;
  }

  /**
   * @private
   * Checks if `domain` is blocked.
   */
  isDomainBlocked(domain: string): boolean {
    if (this.blockedDomains === null) {
      return false;
    }
    return this.blockedDomains.some(rule => domain === rule);
  }

  /** Switches the current display mode */
  selectDisplayMode(mode: ConnectionDisplayMode) {
    this.displayMode = mode;
    this.displayModeChange.next(mode);

    // lazy-load the connections
    if (this.displayMode === 'ungrouped' && !!this.profile) {
      const conns = this.profile.getSortedConnections('most-recent', this.ungroupedFilter);
      this.filteredUngroupedConnections.next(conns);
    }
  }

  /**
   *  Changes the filter to use in ungrouped display mode.
   */
  setUngroupedFilter(filter: (c: Connection) => boolean) {
    this.ungroupedFilter = filter;
    this.selectDisplayMode('ungrouped');
  }

  /** Toggles between the supported display modes */
  cycleDisplayMode() {
    if (this.displayMode === 'grouped') {
      this.selectDisplayMode('ungrouped')
      return;
    }

    this.selectDisplayMode('grouped');
  }

  /**
   * Updates the outgoing rule set and either creates or deletes
   * a rule. If a rule should be created but already exists
   * it is moved to the top.
   *
   * @param newRule The new rule to create or delete.
   * @param add  Whether or not to create or delete the rule.
   */
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

  /**
   * Iterates of all outgoing rules and collects which domains are blocked.
   * It stops collecting domains as soon as the first "allow something" rule
   * is hit.
   */
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

  /**
   * @private
   * Dump a connection to the console
   *
   * @param conn The connection to dump
   */
  dumpConnection(conn: Connection) {
    console.log(conn);

    // Copy to clip-board if supported
    if (!!navigator.clipboard) {
      navigator.clipboard.writeText(JSON.stringify(conn, undefined, "    "))
    }
  }
}
