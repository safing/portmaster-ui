import { ChangeDetectionStrategy, Component } from "@angular/core";
import { of } from "rxjs";
import { Step } from "src/app/shared/overlay-stepper";

@Component({
  templateUrl: './step-2-trackers.html',
  styleUrls: ['../step.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Step2TrackersComponent implements Step {
  validChange = of(true)
}
