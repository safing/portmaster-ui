import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { ScrollDispatcher } from '@angular/cdk/overlay';
import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, QueryList, ViewChildren } from '@angular/core';
import { BehaviorSubject, combineLatest, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { ConfigService, ExpertiseLevelNumber, Setting, StatusService, Subsystem } from 'src/app/services';
import { fadeInAnimation } from 'src/app/shared/animations';
import { FuzzySearchService } from 'src/app/shared/fuzzySearch'; import { SaveSettingEvent } from './generic-setting/generic-setting';

interface Category {
  name: string;
  settings: Setting[];
  minimumExpertise: ExpertiseLevelNumber;
}

@Component({
  selector: 'app-settings-view',
  templateUrl: './config-settings.html',
  styleUrls: ['./config-settings.scss'],
  animations: [fadeInAnimation]
})
export class ConfigSettingsViewComponent implements OnInit, OnDestroy, AfterViewInit {
  subsystems: Subsystem[] = [];
  others: Setting[] | null = null
  settings: Map<string, Category[]> = new Map();

  activeSection = '';
  activeCategory = '';
  loading = true;

  @Input()
  resetLabelText = 'Reset to system default';

  @Input()
  set lockDefaults(v: any) {
    this._lockDefaults = coerceBooleanProperty(v);
  }
  get lockDefaults() {
    return this._lockDefaults;
  }
  private _lockDefaults = false;

  @Input()
  set searchTerm(v: string) {
    this.onSearch.next(v);
  }

  @Input()
  set availableSettings(v: Setting[]) {
    this.onSettingsChange.next(v);
  }

  @Input()
  set highlightKey(key: string | null) {
    this._highlightKey = key || null;
    this._scrolledToHighlighted = false;
    // If we already loaded the settings then instruct the window
    // to scroll the setting into the view.
    if (!!key && !!this.settings && this.settings.size > 0) {
      this.scrollTo(key);
      this._scrolledToHighlighted = true;
    }
  }
  get highlightKey() {
    return this._highlightKey;
  }
  private _highlightKey: string | null = null;
  private _scrolledToHighlighted = false;

  @Output()
  onSave = new EventEmitter<SaveSettingEvent>();

  private onSearch = new BehaviorSubject<string>('');
  private onSettingsChange = new BehaviorSubject<Setting[]>([]);

  @ViewChildren('navLink', { read: ElementRef })
  navLinks: QueryList<ElementRef> | null = null;

  private subscription = Subscription.EMPTY;

  constructor(
    public statusService: StatusService,
    public configService: ConfigService,
    private changeDetectorRef: ChangeDetectorRef,
    private scrollDispatcher: ScrollDispatcher,
    private searchService: FuzzySearchService,
  ) { }

  saveSetting(event: SaveSettingEvent) {
    this.onSave.next(event);
  }

  trackCategory(_: number, cat: Category) {
    return cat.name;
  }

  ngOnInit(): void {
    this.subscription = combineLatest([
      this.onSettingsChange,
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

          if (this._highlightKey !== null && !this._scrolledToHighlighted) {
            this._scrolledToHighlighted = true;

            window.requestAnimationFrame(() => {
              this.scrollTo(this._highlightKey || '');
            })
          }
        }
      )
  }

  ngAfterViewInit() {
    this.subscription.add(
      this.scrollDispatcher.scrolled(10)
        .subscribe(() => this.intersectionCallback()),
    )

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
