import { Component, OnInit, Input, HostBinding } from '@angular/core';
import { Subsystem, getFailureStatusString } from '../../services';

@Component({
  selector: 'app-subsystem',
  templateUrl: './subsystem.html',
  styleUrls: ['./subsystem.scss']
})
export class SubsystemComponent implements OnInit {

  @Input()
  subsystem: Subsystem | null = null;

  @HostBinding('class')
  get subsystemStatus(): string {
    if (!this.subsystem) {
      return '';
    }

    // if at least one of the subsystem's modules is disabled
    // the whole subsystem is disabled:
    if (this.subsystem.Modules.some(mod => !mod.Enabled)) {
      return `subsys-disabled`;
    }

    const failureStatus = getFailureStatusString(this.subsystem.FailureStatus);
    return `subsys-${failureStatus}`;
  }

  constructor() { }

  ngOnInit(): void {
  }

}
