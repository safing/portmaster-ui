import { DragDropModule } from "@angular/cdk/drag-drop";
import { OverlayModule } from "@angular/cdk/overlay";
import { PortalModule } from "@angular/cdk/portal";
import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ConfirmDailogComponent } from "./confirm.dialog";
import { DialogContainer } from "./dialog.container";

@NgModule({
  imports: [
    CommonModule,
    OverlayModule,
    PortalModule,
    DragDropModule,
    FormsModule,
  ],
  declarations: [
    DialogContainer,
    ConfirmDailogComponent,
  ]
})
export class DialogModule {}
