import { NgModule } from '@angular/core';
import { SettingsOutletComponent } from './settings-outlet/settings-outlet.component';
import { StatusWidgetComponent } from './status-widget/status-widget.component';
import { WIDGET_DEFINTIONS } from './widget.types';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PortalModule } from '@angular/cdk/portal';
import { StatusWidgetFactoryComponent } from './status-widget-factory/status-widget-factory.component';

@NgModule({
  imports: [
    BrowserModule,
    CommonModule,
    FormsModule,
    PortalModule,
  ],
  exports: [SettingsOutletComponent],
  declarations: [SettingsOutletComponent, StatusWidgetComponent, StatusWidgetFactoryComponent],
  providers: [
    {
      provide: WIDGET_DEFINTIONS,
      useValue: {
        type: 'status-widget',
        name: 'Status Widget',
        settingsComponent: StatusWidgetFactoryComponent,
        widgetComponent: StatusWidgetComponent,
      },
      multi: true,
    }
  ]
})
export class WidgetModule { }
