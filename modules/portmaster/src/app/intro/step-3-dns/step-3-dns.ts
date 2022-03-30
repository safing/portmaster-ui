import { ChangeDetectionStrategy, Component } from "@angular/core";
import { of } from "rxjs";
import { Step } from "src/app/shared/overlay-stepper";

@Component({
  templateUrl: './step-3-dns.html',
  styleUrls: ['../step.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Step3DNSComponent implements Step {
  validChange = of(true)
}
