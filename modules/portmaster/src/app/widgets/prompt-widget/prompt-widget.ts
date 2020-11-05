import { ChangeDetectionStrategy, Component, OnInit, OnDestroy, ChangeDetectorRef, HostBinding, TrackByFunction } from '@angular/core';
import { combineLatest, forkJoin, Observable, Subscription } from 'rxjs';
import { map, switchAll, switchMap, switchMapTo } from 'rxjs/operators';
import { parse } from 'psl';
import { AppProfile, AppProfileService, ConfigService, Connection, ConnectionPrompt, ConnectionPromptData, Notification, NotificationsService, NotificationType, setAppSetting } from 'src/app/services';
import { animation } from '@angular/animations';
import { moveInOutAnimation, moveInOutListAnimation } from 'src/app/shared/animations';

interface ExtendedConnectionPrompt extends ConnectionPrompt {
  domain: string | null;
  subdomain: string | null;
}

interface ProfilePrompts extends AppProfile {
  promptsLimited: ExtendedConnectionPrompt[];
  prompts: ExtendedConnectionPrompt[];
  showAll: boolean;
}

const PromptLimit = 3;

@Component({
  templateUrl: './prompt-widget.html',
  styleUrls: [
    '../widget.scss',
    './prompt-widget.scss'
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    moveInOutAnimation,
    moveInOutListAnimation
  ]
})
export class PromptWidgetComponent implements OnInit, OnDestroy {
  profiles: ProfilePrompts[] = [];

  @HostBinding('class.empty')
  get isEmpty() {
    return this.profiles.length === 0;
  }

  private subscription = Subscription.EMPTY;

  constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private profileService: AppProfileService,
    public notifService: NotificationsService,
  ) { }

  ngOnInit() {
    const prompts$: Observable<ConnectionPrompt[]> = this.notifService
      .new$
      .pipe(
        map(notifs => notifs.filter(notif => notif.Type === NotificationType.Prompt && notif.EventID.startsWith("filter:prompt"))),
      );

    const profiles$ = prompts$
      .pipe(
        switchMap(notifs => {
          var profileKeys = new Set<string>();
          notifs.forEach(n => profileKeys.add(
            this.profileService.getKey(n.EventData.Profile.Source, n.EventData.Profile.ID)
          ));

          return forkJoin(
            Array.from(profileKeys).map(key => this.profileService.getAppProfileFromKey(key))
          )
        })
      );

    this.subscription =
      combineLatest([
        prompts$,
        profiles$,
      ]).subscribe(([prompts, profiles]) => {
        let promptsByProfile = new Map<string, ExtendedConnectionPrompt[]>();

        prompts.forEach(prompt => {
          let entries = promptsByProfile.get(prompt.EventData.Profile.ID);
          if (!entries) {
            entries = [];
            promptsByProfile.set(prompt.EventData.Profile.ID, entries);
          }

          const parsed = parse(prompt.EventData.Entity.Domain);
          entries.push({
            ...prompt,
            domain: (parsed as any).domain || null,
            subdomain: (parsed as any).subdomain || null,
          });
        });

        this.profiles = profiles
          .filter(profile => !!promptsByProfile.get(profile.ID))
          .map(profile => {
            const prompts = promptsByProfile.get(profile.ID)!;
            return {
              ...profile,
              showAll: prompts.length < PromptLimit,
              promptsLimited: prompts.slice(0, PromptLimit),
              prompts: prompts,
            };
          })
          .sort((a, b) => {
            if (a.ID > b.ID) {
              return 1;
            }
            if (a.ID < b.ID) {
              return -1;
            }
            return 0;
          });

        this.changeDetectorRef.markForCheck();
      })
  }

  allow(prompt: ConnectionPrompt) {
    let allowActions = [
      'allow-domain-all',
      'allow-serving-ip',
      'allow-ip',
    ];

    for (let i = 0; i < allowActions.length; i++) {
      const action = prompt.AvailableActions.find(a => a.ID === allowActions[i])
      if (!!action) {
        this.execute(prompt, action.ID);
        return;
      }
    }
  }

  block(prompt: ConnectionPrompt) {
    let permitActions = [
      'block-domain-all',
      'block-serving-ip',
      'block-ip',
    ];

    for (let i = 0; i < permitActions.length; i++) {
      const action = prompt.AvailableActions.find(a => a.ID === permitActions[i])
      if (!!action) {
        this.execute(prompt, action.ID);
        return;
      }
    }
  }

  private updateDefault(profile: AppProfile, value: 'permit' | 'block' | 'ask') {
    setAppSetting(profile.Config, 'filter/defaultAction', value);
    this.profileService.saveProfile(profile)
      .subscribe(() => {
        this.profiles.forEach(profile => {
          profile.prompts.forEach(prompt => {
            this.execute(prompt, 'cancel');
          });
        })
      })
  }

  allowAll(profile: ProfilePrompts) {
    profile.prompts.forEach(prompt => this.allow(prompt));
  }

  denyAll(profile: ProfilePrompts) {
    profile.prompts.forEach(prompt => this.block(prompt));
  }

  execute(prompt: ConnectionPrompt, aid: string) {
    this.notifService.execute(prompt, aid)
      .subscribe({
        error: console.error,
      });
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  trackProfile(_: number, p: ProfilePrompts) {
    return p.ID;
  }
}
