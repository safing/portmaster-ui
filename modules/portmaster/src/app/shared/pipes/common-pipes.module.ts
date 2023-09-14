import { NgModule } from "@angular/core";
import { BytesPipe } from "./bytes.pipe";
import { TimeAgoPipe } from "./time-ago.pipe";
import { ToAppProfilePipe } from "./to-profile.pipe";

@NgModule({
  declarations: [
    TimeAgoPipe,
    BytesPipe,
    ToAppProfilePipe,
  ],
  exports: [
    TimeAgoPipe,
    BytesPipe,
    ToAppProfilePipe,
  ]
})
export class CommonPipesModule { }
