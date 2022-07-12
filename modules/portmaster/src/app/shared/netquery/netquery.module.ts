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
import { SfngNetquerySearchbar, SfngNetquerySuggestionDirective } from "./searchbar";
import { SfngPaginationModule } from "../pagination";
import { SfngNetquerySearchOverlay } from "./search-overlay";
import { SfngFocusModule } from "../focus";
import { A11yModule } from "@angular/cdk/a11y";
import { SfngNetqueryScopeLabelComponent } from "./scope-label";
import { SfngNetqueryConnectionDetailsComponent } from "./connection-details";
import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";
import { SfngNetqueryAddToFilterDirective } from "./add-to-filter";
import { SfngAppIconModule } from "../app-icon";
import { TipUpModule } from "../tipup";

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
    SfngPaginationModule,
    SfngFocusModule,
    SfngAppIconModule,
    TipUpModule,
    A11yModule,
    ExpertiseModule,
    OverlayModule,
    CountIndicatorModule,
    FontAwesomeModule,
    CommonPipesModule,
  ],
  exports: [
    SfngNetqueryViewer,
    SfngNetqueryLineChart,
    SfngNetquerySearchOverlay,
    SfngNetqueryScopeLabelComponent,
  ],
  declarations: [
    SfngNetqueryViewer,
    SfngNetqueryConnectionRowComponent,
    SfngNetqueryLineChart,
    SfngNetqueryTagbar,
    SfngNetquerySearchbar,
    SfngNetquerySearchOverlay,
    SfngNetquerySuggestionDirective,
    SfngNetqueryScopeLabelComponent,
    SfngNetqueryConnectionDetailsComponent,
    SfngNetqueryAddToFilterDirective,
    ConnectionLocationPipe,
    IsBlockedConnectionPipe,
    CanUseRulesPipe,
    CanShowConnection,
  ]
})
export class NetqueryModule { }
