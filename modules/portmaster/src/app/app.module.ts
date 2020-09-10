import { DragDropModule } from '@angular/cdk/drag-drop';
import { OverlayModule } from '@angular/cdk/overlay';
import { PortalModule } from '@angular/cdk/portal';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { FaIconLibrary, FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { far } from '@fortawesome/free-regular-svg-icons';
import { fas } from '@fortawesome/free-solid-svg-icons';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { AccordionGroupComponent } from './debug/accordion-group/accordion-group.component';
import { AccordionComponent } from './debug/accordion/accordion.component';
import { DebugComponent } from './debug/debug.component';
import { NotificationFactoryComponent } from './debug/notification-factory/notification-factory.component';
import { PortapiInspectorComponent } from './debug/portapi-inspector/portapi-inspector.component';
import { NavigationComponent } from './layout/navigation/navigation.component';
import { SideDashComponent } from './layout/side-dash/side-dash.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { SettingsComponent } from './pages/settings/settings.component';
import { BasicSettingComponent } from './shared/config/basic-setting/basic-setting.component';
import { GenericSettingComponent } from './shared/config/generic-setting/generic-setting.component';
import { SecuritySettingComponent } from './shared/config/security-setting/security-setting.component';
import { DropDownItemComponent, DropDownValueDirective } from './shared/dropdown/dropdown-item.component';
import { DropdownComponent } from './shared/dropdown/dropdown.component';
import { ExpertiseComponent } from './shared/expertise/expertise.component';
import { ExpertiseDirective } from './shared/expertise/expertise.directive';
import { NotificationComponent } from './shared/notification/notification.component';
import { SubsystemComponent } from './shared/subsystem/subsystem.component';
import { WidgetSettingsOutletComponent } from './pages/widget-settings-outlet/settings-outlet.component';
import { WIDGET_DEFINTIONS } from './widgets/widget.types';
import { StatusWidgetComponent } from './widgets/status-widget/status-widget.component';
import { StatusWidgetFactoryComponent } from './widgets/status-widget-factory/status-widget-factory.component';
import { ToggleSwitchComponent } from './shared/toggle-switch/toggle-switch.component';
import { FilterListComponent } from './shared/config/filter-list/filter-list';
import { FilterListItemComponent } from './shared/config/filter-list/list-item';

@NgModule({
  declarations: [
    AppComponent,
    NotificationComponent,
    DebugComponent,
    AccordionComponent,
    AccordionGroupComponent,
    NotificationFactoryComponent,
    PortapiInspectorComponent,
    SubsystemComponent,
    BasicSettingComponent,
    GenericSettingComponent,
    SecuritySettingComponent,
    SettingsComponent,
    DashboardComponent,
    SideDashComponent,
    NavigationComponent,
    ExpertiseComponent,
    ExpertiseDirective,
    DropdownComponent,
    DropDownItemComponent,
    DropDownValueDirective,
    WidgetSettingsOutletComponent,
    StatusWidgetComponent,
    StatusWidgetFactoryComponent,
    ToggleSwitchComponent,
    FilterListComponent,
    FilterListItemComponent
  ],
  imports: [
    BrowserModule,
    CommonModule,
    FormsModule,
    AppRoutingModule,
    FontAwesomeModule,
    OverlayModule,
    PortalModule,
    DragDropModule,
  ],
  providers: [
    {
      provide: WIDGET_DEFINTIONS,
      useValue: {
        type: 'status-widget',
        name: 'Demo Widget',
        settingsComponent: StatusWidgetFactoryComponent,
        widgetComponent: StatusWidgetComponent,
      },
      multi: true,
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule {
  constructor(library: FaIconLibrary) {
    library.addIconPacks(fas, far);
  }
}
