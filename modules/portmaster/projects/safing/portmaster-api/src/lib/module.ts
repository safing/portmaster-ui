import { ModuleWithProviders, NgModule } from "@angular/core";
import { MetaAPI } from "./meta-api.service";
import { PortapiService } from "./portapi.service";
import { WebsocketService } from "./websocket.service";

@NgModule({})
export class PortmasterAPIModule {
  static forRoot(): ModuleWithProviders<PortmasterAPIModule> {
    return {
      ngModule: PortmasterAPIModule,
      providers: [
        PortapiService,
        WebsocketService,
        MetaAPI,
      ]
    }
  }
}
