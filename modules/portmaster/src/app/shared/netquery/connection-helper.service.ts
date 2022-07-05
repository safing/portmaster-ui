import { DOCUMENT } from '@angular/common';
import { Inject, Injectable, Renderer2 } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, combineLatest, Observable, of, OperatorFunction, Subject } from 'rxjs';
import { catchError, distinctUntilChanged, map, switchMap, takeUntil, tap } from 'rxjs/operators';
import { AppProfile, AppProfileService, ConfigService, getAppSetting, NetqueryConnection, PossilbeValue, QueryResult, setAppSetting, Verdict } from 'src/app/services';
import { ActionIndicatorService } from '../action-indicator';
import { deepClone } from '../utils';
import { SfngSearchbarFields } from './searchbar';

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

  transformValues(field: keyof NetqueryConnection): OperatorFunction<QueryResult[], (QueryResult & PossilbeValue)[]> {
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
            const profile = lm.get(item[field])
            return {
              Name: profile?.Name || `${item}`,
              Value: item[field],
              Description: '',
              ...item,
            }
          })
        }

        return items.map(item => ({
          Name: `${item[field]}`,
          Value: item[field],
          Description: '',
          ...item,
        }))
      }),
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

    this.profileService.getAppProfileFromKey(conn.profile)
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
