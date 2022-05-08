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
import { SfngNetqueryConnectionRowComponent } from "./connection-row";
import { SfngNetqueryViewer } from "./netquery.component";
import { CommonPipesModule } from "../pipes";
import { SfngMenuModule } from "../menu";
import { SfngNetqueryLineChart } from "./line-chart/line-chart";
import { ExpertiseModule } from "../expertise/expertise.module";
import { SfngNetqueryTagbar } from "./tag-bar";
import { OverlayModule } from "@angular/cdk/overlay";
import { SfngNetquerySearchbar } from "./searchbar";

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
    OverlayModule,
    CountIndicatorModule,
    CommonPipesModule,
  ],
  exports: [
    SfngNetqueryViewer,
    SfngNetqueryLineChart
  ],
  declarations: [
    SfngNetqueryViewer,
    SfngNetqueryConnectionRowComponent,
    SfngNetqueryLineChart,
    SfngNetqueryTagbar,
    SfngNetquerySearchbar,
    ConnectionLocationPipe,
    IsBlockedConnectionPipe,
    CanUseRulesPipe,
    CanShowConnection,
  ]
})
export class NetqueryModule { }
