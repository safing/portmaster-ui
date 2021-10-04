import { ChangeDetectionStrategy, ChangeDetectorRef, Component, HostBinding, OnDestroy, OnInit } from '@angular/core';
import { parse } from 'psl';
import { combineLatest, forkJoin, Observable, Subscription } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { Action, AppProfile, AppProfileService, ConnectionPrompt, NotificationsService, NotificationType } from 'src/app/services';
import { moveInOutAnimation, moveInOutListAnimation } from 'src/app/shared/animations';
import { ParsedDomain, parseDomain } from 'src/app/shared/utils';

// ExtendedConnectionPrompt extends the normal connection prompt
// with parsed domain information.
interface ExtendedConnectionPrompt extends ConnectionPrompt, ParsedDomain { }

// ProfilePrompts extends an application profile with prompt
// information mainly used for paginagtion.
interface ProfilePrompts extends AppProfile {
  promptsLimited: ExtendedConnectionPrompt[];
  prompts: ExtendedConnectionPrompt[];
  showAll: boolean;
}

// Number of prompts to display per application profile
// before we start to paginate the list of prompts.
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

  /**
   * @private
   * Sets "empty" class on the host element if no prompts are displayed
   */
  @HostBinding('class.empty')
  get isEmpty() {
    return this.profiles.length === 0;
  }

  // Subscription to new prompts and profile updates.
  private subscription = Subscription.EMPTY;

  constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private profileService: AppProfileService,
    public notifService: NotificationsService,
  ) { }

  ngOnInit() {
    // filter the stream of all notifications to only emit
    // prompts that are used by the privacy filter (filter:prompt prefix).
    const prompts$: Observable<ConnectionPrompt[]> = this.notifService
      .new$
      .pipe(
        map(notifs => notifs.filter(notif => {
          return notif.Type === NotificationType.Prompt &&
            notif.EventID.startsWith('filter:prompt');
        })),
      );

    // each time the notification list is emitted make sure we have an
    // up-to-date copy of the linked application profile as well.
    const profiles$ = prompts$
      .pipe(
        switchMap(notifs => {
          // collect all profile keys in a distict set so we don't load
          // them more that once.
          const profileKeys = new Set<string>();
          notifs.forEach(n => profileKeys.add(
            this.profileService.getKey(n.EventData!.Profile.Source, n.EventData!.Profile.ID)
          ));
          // load all of them in parallel
          return forkJoin(
            Array.from(profileKeys).map(key => this.profileService.getAppProfileFromKey(key))
          );
        })
      );

    // subscribe to updates on the prompt list and the related profiles.
    this.subscription =
      combineLatest([
        prompts$,
        profiles$,
      ]).subscribe(([prompts, profiles]) => {

        const promptsByProfile = new Map<string, ExtendedConnectionPrompt[]>();

        // for each prompt, make an "extended" connection prompt by parsing the
        // domain and index them by profile key
        prompts.forEach(prompt => {
          // prompts must have the connection data attached. If not, ignore it
          // here.
          if (!prompt.EventData) {
            return;
          }

          // get the list of prompts indexed by the profile ID. if this is
          // the first prompt for that profile create a new array and place
          // it at the index.
          let entries = promptsByProfile.get(prompt.EventData.Profile.ID);
          if (!entries) {
            entries = [];
            promptsByProfile.set(prompt.EventData.Profile.ID, entries);
          }

          // Create an "extended" version of the prompt by parsing
          // and assigning the domain and subdomain values.
          const copy: ExtendedConnectionPrompt = {
            ...prompt,
            domain: null,
            subdomain: null,
          };
          Object.assign(copy, parseDomain(prompt.EventData.Entity.Domain));
          entries.push(copy);
        });

        // Convert the list of application profiles into a set of ProfilePrompts
        // objects that we can use to actually display the prompts with pagination
        // applied.
        this.profiles = profiles
          .filter(profile => !!promptsByProfile.get(profile.ID))
          .map(profile => {
            const prompts = promptsByProfile.get(profile.ID)!;
            return {
              ...profile,
              showAll: prompts.length < PromptLimit,
              promptsLimited: prompts.slice(0, PromptLimit),
              prompts,
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
      });
  }

  allow(prompt: ConnectionPrompt) {
    const allowActions = [
      'allow-domain-all',
      'allow-serving-ip',
      'allow-ip',
    ];

    for (let i = 0; i < allowActions.length; i++) {
      const action = prompt.AvailableActions.find(a => a.ID === allowActions[i]);
      if (!!action) {
        this.execute(prompt, action);
        return;
      }
    }
  }

  block(prompt: ConnectionPrompt) {
    const permitActions = [
      'block-domain-all',
      'block-serving-ip',
      'block-ip',
    ];

    for (let i = 0; i < permitActions.length; i++) {
      const action = prompt.AvailableActions.find(a => a.ID === permitActions[i]);
      if (!!action) {
        this.execute(prompt, action);
        return;
      }
    }
  }

  allowAll(profile: ProfilePrompts) {
    profile.prompts.forEach(prompt => this.allow(prompt));
  }

  denyAll(profile: ProfilePrompts) {
    profile.prompts.forEach(prompt => this.block(prompt));
  }

  execute(prompt: ConnectionPrompt, action: Action) {
    this.notifService.execute(prompt, action)
      .subscribe({
        error: console.error,
      });
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  /** @private - {@link TrackByFunction} for profile prompts */
  trackProfile(_: number, p: ProfilePrompts) {
    return p.ID;
  }
}
