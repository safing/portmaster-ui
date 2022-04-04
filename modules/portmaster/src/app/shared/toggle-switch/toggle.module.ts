import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ToggleSwitchComponent } from "./toggle-switch";

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
  ],
  declarations: [
    ToggleSwitchComponent,
  ],
  exports: [
    ToggleSwitchComponent,
  ]
})
export class SfngToggleSwitchModule { }
