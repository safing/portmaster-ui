import { OverlayModule } from "@angular/cdk/overlay";
import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { SfngDropdown } from "./dropdown";

@NgModule({
  imports: [
    CommonModule,
    OverlayModule,
  ],
  declarations: [
    SfngDropdown,
  ],
  exports: [
    SfngDropdown,
  ]
})
export class SfngDropDownModule { }
