import { DragDropModule } from '@angular/cdk/drag-drop';
import { OverlayModule } from '@angular/cdk/overlay';
import { PortalModule } from '@angular/cdk/portal';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { CdkTableModule } from '@angular/cdk/table';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FaIconLibrary, FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faGithub } from '@fortawesome/free-brands-svg-icons';
import { far } from '@fortawesome/free-regular-svg-icons';
import { fas } from '@fortawesome/free-solid-svg-icons';
import { MarkdownModule } from 'ngx-markdown';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { DebugComponent } from './debug/debug-panel';
import { NotificationFactoryComponent } from './debug/notification-factory/notification-factory';
import { PortapiInspectorComponent } from './debug/portapi-inspector/portapi-inspector';
import { NavigationComponent } from './layout/navigation/navigation';
import { SideDashComponent } from './layout/side-dash/side-dash';
import { AppOverviewComponent, AppViewComponent } from './pages/app-view';
import { MonitorApplicationViewComponent, MonitorPageComponent, NetworkOverviewComponent } from './pages/monitor';
import { SettingsComponent } from './pages/settings/settings';
import { SpnPageComponent } from './pages/spn';
import { SupportPageComponent } from './pages/support';
import { SupportFormComponent } from './pages/support/form';
import { WidgetSettingsOutletComponent } from './pages/widget-settings-outlet/widget-settings-outlet';
import { AccordionModule } from './shared/accordion';
import { ActionIndicatorModule } from './shared/action-indicator';
import { AppIconComponent } from './shared/app-icon';
import { BasicSettingComponent } from './shared/config/basic-setting/basic-setting';
import { ConfigSettingsViewComponent } from './shared/config/config-settings';
import { FilterListComponent } from './shared/config/filter-lists';
import { GenericSettingComponent } from './shared/config/generic-setting/generic-setting';
import { OrderedListComponent, OrderedListItemComponent } from './shared/config/ordererd-list';
import { RuleListItemComponent } from './shared/config/rule-list/list-item';
import { RuleListComponent } from './shared/config/rule-list/rule-list';
import { SecuritySettingComponent } from './shared/config/security-setting/security-setting';
import { CanShowConnection as CanShowConnectionPipe, CanUseRulesPipe, ConnectionExpertisePipe, ConnectionLocationPipe, ConnectionsViewComponent, IsBlockedConnectionPipe, ScopeGroupContentComponent, UngroupedConnectionContentComponent, UngroupedConnectionRowComponent } from './shared/connections-view';
import { CountIndicatorComponent } from './shared/count-indicator/count-indicator';
import { PrettyCountPipe } from './shared/count.pipe';
import { CountryFlagDirective } from './shared/country-flag/country-flag';
import { ConfirmDailogComponent, DialogComponent } from './shared/dialog';
import { DropdownComponent } from './shared/dropdown/dropdown';
import { DropDownItemComponent, DropDownValueDirective } from './shared/dropdown/item';
import { ExitScreenComponent } from './shared/exit-screen/exit-screen';
import { ExpertiseDirective } from './shared/expertise/expertise-directive';
import { ExpertiseComponent } from './shared/expertise/expertise-switch';
import { ExternalLinkDirective } from './shared/external-link.directive';
import { AutoFocusDirective } from './shared/focus';
import { FuzzySearchPipe } from './shared/fuzzySearch';
import { LoadingComponent } from './shared/loading';
import { MenuComponent, MenuGroupComponent, MenuItemComponent, MenuTriggerComponent } from './shared/menu';
import { MultiSwitchComponent, SwitchItemComponent } from './shared/multi-switch';
import { NotificationComponent } from './shared/notification/notification';
import { PaginationContentDirective, PaginationWrapperComponent } from './shared/pagination';
import { ProfileStatisticsComponent } from './shared/profile-stats';
import { SafePipe } from './shared/save.pipe';
import { ScopeLabelComponent } from './shared/scope-label';
import { TabModule } from './shared/tabs/tabs.module';
import { PlaceholderComponent } from './shared/text-placeholder';
import { TimeAgoPipe } from './shared/time-ago.pipe';
import { TipUpModule } from './shared/tipup';
import { ToggleSwitchComponent } from './shared/toggle-switch/toggle-switch';
import { SfngTooltipModule } from './shared/tooltip';
import { MarkdownWidgetComponent, MarkdownWidgetSettingsComponent } from './widgets/markdown-widget';
import { NotificationWidgetComponent, NotificationWidgetSettingsComponent } from './widgets/notification-widget';
import { PilotWidgetComponent } from './widgets/pilot-widget';
import { PromptWidgetComponent } from './widgets/prompt-widget';
import { StatusWidgetComponent, StatusWidgetSettingsComponent } from './widgets/status-widget';
import { WIDGET_DEFINTIONS } from './widgets/widget.types';

