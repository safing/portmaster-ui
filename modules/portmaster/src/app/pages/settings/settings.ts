import { Component, OnInit, AfterViewInit, ViewChildren, ElementRef, QueryList, OnDestroy, ViewChild, ChangeDetectorRef } from '@angular/core';
import { ConfigService, Subsystem, Setting, StatusService, ExpertiseLevelNumber } from 'src/app/services';
import { combineLatest, fromEvent, Subscription } from 'rxjs';
import { debounceTime, startWith } from 'rxjs/operators';

interface Category {
  name: string;
  settings: Setting[];
  minimumExpertise: ExpertiseLevelNumber;
}

@Component({
  templateUrl: './settings.html',
  styleUrls: ['./settings.scss']
})
export class SettingsComponent implements OnInit, AfterViewInit, OnDestroy {
  subsystems: Subsystem[] = [];
  others: Setting[] | null = null
  settings: Map<string, Category[]> = new Map();

  shouldShowSettingsNav = false;
  activeSection = '';
  activeCategory = '';

  @ViewChildren('navLink', { read: ElementRef })
  navLinks: QueryList<ElementRef> | null = null;

  @ViewChild('scrollContainer', { read: ElementRef, static: true })
  scrollContainer: ElementRef | null = null;

  private subscription = Subscription.EMPTY;

  constructor(
    public configService: ConfigService,
    public statusService: StatusService,
    private changeDetectorRef: ChangeDetectorRef,
  ) { }

  ngOnInit(): void {
    combineLatest([this.configService.query(""), this.statusService.watchSubsystems()])
      .subscribe(
        ([settings, subsystems]) => {
          console.log('settings', settings, subsystems);

          this.subsystems = subsystems;
          this.others = [];
          this.settings = new Map();

          settings.sort((a, b) => {
            const orderA = a.Annotations?.["safing/portbase:ui:order"] || 0;
            const orderB = b.Annotations?.["safing/portbase:ui:order"] || 0;
            return orderB - orderA;
          });

          settings.forEach(setting => {
            let pushed = false;
            this.subsystems.forEach(subsys => {
              if (setting.Key.startsWith(subsys.ConfigKeySpace.slice("config:".length))) {

                let catName = 'other';
                if (!!setting.Annotations && !!setting.Annotations["safing/portbase:ui:category"]) {
                  catName = setting.Annotations["safing/portbase:ui:category"]
                }

                let categories = this.settings.get(subsys.ConfigKeySpace);
                if (!categories) {
                  categories = [];
                  this.settings.set(subsys.ConfigKeySpace, categories);
                }

                let cat = categories.find(c => c.name === catName)
                if (!cat) {
                  cat = {
                    name: catName,
                    minimumExpertise: ExpertiseLevelNumber.developer,
                    settings: []
                  }
                  categories.push(cat);
                }

                cat.settings.push(setting)
                if (setting.ExpertiseLevel < cat.minimumExpertise) {
                  cat.minimumExpertise = setting.ExpertiseLevel;
                }

                pushed = true;
              }
            })

            if (!pushed) {
              this.others!.push(setting);
            }
          })

          this.shouldShowSettingsNav = true;
        }
      )
  }

  ngAfterViewInit() {
    this.subscription = fromEvent(this.scrollContainer?.nativeElement, 'scroll')
      .pipe(debounceTime(10))
      .subscribe(() => this.intersectionCallback())

    this.subscription.add(
      this.navLinks?.changes.subscribe(() => {
        this.intersectionCallback();
        this.changeDetectorRef.detectChanges();
      })
    );
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  intersectionCallback() {
    this.navLinks?.some(link => {
      const subsystem = link.nativeElement.getAttribute("subsystem");
      const category = link.nativeElement.getAttribute("category");

      const lastChild = (link.nativeElement as HTMLElement).lastElementChild as HTMLElement;

      const rect = lastChild.getBoundingClientRect();
      const styleBox = getComputedStyle(lastChild);

      const offset = rect.top + rect.height - parseInt(styleBox.marginBottom) - parseInt(styleBox.paddingBottom);
      console.log(offset, rect, lastChild);

      if (offset > 70) {
        this.activeSection = subsystem;
        this.activeCategory = category;
        return true;
      }

      return false;
    })
  }

  scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
      inline: 'nearest',
    })
  }
}
