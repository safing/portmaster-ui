import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { SettingsComponent } from './pages/settings/settings';
import { DashboardComponent } from './pages/dashboard/dashboard';
import { WidgetSettingsOutletComponent } from './pages/widget-settings-outlet/widget-settings-outlet';

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'dashboard'
  },
  {
    path: 'dashboard',
    component: DashboardComponent,
  },
  {
    path: 'settings',
    component: SettingsComponent,
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
