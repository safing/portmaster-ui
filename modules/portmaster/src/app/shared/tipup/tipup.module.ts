import { NgModule } from "@angular/core";
import { TipUpIconComponent, TipUpTriggerDirective } from './tipup';
import { TipUpComponent } from './tipup-component';
import { TipUpAnchorDirective } from './anchor';
import { MarkdownModule } from "ngx-markdown";
import { CommonModule } from "@angular/common";
import { DialogModule } from "../dialog";

@NgModule({
  imports: [
    CommonModule,
    MarkdownModule.forChild(),
    DialogModule,
  ],
  declarations: [
    TipUpIconComponent,
    TipUpTriggerDirective,
    TipUpComponent,
    TipUpAnchorDirective
  ],
  exports: [
    TipUpIconComponent,
    TipUpTriggerDirective,
    TipUpComponent,
    TipUpAnchorDirective
  ],
})
export class TipUpModule { }
