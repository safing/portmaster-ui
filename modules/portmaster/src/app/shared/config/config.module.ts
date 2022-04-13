import { DragDropModule } from "@angular/cdk/drag-drop";
import { CommonModule } from "@angular/common";
import { compileComponentFromMetadata } from "@angular/compiler";
import { NgModule } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { RouterModule } from "@angular/router";
import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";
import { MarkdownModule } from "ngx-markdown";
import { ExpertiseModule } from "../expertise/expertise.module";
import { SfngFocusModule } from "../focus";
import { SfngMenuModule } from "../menu";
import { SfngMultiSwitchModule } from "../multi-switch";
import { SfngSelectModule } from "../select";
import { TipUpModule } from "../tipup";
import { SfngToggleSwitchModule } from "../toggle-switch";
import { SfngTooltipModule } from "../tooltip";
import { BasicSettingComponent } from "./basic-setting/basic-setting";
import { ConfigSettingsViewComponent } from "./config-settings";
import { FilterListComponent } from "./filter-lists";
import { GenericSettingComponent } from "./generic-setting";
import { OrderedListComponent, OrderedListItemComponent } from "./ordererd-list";
import { RuleListItemComponent } from "./rule-list/list-item";
import { RuleListComponent } from "./rule-list/rule-list";
import { SafePipe } from "./save.pipe";
import { SecuritySettingComponent } from "./security-setting/security-setting";

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    DragDropModule,
    SfngTooltipModule,
    SfngSelectModule,
    SfngMultiSwitchModule,
    SfngFocusModule,
    SfngMenuModule,
    TipUpModule,
    FontAwesomeModule,
    MarkdownModule,
    RouterModule,
    ExpertiseModule,
    SfngToggleSwitchModule,
  ],
  declarations: [
    BasicSettingComponent,
    FilterListComponent,
    OrderedListComponent,
    OrderedListItemComponent,
    RuleListComponent,
    RuleListItemComponent,
    SecuritySettingComponent,
    ConfigSettingsViewComponent,
    GenericSettingComponent,
    SafePipe,
  ],
  exports: [
    BasicSettingComponent,
    FilterListComponent,
    OrderedListComponent,
    OrderedListItemComponent,
    RuleListComponent,
    RuleListItemComponent,
    SecuritySettingComponent,
    ConfigSettingsViewComponent,
    GenericSettingComponent,
    SafePipe,
  ]
})
export class ConfigModule { }
