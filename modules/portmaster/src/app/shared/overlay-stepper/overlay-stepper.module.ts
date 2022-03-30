import { OverlayModule } from "@angular/cdk/overlay";
import { PortalModule } from "@angular/cdk/portal";
import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { DialogModule } from "../dialog";
import { OverlayStepperContainer } from "./overlay-stepper-container";
import { StepOutletComponent } from "./step-outlet";

@NgModule({
  imports: [
    CommonModule,
    PortalModule,
    OverlayModule,
    DialogModule,
  ],
  declarations: [
    OverlayStepperContainer,
    StepOutletComponent,
  ]
})
export class OverlayStepperModule {}
