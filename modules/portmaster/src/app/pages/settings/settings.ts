import { ScrollDispatcher } from '@angular/cdk/overlay';
import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, QueryList, ViewChildren } from '@angular/core';
import { BehaviorSubject, combineLatest, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { ConfigService, ExpertiseLevelNumber, Setting, StatusService, Subsystem } from 'src/app/services';
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
  ) { }

  ngOnInit(): void {
    this.subscription = this.configService.query('')
      .subscribe(settings => this.settings = settings);
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
}
