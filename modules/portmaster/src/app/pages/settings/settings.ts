import { Component, OnInit, AfterViewInit, ViewChildren, ElementRef, QueryList, OnDestroy, ViewChild, ChangeDetectorRef } from '@angular/core';
import { ConfigService, Subsystem, Setting, StatusService, ExpertiseLevelNumber, getExpertiseLevelNumber } from 'src/app/services';
import { BehaviorSubject, combineLatest, fromEvent, Subscription } from 'rxjs';
import { debounceTime, startWith } from 'rxjs/operators';
import { ScrollDispatcher } from '@angular/cdk/overlay';
import { FuzzySearchService } from 'src/app/shared/fuzzySearch';
import { ExpertiseService } from 'src/app/shared/expertise/expertise.service';
import { fadeInAnimation } from 'src/app/shared/animations';

interface Category {
  name: string;
  settings: Setting[];
  minimumExpertise: ExpertiseLevelNumber;
}

@Component({
  templateUrl: './settings.html',
  styleUrls: [
    '../page.scss',
    './settings.scss'
  ],
  animations: [fadeInAnimation]
})
export class SettingsComponent implements OnInit, AfterViewInit, OnDestroy {
  subsystems: Subsystem[] = [];
  others: Setting[] | null = null
  settings: Map<string, Category[]> = new Map();

  activeSection = '';
  activeCategory = '';
  searchTerm: string = '';
  loading = true;

  private onSearch = new BehaviorSubject<string>('');

  @ViewChildren('navLink', { read: ElementRef })
  navLinks: QueryList<ElementRef> | null = null;

  private subscription = Subscription.EMPTY;

  constructor(
    public configService: ConfigService,
    public statusService: StatusService,
    private changeDetectorRef: ChangeDetectorRef,
    private scrollDispatcher: ScrollDispatcher,
    private searchService: FuzzySearchService,
  ) { }

  ngOnInit(): void {
    combineLatest([
      this.configService.query(""),
      this.statusService.watchSubsystems(),
      this.onSearch.pipe(debounceTime(250)),
    ])
      .pipe(debounceTime(10))
      .subscribe(
        ([settings, subsystems, searchTerm]) => {

          this.subsystems = subsystems;
          this.others = [];
          this.settings = new Map();

          const filtered = this.searchService.searchList(settings, searchTerm, {
            ignoreLocation: true,
            ignoreFieldNorm: true,
            threshold: 0.1,
            minMatchCharLength: 3,
            keys: [
              { name: 'Name', weight: 3 },
              { name: 'Description', weight: 2 },
            ]
          })

          settings = filtered
            .map(res => res.item);


          settings.sort((a, b) => {
            const orderA = a.Annotations?.["safing/portbase:ui:order"] || 0;
            const orderB = b.Annotations?.["safing/portbase:ui:order"] || 0;
            return orderA - orderB;
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

          this.subsystems = this.subsystems.filter(subsys => {
            return !!this.settings.get(subsys.ConfigKeySpace);
          })

          this.loading = false;
        }
      )
  }

  ngAfterViewInit() {
    this.subscription = this.scrollDispatcher.scrolled(10)
      .subscribe(() => this.intersectionCallback());

    this.subscription.add(
      this.navLinks?.changes.subscribe(() => {
        this.intersectionCallback();
        this.changeDetectorRef.detectChanges();
      })
    );
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
    this.onSearch.complete();
  }

  searchSettings(searchTerm: string) {
    this.searchTerm = searchTerm;
    this.onSearch.next(searchTerm);
  }

  intersectionCallback() {
    this.navLinks?.some(link => {
      const subsystem = link.nativeElement.getAttribute("subsystem");
      const category = link.nativeElement.getAttribute("category");


      const lastChild = (link.nativeElement as HTMLElement).lastElementChild as HTMLElement;
      if (!lastChild) {
        return false;
      }

      const rect = lastChild.getBoundingClientRect();
      const styleBox = getComputedStyle(lastChild);

      const offset = rect.top + rect.height - parseInt(styleBox.marginBottom) - parseInt(styleBox.paddingBottom);

      if (offset > 70) {
        this.activeSection = subsystem;
        this.activeCategory = category;
        return true;
      }

      return false;
    })
    this.changeDetectorRef.detectChanges();
  }

  scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
      inline: 'nearest',
    })
  }
}
