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
import { NotificationComponent } from './shared/notification/notification.component';
import { SubsystemComponent } from './shared/subsystem/subsystem.component';
import { UnknownTypeComponent } from './shared/config/unknown-type/unknown-type.component';
import { GenericSettingComponent } from './shared/config/generic-setting/generic-setting.component';

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
    UnknownTypeComponent,
    GenericSettingComponent
  ],
  imports: [
    BrowserModule,
    CommonModule,
    FormsModule,
    AppRoutingModule,
    FontAwesomeModule
  ],
  providers: [
  ],
  bootstrap: [AppComponent]
})
export class AppModule {
  constructor(library: FaIconLibrary) {
    library.addIconPacks(fas, far);
  }
}
