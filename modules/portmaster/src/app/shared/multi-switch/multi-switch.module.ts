import { DragDropModule } from "@angular/cdk/drag-drop";
import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { TipUpModule } from "../tipup";
import { SfngTooltipModule } from "../tooltip";
import { MultiSwitchComponent } from "./multi-switch";
import { SwitchItemComponent } from "./switch-item";

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    SfngTooltipModule,
    TipUpModule,
    DragDropModule,
  ],
  declarations: [
    MultiSwitchComponent,
    SwitchItemComponent,
  ],
  exports: [
    MultiSwitchComponent,
    SwitchItemComponent,
  ],
})
export class SfngMultiSwitchModule { }
