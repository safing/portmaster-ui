import { NgModule } from "@angular/core";
import { BytesPipe } from "./bytes.pipe";
import { TimeAgoPipe } from "./time-ago.pipe";

@NgModule({
  declarations: [
    TimeAgoPipe,
    BytesPipe,
  ],
  exports: [
    TimeAgoPipe,
    BytesPipe,
  ]
})
export class CommonPipesModule { }
