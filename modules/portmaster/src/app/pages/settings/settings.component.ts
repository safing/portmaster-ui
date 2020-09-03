import { Component, OnInit, AfterViewInit, ViewChildren, ElementRef, QueryList, OnDestroy } from '@angular/core';
import { ConfigService, Subsystem, Setting, StatusService } from 'src/app/services';
import { combineLatest } from 'rxjs/operators';

@Component({
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit, AfterViewInit, OnDestroy {
  subsystems: Subsystem[] = [];
  settings: { [key: string]: Setting[] } = {};
  shouldShowSettingsNav = false;
  activeSection = '';

  @ViewChildren('navLink', { read: ElementRef })
  navLinks: QueryList<ElementRef> | null = null;

  private observer: IntersectionObserver | null = null;

  constructor(
    public configService: ConfigService,
    public statusService: StatusService,
  ) { }

  ngOnInit(): void {
    // poor mans animation ...
    setTimeout(() => {
      this.shouldShowSettingsNav = true;
    }, 500);

    this.configService.query("")
      .pipe(
        combineLatest(this.statusService.watchSubsystems())
      )
      .subscribe(
        ([settings, subsystems]) => {
          this.subsystems = subsystems;

          this.settings = {
            'other': [],
          };
          this.subsystems.forEach(subsys => {
            this.settings[subsys.ConfigKeySpace] = []
          });

          settings.forEach(setting => {
            let pushed = false;
            this.subsystems.forEach(subsys => {
              if (setting.Key.startsWith(subsys.ConfigKeySpace.slice("config:".length))) {
                this.settings[subsys.ConfigKeySpace].push(setting);
                pushed = true;
              }
            })

            if (!pushed) {
              this.settings['other'].push(setting);
            }

            Object.keys(this.settings).forEach(key => {
              this.settings[key].sort((a, b) => {
                return (a.Order || 0) - (b.Order || 0);
              })
            })
          })
        }
      )
  }

  ngAfterViewInit() {
    this.navLinks?.changes.subscribe(() => {
      this.observer?.disconnect();

      this.observer = new IntersectionObserver(this.intersectionCallback.bind(this));

      this.navLinks?.forEach(elem => {
        console.log(elem.nativeElement);
        this.observer!.observe(elem.nativeElement);
      })
    })
  }

  ngOnDestroy() {
    this.observer?.disconnect();
    this.observer = null;
  }

  intersectionCallback(entries: IntersectionObserverEntry[]) {
    if (!entries) {
      return;
    }

    console.log(entries[0]);

    const elem = entries[0].target?.id;
    if (elem === this.activeSection) {
      return;
    }

    if (entries[0].isIntersecting) {
      this.activeSection = elem;
      return;
    }

    this.activeSection = this.subsystems[0].ConfigKeySpace;
    for (let i = 0; i < this.subsystems.length; i++) {
      const subsys = this.subsystems[i];
      if (subsys.ConfigKeySpace === elem && i > 0) {
        this.activeSection = this.subsystems[i - 1].ConfigKeySpace;
        return;
      }
    }
  }

  scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
      inline: 'nearest',
    })
  }
}
