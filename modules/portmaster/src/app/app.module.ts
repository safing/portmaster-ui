import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { AccordionGroupComponent } from './debug/accordion-group/accordion-group.component';
import { AccordionComponent } from './debug/accordion/accordion.component';
import { DebugComponent } from './debug/debug.component';
import { NotificationFactoryComponent } from './debug/notification-factory/notification-factory.component';
import { PortapiInspectorComponent } from './debug/portapi-inspector/portapi-inspector.component';
import { NotificationComponent } from './shared/notification/notification.component';

@NgModule({
  declarations: [
    AppComponent,
    NotificationComponent,
    DebugComponent,
    AccordionComponent,
    AccordionGroupComponent,
    NotificationFactoryComponent,
    PortapiInspectorComponent
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
export class AppModule { }
