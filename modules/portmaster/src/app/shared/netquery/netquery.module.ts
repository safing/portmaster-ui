import { A11yModule } from "@angular/cdk/a11y";
import { OverlayModule } from "@angular/cdk/overlay";
import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";
import { SfngAccordionModule, SfngDropDownModule, SfngPaginationModule, SfngSelectModule, SfngTipUpModule, SfngTooltipModule } from "@safing/ui";
import { SfngAppIconModule } from "../app-icon";
import { CountIndicatorModule } from "../count-indicator";
import { CountryFlagModule } from "../country-flag";
import { ExpertiseModule } from "../expertise/expertise.module";
import { SfngFocusModule } from "../focus";
import { SfngMenuModule } from "../menu";
import { CommonPipesModule } from "../pipes";
import { SfngNetqueryAddToFilterDirective } from "./add-to-filter";
import { CombinedMenuPipe } from "./combined-menu.pipe";
import { SfngNetqueryConnectionDetailsComponent } from "./connection-details";
import { SfngNetqueryConnectionRowComponent } from "./connection-row";
import { SfngNetqueryLineChart } from "./line-chart/line-chart";
import { SfngNetqueryViewer } from "./netquery.component";
import { CanShowConnection, CanUseRulesPipe, ConnectionLocationPipe, IsBlockedConnectionPipe } from "./pipes";
import { SfngNetqueryScopeLabelComponent } from "./scope-label";
import { SfngNetquerySearchOverlay } from "./search-overlay";
import { SfngNetquerySearchbar, SfngNetquerySuggestionDirective } from "./searchbar";
import { SfngNetqueryTagbar } from "./tag-bar";

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
    SfngTipUpModule,
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
    CombinedMenuPipe,
  ]
})
export class NetqueryModule { }
