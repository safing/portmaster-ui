import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, OnInit } from '@angular/core';
import { ConfigService, SecurityLevel, SPNService } from '@safing/portmaster-api';
import { combineLatest } from 'rxjs';
import { FailureStatus, StatusService, Subsystem } from 'src/app/services';
import { WidgetConfig, WIDGET_CONFIG } from '../widget.types';

interface SecurityOption {
  level: SecurityLevel;
  displayText: string;
  class: string;
  subText?: string;
}

@Component({
  templateUrl: './pilot-widget.html',
  styleUrls: [
    '../widget.scss',
    './pilot-widget.scss'
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PilotWidgetComponent implements OnInit {
  activeLevel: SecurityLevel = SecurityLevel.Off;
  selectedLevel: SecurityLevel = SecurityLevel.Off;
  suggestedLevel: SecurityLevel = SecurityLevel.Off;
  activeOption: SecurityOption | null = null;
  selectedOption: SecurityOption | null = null;

  lockLevel: SecurityOption | null = null;
  mode: 'auto' | 'manual' = 'auto';

  readonly options: SecurityOption[] = [
    {
      level: SecurityLevel.Normal,
      displayText: 'Trusted',
      class: 'low',
      subText: 'Home Network'
    },
    {
      level: SecurityLevel.High,
      displayText: 'Untrusted',
      class: 'medium',
      subText: 'Public Network'
    },
    {
      level: SecurityLevel.Extreme,
      displayText: 'Danger',
      class: 'high',
      subText: 'Hacked Network'
    },
  ];

  get spnStatus$() { return this.spnService.status$ }

  get networkRatingEnabled$() { return this.configService.networkRatingEnabled$ }

  constructor(
    @Inject(WIDGET_CONFIG) public config: WidgetConfig<any>,
    private statusService: StatusService,
    private spnService: SPNService,
    private changeDetectorRef: ChangeDetectorRef,
    private configService: ConfigService,
  ) { }

  ngOnInit() {

    combineLatest([
      this.statusService.status$,
      this.statusService.watchSubsystems()
    ])
      .subscribe(([status, subsystems]) => {
        this.activeLevel = status.ActiveSecurityLevel;
        this.selectedLevel = status.SelectedSecurityLevel;
        this.suggestedLevel = status.ThreatMitigationLevel;

        if (this.selectedLevel === SecurityLevel.Off) {
          this.mode = 'auto';
        } else {
          this.mode = 'manual';
        }

        this.selectedOption = this.options.find(opt => opt.level === this.selectedLevel) || null;
        this.activeOption = this.options.find(opt => opt.level === this.activeLevel) || null;

        // By default the lock is green and we are "Secure"
        this.lockLevel = {
          level: SecurityLevel.Normal,
          class: 'low',
          displayText: 'Secure',
        }

        // Find the highest failure-status reported by any module
        // of any subsystem.
        const failureStatus = subsystems.reduce((value: FailureStatus, system: Subsystem) => {
          if (system.FailureStatus != 0) {
            console.log(system);
          }
          return system.FailureStatus > value
            ? system.FailureStatus
            : value;
        }, FailureStatus.Operational)

        // update the failure level depending on the  highest
        // failure status.
        switch (failureStatus) {
          case FailureStatus.Warning:
            this.lockLevel = {
              level: SecurityLevel.High,
              class: 'medium',
              displayText: 'Warning'
            }
            break;
          case FailureStatus.Error:
            this.lockLevel = {
              level: SecurityLevel.Extreme,
              class: 'high',
              displayText: 'Insecure'
            }
            break;
        }

        // if the auto-pilot would suggest a higher (mitigation) level
        // we are always Insecure
        if (this.activeLevel < this.suggestedLevel) {
          this.lockLevel = {
            level: SecurityLevel.High,
            class: 'high',
            displayText: 'Insecure'
          }
        }

        this.changeDetectorRef.markForCheck();
      });
  }

  updateMode(mode: 'auto' | 'manual') {
    this.mode = mode;

    if (mode === 'auto') {
      this.selectLevel(SecurityLevel.Off);
    } else {
      this.selectLevel(this.activeLevel);
    }
  }

  selectLevel(level: SecurityLevel) {
    if (this.mode === 'auto' && level !== SecurityLevel.Off) {
      this.mode = 'manual';
    }

    this.statusService.selectLevel(level).subscribe();
  }
}
