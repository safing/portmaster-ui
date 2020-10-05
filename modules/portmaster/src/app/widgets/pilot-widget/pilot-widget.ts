import { Component, OnInit, Inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { combineLatest } from 'rxjs';
import { FailureStatus, SecurityLevel, StatusService, Subsystem } from 'src/app/services';
import { WIDGET_CONFIG, WidgetConfig } from '../widget.types';

interface SecurityOption {
  level: SecurityLevel;
  displayText: string;
  class: string;
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

  readonly options: SecurityOption[] = [
    {
      level: SecurityLevel.Off,
      displayText: 'Auto Pilot',
      class: 'auto',
    },
    {
      level: SecurityLevel.Normal,
      displayText: 'Trusted',
      class: 'low',
    },
    {
      level: SecurityLevel.High,
      displayText: 'Untrusted',
      class: 'medium',
    },
    {
      level: SecurityLevel.Extreme,
      displayText: 'Panic',
      class: 'high',
    },
  ];

  constructor(
    @Inject(WIDGET_CONFIG) public config: WidgetConfig<any>,
    private statusService: StatusService,
    private changeDetectorRef: ChangeDetectorRef,
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

        this.selectedOption = this.options.find(opt => opt.level === this.selectedLevel) || null;
        this.activeOption = this.options.find(opt => opt.level === this.activeLevel) || null;

        this.lockLevel = {
          level: SecurityLevel.Normal,
          class: 'low',
          displayText: 'Secure',
        }

        if (this.activeLevel < this.suggestedLevel) {
          this.lockLevel = {
            level: SecurityLevel.High,
            class: 'medium',
            displayText: 'Insecure'
          }
        }

        const failureStatus = subsystems.reduce((value: FailureStatus, system: Subsystem) => {
          if (system.FailureStatus != 0) {
            console.log(system);
          }
          return system.FailureStatus > value
            ? system.FailureStatus
            : value;
        }, FailureStatus.Operational)

        let failureLevel: SecurityOption | null = null;

        switch (failureStatus) {
          case FailureStatus.Warning:
            failureLevel = {
              level: SecurityLevel.High,
              class: 'medium',
              displayText: 'Warning'
            }
            break;
          case FailureStatus.Error:
            failureLevel = {
              level: SecurityLevel.Extreme,
              class: 'high',
              displayText: 'Failure'
            }
            break;
        }

        if (!!failureLevel && failureLevel.level > this.lockLevel.level) {
          this.lockLevel = failureLevel;
        }

        this.changeDetectorRef.markForCheck();
      });
  }

  selectLevel(level: SecurityLevel) {
    this.statusService.selectLevel(level).subscribe();
  }
}
