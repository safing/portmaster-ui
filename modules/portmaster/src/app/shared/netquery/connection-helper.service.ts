import { DOCUMENT } from '@angular/common';
import { Inject, Injectable, Renderer2 } from '@angular/core';
import { Router } from '@angular/router';
import { AppProfile, AppProfileService, ConfigService, deepClone, getAppSetting, IPScope, NetqueryConnection, PossilbeValue, QueryResult, setAppSetting, Verdict } from '@safing/portmaster-api';
import { BehaviorSubject, combineLatest, Observable, OperatorFunction, Subject } from 'rxjs';
import { distinctUntilChanged, map, switchMap, takeUntil } from 'rxjs/operators';
import { ActionIndicatorService } from '../action-indicator';
import { objKeys } from '../utils';
import { SfngSearchbarFields } from './searchbar';

export const IPScopeNames: { [key in IPScope]: string } = {
  [IPScope.Invalid]: "Invalid",
  [IPScope.Undefined]: "Undefined",
  [IPScope.HostLocal]: "Device Local",
  [IPScope.LinkLocal]: "Link Local",
  [IPScope.SiteLocal]: "LAN",
  [IPScope.Global]: "Internet",
  [IPScope.LocalMulticast]: "LAN Multicast",
  [IPScope.GlobalMulitcast]: "Internet Multicast"
}

@Injectable()
export class NetqueryHelper {
  readonly settings: { [key: string]: string } = {};

  refresh = new Subject<void>();

  private onShiftKey$ = new BehaviorSubject<boolean>(false);
  private addToFilter$ = new Subject<SfngSearchbarFields>();
  private destroy$ = new Subject<void>();
  private appProfiles$ = new BehaviorSubject<AppProfile[]>([]);

  readonly onShiftKey: Observable<boolean>;

  constructor(
    private router: Router,
    private profileService: AppProfileService,
    private configService: ConfigService,
    private actionIndicator: ActionIndicatorService,
    private renderer: Renderer2,
    @Inject(DOCUMENT) private document: Document,
  ) {
    const cleanupKeyDown = this.renderer.listen(this.document, 'keydown', (event: KeyboardEvent) => {
      if (event.shiftKey) {
        this.onShiftKey$.next(true)
      }
    });

    const cleanupKeyUp = this.renderer.listen(this.document, 'keyup', () => {
      if (this.onShiftKey$.getValue()) {
        this.onShiftKey$.next(false);
      }
    })

    this.onShiftKey$.subscribe({
      complete: () => {
        cleanupKeyDown();
        cleanupKeyUp();
      }
    })

    this.onShiftKey = this.onShiftKey$
      .pipe(distinctUntilChanged());

    this.configService.query('')
      .subscribe(settings => {
        settings.forEach(setting => {
          this.settings[setting.Key] = setting.Name;
        });
        this.refresh.next();
      });

    // watch all application profiles
    this.profileService.watchProfiles()
      .pipe(takeUntil(this.destroy$))
      .subscribe(profiles => {
        this.appProfiles$.next(profiles || [])
      });
  }

  decodePrettyValues(field: keyof NetqueryConnection, values: any[]): any[] {
    if (field === 'verdict') {
      return values.map(val => Verdict[val]).filter(value => value !== undefined);
    }

    if (field === 'scope') {
      return values.map(val => {
        // check if it's a value of the IPScope enum
        const scopeValue = IPScope[val];
        if (!!scopeValue) {
          return scopeValue;
        }

        // otherwise check if it's pretty name of the scope translation
        val = `${val}`.toLocaleLowerCase();
        return objKeys(IPScopeNames).find(scope => IPScopeNames[scope].toLocaleLowerCase() === val)
      }).filter(value => value !== undefined);
    }

    return values;
  }

  attachProfile(): OperatorFunction<QueryResult[], (QueryResult & { __profile?: AppProfile })[]> {
    return source => combineLatest([
      source,
      this.appProfiles$,
    ]).pipe(
      map(([items, profiles]) => {
        let lm = new Map<string, AppProfile>();
        profiles.forEach(profile => {
          lm.set(`${profile.Source}/${profile.ID}`, profile)
        })

        return items.map(item => {
          if ('profile' in item) {
            item.__profile = lm.get(item.profile!)
          }

          return item;
        })
      })
    )
  }

  encodeToPossibleValues(field: keyof NetqueryConnection): OperatorFunction<QueryResult[], (QueryResult & PossilbeValue)[]> {
    return source => combineLatest([
      source,
      this.appProfiles$
    ]).pipe(
      map(([items, profiles]) => {
        // convert profile IDs to profile name
        if (field === 'profile') {
          let lm = new Map<string, AppProfile>();
          profiles.forEach(profile => {
            lm.set(`${profile.Source}/${profile.ID}`, profile)
          })

          return items.map((item: any) => {
            const profile = lm.get(item.profile!)
            return {
              Name: profile?.Name || `${item.profile}`,
              Value: item.profile!,
              Description: '',
              __profile: profile || null,
              ...item,
            }
          })
        }

        // convert verdict identifiers to their pretty name.
        if (field === 'verdict') {
          return items.map(item => {
            if (Verdict[item.verdict!] === undefined) {
              return null
            }

            return {
              Name: Verdict[item.verdict!],
              Value: item.verdict,
              Description: '',
              ...item
            }
          })
        }

        // convert the IP scope identifier to a pretty name
        if (field === 'scope') {
          return items.map(item => {
            if (IPScope[item.scope!] === undefined) {
              return null
            }

            return {
              Name: IPScopeNames[item.scope!],
              Value: item.scope,
              Description: '',
              ...item
            }
          })
        }

        if (field === 'allowed') {
          return items.map(item => {
            return {
              Name: item.allowed ? 'Yes' : 'No',
              Value: item.allowed,
              Description: '',
              ...item
            }
          })
        }

        // the rest is just converted into the {@link PossibleValue} form
        // by using the value as the "Name".
        return items.map(item => ({
          Name: `${item[field]}`,
          Value: item[field],
          Description: '',
          ...item,
        }))
      }),
      // finally, remove any values that have been mapped to null in the above stage.
      // this may happen for values that are not valid for the given model field (i.e. using "Foobar" for "verdict")
      map(results => {
        return results.filter(val => !!val)
      })
    )
  }

