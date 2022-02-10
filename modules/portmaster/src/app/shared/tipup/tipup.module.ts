import { NgModule } from "@angular/core";
import { TipUpIconComponent, TipUpTriggerDirective } from './tipup';
import { TipUpComponent } from './tipup-component';
import { TipUpAnchorDirective } from './anchor';
import { MarkdownModule } from "ngx-markdown";
import { CommonModule } from "@angular/common";

@NgModule({
  imports: [
    CommonModule,
    MarkdownModule.forChild(),
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
