import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { AppProfileService, ConfigService, Connection, getAppSetting, IsDenied, ScopeTranslation, setAppSetting, Verdict } from 'src/app/services';
import { InspectedProfile, ScopeGroup } from 'src/app/services/connection-tracker.service';
import { ActionIndicatorService } from '../action-indicator';
import { deepClone } from '../utils';

@Injectable()
export class ConnectionHelperService {
  readonly scopeTranslation = ScopeTranslation;

  set profile(p: InspectedProfile | null) {
    this._profile = p;
    this.blockedDomains = [];

    this._profileSubscriptions.unsubscribe();
    this._profileSubscriptions = new Subscription();

    if (!!p) {
      let profileUpdateSubscription = p.profileUpdates
        .subscribe(() => {
          this.blockedDomains = null;
          this.collectBlockedDomains();
          this.refresh.next();
        });
      this._profileSubscriptions.add(profileUpdateSubscription);
    }
  }
  get profile() { return this._profile; }
  private _profile: InspectedProfile | null = null;

  private _profileSubscriptions = Subscription.EMPTY;

  private blockedDomains: string[] | null = null;

  readonly settings: { [key: string]: string } = {};

  refresh = new Subject<void>();

  constructor(
    private router: Router,
    private profileService: AppProfileService,
    private configService: ConfigService,
    private actionIndicator: ActionIndicatorService
  ) {
    this.configService.query('')
      .subscribe(settings => {
        settings.forEach(setting => {
          this.settings[setting.Key] = setting.Name;
        });
        this.refresh.next();
      })
  }

  /**
   * @private
   * Returns the class used to color the connection's
   * verdict.
   *
   * @param conn The connection object
   */
  getVerdictClass(conn: Connection): string {
    return Verdict[conn.Verdict].toLocaleLowerCase();
  }

  /**
   * @private
   * Redirect the user to a settings key in the application
   * profile.
   *
   * @param key The settings key to redirect to
   */
  redirectToSetting(optionKey: string, globalSettings = false) {
    if (!optionKey || !this.profile) {
      return;
    }

    if (globalSettings) {
      this.router.navigate(
        ['/', 'settings'], {
        queryParams: {
          setting: optionKey
        }
      })
      return;
    }

    this.router.navigate(
      ['/', 'app', this.profile.Source, this.profile.ID], {
      queryParams: {
        setting: optionKey
      }
    })
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
   * Dump a connection to the console
   *
   * @param conn The connection to dump
   */
  async dumpConnection(conn: Connection) {
    // Copy to clip-board if supported
    try {
      if (!!navigator.clipboard) {
        await navigator.clipboard.writeText(JSON.stringify(conn, undefined, "    "))
        this.actionIndicator.info("Copied to Clipboard")
      }
    } catch (err) {
      this.actionIndicator.error("Copy to Clipboard Failed", err.message || JSON.stringify(err))
    }
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

    /* Deactivate until exact behavior is specified.
    if (this.isDomainBlocked(domain)) {
      this.actionIndicator.info(domain + ' already blocked')
      return;
    }
    */

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

    /* Deactivate until exact behavior is specified.
    if (!this.isDomainBlocked(domain)) {
      this.actionIndicator.info(domain + ' already allowed')
      return;
    }
    */

    domain = domain.replace(/\.+$/, '');
    const newRule = `+ ${domain}`;
    this.updateRules(newRule, true);
  }

  /**
   * @private
   * Returns true if the scope (domain) is blocked.
   * Non-domain scopes are not yet supported.
   *
   * @param grp The scope group which should be blocked from now on.
   */
  isScopeBlocked(grp: ScopeGroup, def: boolean = false): boolean {
    // check if `grp.domain` is set. If, then grp.scope holdes
    // the complete domain of the connection.
    if (!!grp.domain) {
      return this.isDomainBlocked(grp.scope, def);
    } else {
      // TODO(ppacher): correctly handle all other scopes here.
    }

    return false;
  }

  /**
   * @private
   * Checks if `domain` is blocked.
   */
  isDomainBlocked(domain: string, def: boolean = false): boolean {
    if (this.blockedDomains === null) {
      return def;
    }

    if (domain.endsWith(".")) {
      domain = domain.slice(0, -1);
    }
    if (this.blockedDomains.some(rule => domain === rule || (rule.startsWith(".") && domain.endsWith(rule)))) {
      return true;
    }
    return def;
  }

  /**
   *
   * Checks if a connection has been blocked by rules.
   * If the connection is not blocked/allowed by rules
   * it defaults to the the current connection verdict.
   */
  isConnectionBlocked(conn: Connection): boolean {
    if (this.isDomainBlocked(conn.Entity.Domain)) {
      return true;
    }
    return IsDenied(conn.Verdict);
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
      .subscribe({
        next: () => {
          if (add) {
            this.actionIndicator.success('Rules Updated', 'Successfully created a new rule.')
          } else {
            this.actionIndicator.success('Rules Updated', 'Successfully removed matching rule.')
          }
        },
        error: err => {
          this.actionIndicator.error('Failed to update rules', JSON.stringify(err))
        }
      });
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
}