@NgModule({
  declarations: [
    AppComponent,
    NotificationComponent,
    DebugComponent,
    NotificationFactoryComponent,
    PortapiInspectorComponent,
    BasicSettingComponent,
    GenericSettingComponent,
    SecuritySettingComponent,
    SettingsComponent,
    MonitorPageComponent,
    SideDashComponent,
    NavigationComponent,
    ExpertiseComponent,
    ExpertiseDirective,
    DropdownComponent,
    ConnectionsViewComponent,
    DropDownItemComponent,
    DropDownValueDirective,
    WidgetSettingsOutletComponent,
    StatusWidgetComponent,
    StatusWidgetSettingsComponent,
    ToggleSwitchComponent,
    RuleListComponent,
    RuleListItemComponent,
    PilotWidgetComponent,
    StatusWidgetComponent,
    StatusWidgetSettingsComponent,
    MarkdownWidgetSettingsComponent,
    ProfileStatisticsComponent,
    MarkdownWidgetComponent,
    NotificationWidgetSettingsComponent,
    NotificationWidgetComponent,
    FuzzySearchPipe,
    SafePipe,
    TimeAgoPipe,
    MonitorApplicationViewComponent,
    CountIndicatorComponent,
    AppViewComponent,
    CountryFlagDirective,
    AppOverviewComponent,
    PlaceholderComponent,
    ConfigSettingsViewComponent,
    FilterListComponent,
    AppIconComponent,
    NetworkOverviewComponent,
    MenuComponent,
    MenuTriggerComponent,
    MenuItemComponent,
    MenuGroupComponent,
    OrderedListComponent,
    OrderedListItemComponent,
    MultiSwitchComponent,
    SwitchItemComponent,
    AutoFocusDirective,
    PromptWidgetComponent,
    LoadingComponent,
    ExternalLinkDirective,
    ScopeLabelComponent,
    ScopeGroupContentComponent,
    UngroupedConnectionContentComponent,
    UngroupedConnectionRowComponent,
    ConnectionExpertisePipe,
    ConnectionLocationPipe,
    PrettyCountPipe,
    CanUseRulesPipe,
    CanShowConnectionPipe,
    IsBlockedConnectionPipe,
    ExitScreenComponent,
    DialogComponent,
    ConfirmDailogComponent,
    SupportPageComponent,
    SupportFormComponent,
    PaginationWrapperComponent,
    PaginationContentDirective,
    SpnPageComponent,
  ],
  imports: [
    BrowserModule,
    CommonModule,
    BrowserAnimationsModule,
    FormsModule,
    AppRoutingModule,
    FontAwesomeModule,
    OverlayModule,
    PortalModule,
    CdkTableModule,
    DragDropModule,
    HttpClientModule,
    MarkdownModule.forRoot(),
    ScrollingModule,
    AccordionModule,
    TabModule,
    TipUpModule,
    SfngTooltipModule,
    ActionIndicatorModule
  ],
  providers: [
    {
      provide: WIDGET_DEFINTIONS,
      useValue: {
        type: 'status-widget',
        name: 'Demo',
        settingsComponent: StatusWidgetSettingsComponent,
        widgetComponent: StatusWidgetComponent,
      },
      multi: true,
    },
    {
      provide: WIDGET_DEFINTIONS,
      useValue: {
        type: 'markdown-widget',
        name: 'Markdown',
        settingsComponent: MarkdownWidgetSettingsComponent,
        widgetComponent: MarkdownWidgetComponent,
      },
      multi: true,
    },
    {
      provide: WIDGET_DEFINTIONS,
      useValue: {
        type: 'pilot-widget',
        name: 'Pilot',
        widgetComponent: PilotWidgetComponent,
        disableCustom: true,
        tipUpKey: "pilot-widget"
      },
      multi: true,
    },
    {
      provide: WIDGET_DEFINTIONS,
      useValue: {
        type: 'notification-widget',
        name: 'Notifications',
        widgetComponent: NotificationWidgetComponent,
        //settingsComponent: NotificationWidgetSettingsComponent,
      },
      multi: true,
    },
    {
      provide: WIDGET_DEFINTIONS,
      useValue: {
        type: 'prompt-widget',
        name: 'Prompts',
        widgetComponent: PromptWidgetComponent,
      },
      multi: true,
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule {
  constructor(library: FaIconLibrary) {
    library.addIconPacks(fas, far);
    library.addIcons(faGithub)
  }
}
