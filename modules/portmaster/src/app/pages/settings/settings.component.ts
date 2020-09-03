import { Component, OnInit } from '@angular/core';
import { ConfigService } from 'src/app/services/config.service';
import { StatusService } from 'src/app/services/status.service';
import { Subsystem } from 'src/app/services/status.types';
import { Setting } from 'src/app/services/config.types';
import { combineLatest } from 'rxjs/operators';

@Component({
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {
  subsystems: Subsystem[] = [];
  settings: { [key: string]: Setting[] } = {};
  shouldShowSettingsNav = false;

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
              console.log(setting.Key);
              this.settings['other'].push(setting);
            }
          })
        }
      )

  }

}
