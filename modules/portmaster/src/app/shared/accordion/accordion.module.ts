import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { AccordionComponent, AccordionGroupComponent } from ".";

@NgModule({
  imports: [
    CommonModule,
  ],
  declarations: [
    AccordionGroupComponent,
    AccordionComponent,
  ],
  exports: [
    AccordionGroupComponent,
    AccordionComponent,
  ]
})
export class AccordionModule { }
