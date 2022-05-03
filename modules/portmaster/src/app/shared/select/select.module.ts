import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { SfngDropDownModule } from "../dropdown/dropdown.module";
import { SfngTooltipModule } from "../tooltip";
import { SfngSelectItemComponent, SfngSelectValueDirective } from "./item";
import { SfngSelectComponent } from "./select";

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SfngDropDownModule,
    SfngTooltipModule,
  ],
  declarations: [
    SfngSelectComponent,
    SfngSelectValueDirective,
    SfngSelectItemComponent,
  ],
  exports: [
    SfngSelectComponent,
    SfngSelectValueDirective,
    SfngSelectItemComponent,
  ]
})
export class SfngSelectModule { }
