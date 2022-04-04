import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { SfngSelectModule } from "../select";
import { TipUpModule } from "../tipup";
import { ExpertiseDirective } from "./expertise-directive";
import { ExpertiseComponent } from "./expertise-switch";

@NgModule({
  imports: [
    SfngSelectModule,
    CommonModule,
    TipUpModule,
    FormsModule,
  ],
  declarations: [
    ExpertiseComponent,
    ExpertiseDirective,
  ],
  exports: [
    ExpertiseComponent,
    ExpertiseDirective,
  ]
})
export class ExpertiseModule { }
