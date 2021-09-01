import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-count-indicator',
  templateUrl: './count-indicator.html',
  styleUrls: ['./count-indicator.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CountIndicatorComponent {
  @Input()
  count: number = 0;

  allowedPercentage: number = 0;

  @Input()
  set countAllowed(v: number) {
    var ratio = v / this.count;
    this.allowedPercentage = Math.round(ratio * 100);
  }
}