  dispose() {
    this.onShiftKey$.complete();

    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Emits added fields whenever addToFilter is called */
  onFieldsAdded(): Observable<SfngSearchbarFields> {
    return this.addToFilter$.asObservable();
  }

  /** Adds a new filter to the current query */
  addToFilter(key: string, value: any[]) {
    this.addToFilter$.next({
      [key]: value,
    })
  }

  /**
   * @private
   * Returns the class used to color the connection's
   * verdict.
   *
   * @param conn The connection object
   */
  getVerdictClass(conn: NetqueryConnection): string {
    return Verdict[conn.verdict]?.toLocaleLowerCase() || `unknown-verdict<${conn.verdict}>`;
  }

  /**
   * @private
   * Redirect the user to a settings key in the application
   * profile.
   *
   * @param key The settings key to redirect to
   */
  redirectToSetting(setting: string, conn: NetqueryConnection, globalSettings = false) {
    const reason = conn.extra_data?.reason;
    if (!reason) {
      return;
    }

    if (!setting) {
      setting = reason.OptionKey;
    }

    if (!setting) {
      return;
    }

    if (globalSettings) {
      this.router.navigate(
        ['/', 'settings'], {
        queryParams: {
          setting: setting,
        }
      })
      return;
    }

    let profile = conn.profile

    if (!!reason.Profile) {
      profile = reason.Profile;
    }

    if (profile.startsWith("core:profiles/")) {
      profile = profile.replace("core:profiles/", "")
    }

    this.router.navigate(
      ['/', 'app', ...profile.split("/")], {
      queryParams: {
        tab: 'settings',
        setting: setting,
      }
    })
  }

  /**
   * @private
   * Redirect the user to "outgoing rules" setting in the
   * application profile/settings.
   */
  redirectToRules(conn: NetqueryConnection) {
    if (conn.direction === 'inbound') {
      this.redirectToSetting('filter/serviceEndpoints', conn);
    } else {
      this.redirectToSetting('filter/endpoints', conn);
    }
  }

  /**
   * @private
   * Dump a connection to the console
   *
   * @param conn The connection to dump
   */
  async dumpConnection(conn: NetqueryConnection) {
    // Copy to clip-board if supported
    try {
      if (!!navigator.clipboard) {
        await navigator.clipboard.writeText(JSON.stringify(conn, undefined, "    "))
        this.actionIndicator.info("Copied to Clipboard")
      }
    } catch (err: any) {
      this.actionIndicator.error("Copy to Clipboard Failed", err?.message || JSON.stringify(err))
    }
  }

  /**
   * @private
   * Creates a new "block domain" outgoing rules
   */
  blockAll(domain: string, conn: NetqueryConnection) {
    /* Deactivate until exact behavior is specified.
    if (this.isDomainBlocked(domain)) {
      this.actionIndicator.info(domain + ' already blocked')
      return;
    }
    */

    domain = domain.replace(/\.+$/, '');
    const newRule = `- ${domain}`;
    this.updateRules(newRule, true, conn)
  }

  /**
   * @private
   * Removes a "block domain" rule from the outgoing rules
   */
  unblockAll(domain: string, conn: NetqueryConnection) {
    /* Deactivate until exact behavior is specified.
    if (!this.isDomainBlocked(domain)) {
      this.actionIndicator.info(domain + ' already allowed')
      return;
    }
    */

    domain = domain.replace(/\.+$/, '');
    const newRule = `+ ${domain}`;
    this.updateRules(newRule, true, conn);
  }

  /**
   * Updates the outgoing rule set and either creates or deletes
   * a rule. If a rule should be created but already exists
   * it is moved to the top.
   *
   * @param newRule The new rule to create or delete.
   * @param add  Whether or not to create or delete the rule.
   */
  private updateRules(newRule: string, add: boolean, conn: NetqueryConnection) {
    if (!conn.extra_data?.reason?.Profile) {
      return
    }

    let key = 'filter/endpoints';
    if (conn.direction === 'inbound') {
      key = 'filter/serviceEndpoints'
    }

    this.profileService.getAppProfile(conn.profile)
      .pipe(
        switchMap(profile => {
          let rules = getAppSetting<string[]>(profile.Config, key) || [];
          rules = rules.filter(rule => rule !== newRule);

          if (add) {
            rules.splice(0, 0, newRule)
          }

          const newProfile = deepClone(profile);
          setAppSetting(newProfile.Config, 'filter/endpoints', rules);

          return this.profileService.saveProfile(newProfile)
        })
      )
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
  // FIXME
  /*
  private collectBlockedDomains() {
    let blockedDomains = new Set<string>();

    const rules = getAppSetting<string[]>(this.profile!.profile!.Config, 'filter/endpoints') || [];
    for (let i = 0; i < rules.length; i++) {
      const rule = rules[i];
      if (rule.startsWith('+ ')) {
        break;
      }

      blockedDomains.add(rule.slice(2))
    }

    this.blockedDomains = Array.from(blockedDomains)
  }
  */
}
