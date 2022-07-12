import { ChangeDetectionStrategy, Component } from "@angular/core";
import { of } from "rxjs";
import { Step } from "@safing/ui";

@Component({
  templateUrl: './step-4-tipups.html',
  styleUrls: ['../step.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Step4TipupsComponent implements Step {
  validChange = of(true)
}
