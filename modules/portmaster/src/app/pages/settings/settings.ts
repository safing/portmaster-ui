import { ScrollDispatcher } from '@angular/cdk/overlay';
import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, QueryList, ViewChildren } from '@angular/core';
import { BehaviorSubject, combineLatest, Observable, Subscription } from 'rxjs';
import { debounceTime, map } from 'rxjs/operators';
import { ConfigService, ExpertiseLevelNumber, Setting, StatusService, Subsystem, VersionStatus } from 'src/app/services';
import { PortapiService } from 'src/app/services/portapi.service';
import { Record } from 'src/app/services/portapi.types';
import { fadeInAnimation } from 'src/app/shared/animations';
import { SaveSettingEvent } from 'src/app/shared/config/generic-setting/generic-setting';
import { FuzzySearchService } from 'src/app/shared/fuzzySearch';

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
export class SettingsComponent implements OnInit, OnDestroy {
  searchTerm: string = '';

  settings: Setting[] = [];

  versions: VersionStatus | null = null;

  private subscription = Subscription.EMPTY;

  saveSetting(event: SaveSettingEvent) {
    let idx = this.settings.findIndex(setting => setting.Key === event.key);
    if (!idx) {
      return;
    }

    const setting = {
      ...this.settings[idx],
    }

    if (event.isDefault) {
      delete (setting['Value']);
    } else {
      setting.Value = event.value;
    }

    this.configService.save(setting)
      .subscribe({
        next: () => {
          this.settings[idx] = setting;
          //this.settings = [...this.settings];
        },
        error: err => {
          console.error(err);
          // this.settings = [...this.settings];
        }
      })
  }

  constructor(
    public configService: ConfigService,
    public statusService: StatusService,
    private portapi: PortapiService
  ) { }

  ngOnInit(): void {
    this.subscription = this.configService.query('')
      .subscribe(settings => this.settings = settings);

    this.statusService.getVersions()
      .subscribe(version => this.versions = version);
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  injectTrigger(module: string, kind: string): Observable<void> {
    return this.portapi.get<Record>(`control:module/${module}/trigger/${kind}`)
      .pipe(map(() => { }))
  }

  reloadUI(event: Event) {
    this.injectTrigger('ui', 'reload')
      .subscribe(() => {
        window.location.reload();
      })
  }

  clearDNSCache(event: Event) {
    this.injectTrigger('resolver', 'clear name cache').subscribe();
  }

  downloadUpdates(event: Event) {
    event.preventDefault();
    event.stopPropagation();

    this.injectTrigger('updates', 'trigger update').subscribe()
  }

  shutdown(event: Event) {
    this.injectTrigger('core', 'shutdown').subscribe();
  }

  restart(event: Event) {
    event.preventDefault();
    event.stopPropagation();

    this.injectTrigger('core', 'restart').subscribe();
  }

  openDataDir(event: Event) {
    let win = window as any;
    if ('openExternal' in win && !!win.dataDir) {
      win.openExternal(win.fileUrl(win.dataDir));
    }
  }
}
