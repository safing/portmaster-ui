import { NgModule } from "@angular/core";
import { TimeAgoPipe } from "./time-ago.pipe";

@NgModule({
  declarations: [
    TimeAgoPipe,
  ],
  exports: [
    TimeAgoPipe,
  ]
})
export class CommonPipesModule { }
