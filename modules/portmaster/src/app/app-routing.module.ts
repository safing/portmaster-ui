import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { SettingsComponent } from './pages/settings/settings';
import { WidgetSettingsOutletComponent } from './pages/widget-settings-outlet/widget-settings-outlet';
import { MonitorPageComponent } from './pages/monitor';

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'monitor/profile/overview'
  },
  {
    path: 'settings',
    component: SettingsComponent,
  },
  {
    path: 'monitor',
    redirectTo: 'monitor/profile/overview',
  },
  {
    path: 'monitor/profile/:profile',
    component: MonitorPageComponent,
  },
  {
    path: 'widget/new',
    component: WidgetSettingsOutletComponent,
  },
  {
    path: 'widget/edit/:widgetId',
    component: WidgetSettingsOutletComponent,
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { anchorScrolling: 'enabled' })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
