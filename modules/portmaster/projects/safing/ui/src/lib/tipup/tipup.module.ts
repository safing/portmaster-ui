import { ModuleWithProviders, NgModule, Type } from "@angular/core";
import { TipUpIconComponent, TipUpTriggerDirective } from './tipup';
import { TipUpComponent } from './tipup-component';
import { TipUpAnchorDirective } from './anchor';
import { MarkdownModule } from "ngx-markdown";
import { CommonModule } from "@angular/common";
import { SfngDialogModule } from "../dialog";
import { ActionRunner, HelpTexts, SFNG_TIP_UP_ACTION_RUNNER, SFNG_TIP_UP_CONTENTS } from "./translations";

@NgModule({
  imports: [
    CommonModule,
    MarkdownModule.forChild(),
    SfngDialogModule,
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
export class SfngTipUpModule {
  static forRoot(text: HelpTexts<any>, runner: Type<ActionRunner<any>>): ModuleWithProviders<SfngTipUpModule> {
    return {
      ngModule: SfngTipUpModule,
      providers: [
        {
          provide: SFNG_TIP_UP_CONTENTS,
          useValue: text,
        },
        {
          provide: SFNG_TIP_UP_ACTION_RUNNER,
          useExisting: runner,
        }
      ]
    }
  }
}
