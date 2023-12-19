import { InjectionToken } from "@angular/core";
import { BrowserIntegrationService } from "./browser";
import { ElectronIntegrationService } from "./electron";
import { IntegrationService } from "./integration";
import { TauriIntegrationService } from "./taur-app";

export function integrationServiceFactory(): IntegrationService {
  if ('__TAURI__' in window) {
    return new TauriIntegrationService();
  }

  if ('app' in window) {
    return new ElectronIntegrationService();
  }

  return new BrowserIntegrationService();
}

export const INTEGRATION_SERVICE = new InjectionToken<IntegrationService>('INTEGRATION_SERVICE');
