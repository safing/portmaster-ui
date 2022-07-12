import { OverlayModule } from "@angular/cdk/overlay";
import { PortalModule } from "@angular/cdk/portal";
import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { SfngDialogModule } from "@safing/ui";
import { OverlayStepperContainer } from "./overlay-stepper-container";
import { StepOutletComponent } from "./step-outlet";

@NgModule({
  imports: [
    CommonModule,
    PortalModule,
    OverlayModule,
    SfngDialogModule,
  ],
  declarations: [
    OverlayStepperContainer,
    StepOutletComponent,
  ]
})
export class OverlayStepperModule { }
