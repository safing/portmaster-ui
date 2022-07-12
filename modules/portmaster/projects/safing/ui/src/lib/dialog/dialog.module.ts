import { DragDropModule } from "@angular/cdk/drag-drop";
import { OverlayModule } from "@angular/cdk/overlay";
import { PortalModule } from "@angular/cdk/portal";
import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { SfngConfirmDialogComponent } from "./confirm.dialog";
import { SfngDialogContainer } from "./dialog.container";

@NgModule({
  imports: [
    CommonModule,
    OverlayModule,
    PortalModule,
    DragDropModule,
    FormsModule,
  ],
  declarations: [
    SfngDialogContainer,
    SfngConfirmDialogComponent,
  ]
})
export class SfngDialogModule { }
