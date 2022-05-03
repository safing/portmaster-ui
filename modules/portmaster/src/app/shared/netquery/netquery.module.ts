import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { SfngAccordionModule } from "../accordion";
import { CanShowConnection, CanUseRulesPipe, ConnectionLocationPipe, IsBlockedConnectionPipe } from "./pipes";
import { CountIndicatorModule } from "../count-indicator";
import { CountryFlagModule } from "../country-flag";
import { SfngDropDownModule } from "../dropdown/dropdown.module";
import { SfngSelectModule } from "../select";
import { SfngTooltipModule } from "../tooltip";
import { NetqueryConnectionRowComponent } from "./connection-row";
import { NetqueryViewer } from "./netquery.component";
import { CommonPipesModule } from "../pipes";
import { SfngMenuModule } from "../menu";
import { NetqueryLineChart } from "./line-chart/line-chart";
import { ExpertiseModule } from "../expertise/expertise.module";

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    CountryFlagModule,
    SfngDropDownModule,
    SfngSelectModule,
    SfngTooltipModule,
    SfngAccordionModule,
    SfngMenuModule,
    ExpertiseModule,
    CountIndicatorModule,
    CommonPipesModule,
  ],
  exports: [
    NetqueryViewer,
    NetqueryLineChart
  ],
  declarations: [
    NetqueryViewer,
    NetqueryConnectionRowComponent,
    ConnectionLocationPipe,
    IsBlockedConnectionPipe,
    CanUseRulesPipe,
    CanShowConnection,
    NetqueryLineChart
  ]
})
export class NetqueryModule { }
