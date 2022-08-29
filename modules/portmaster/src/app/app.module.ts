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
import { PortmasterAPIModule } from '@safing/portmaster-api';
import { OverlayStepperModule, SfngAccordionModule, SfngDialogModule, SfngDropDownModule, SfngPaginationModule, SfngSelectModule, SfngTipUpModule, SfngToggleSwitchModule, SfngTooltipModule, TabModule, UiModule } from '@safing/ui';
import MyYamlFile from 'js-yaml-loader!../i18n/helptexts.yaml';
import { MarkdownModule } from 'ngx-markdown';
import { environment } from 'src/environments/environment';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { IntroModule } from './intro';
import { NavigationComponent } from './layout/navigation/navigation';
import { SideDashComponent } from './layout/side-dash/side-dash';
import { AppOverviewComponent, AppViewComponent, QuickSettingInternetButtonComponent } from './pages/app-view';
import { QuickSettingUseSPNButtonComponent } from './pages/app-view/qs-use-spn/qs-use-spn';
import { MonitorPageComponent } from './pages/monitor';
import { SettingsComponent } from './pages/settings/settings';
import { SpnPageComponent } from './pages/spn';
import { SupportPageComponent } from './pages/support';
import { SupportFormComponent } from './pages/support/form';
import { WidgetSettingsOutletComponent } from './pages/widget-settings-outlet/widget-settings-outlet';
import { NotificationsService } from './services';
import { ActionIndicatorModule } from './shared/action-indicator';
import { SfngAppIconModule } from './shared/app-icon';
import { ConfigModule } from './shared/config';
import { CountIndicatorModule } from './shared/count-indicator';
import { CountryFlagModule } from './shared/country-flag';
import { ExitScreenComponent } from './shared/exit-screen/exit-screen';
import { ExpertiseModule } from './shared/expertise/expertise.module';
import { ExternalLinkDirective } from './shared/external-link.directive';
import { SfngFocusModule } from './shared/focus';
import { FuzzySearchPipe } from './shared/fuzzySearch';
import { LoadingComponent } from './shared/loading';
import { SfngMenuModule } from './shared/menu';
import { SfngMultiSwitchModule } from './shared/multi-switch';
import { NetqueryModule } from './shared/netquery';
import { NotificationListComponent } from './shared/notification-list/notification-list.component';
import { NotificationComponent } from './shared/notification/notification';
import { CommonPipesModule } from './shared/pipes';
import { PromptListComponent } from './shared/prompt-list/prompt-list.component';
import { PlaceholderComponent } from './shared/text-placeholder';
import { MarkdownWidgetComponent, MarkdownWidgetSettingsComponent } from './widgets/markdown-widget';
import { NetworkActivityWidget } from './widgets/network-activity-widget';
import { PilotWidgetComponent } from './widgets/pilot-widget';
import { StatusWidgetComponent, StatusWidgetSettingsComponent } from './widgets/status-widget';
import { WIDGET_DEFINTIONS } from './widgets/widget.types';

@NgModule({
  declarations: [
    AppComponent,
    NotificationComponent,
    SettingsComponent,
    MonitorPageComponent,
    SideDashComponent,
    NavigationComponent,
    WidgetSettingsOutletComponent,
    StatusWidgetComponent,
    StatusWidgetSettingsComponent,
    PilotWidgetComponent,
    StatusWidgetComponent,
    StatusWidgetSettingsComponent,
    MarkdownWidgetSettingsComponent,
    MarkdownWidgetComponent,
    NotificationListComponent,
    PromptListComponent,
    FuzzySearchPipe,
    AppViewComponent,
    QuickSettingInternetButtonComponent,
    QuickSettingUseSPNButtonComponent,
    AppOverviewComponent,
    PlaceholderComponent,
    LoadingComponent,
    ExternalLinkDirective,
    ExitScreenComponent,
    SupportPageComponent,
    SupportFormComponent,
    SpnPageComponent,
    NetworkActivityWidget,
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
    SfngAccordionModule,
    TabModule,
    SfngTipUpModule.forRoot(MyYamlFile, NotificationsService),
    SfngTooltipModule,
    ActionIndicatorModule,
    SfngDialogModule,
    OverlayStepperModule,
    IntroModule,
    SfngDropDownModule,
    SfngSelectModule,
    SfngMultiSwitchModule,
    SfngMenuModule,
    SfngFocusModule,
    SfngToggleSwitchModule,
    SfngPaginationModule,
    SfngAppIconModule,
    ExpertiseModule,
    ConfigModule,
    CountryFlagModule,
    CountIndicatorModule,
    NetqueryModule,
    CommonPipesModule,
    UiModule,
    PortmasterAPIModule.forRoot({
      httpAPI: environment.httpAPI,
      websocketAPI: environment.portAPI,
    }),
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
        type: 'network-scout',
        name: 'Network Scout',
        widgetComponent: NetworkActivityWidget
      },
      multi: true
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
