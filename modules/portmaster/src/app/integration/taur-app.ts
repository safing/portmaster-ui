import { AppInfo, IntegrationService, ProcessInfo } from "./integration";
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { open } from '@tauri-apps/plugin-shell';

// This doesn't work for some reason ...
// import { invoke } from '@tauri-apps/api/primitives';

function invoke<T>(method: string, args: any): Promise<T> {
  return (window as any).__TAURI__.core.invoke(method, args);
}

interface Event<T> {
  /** Event name */
  event: EventName;
  /** The label of the window that emitted this event. */
  windowLabel: string;
  /** Event identifier used to unlisten */
  id: number;
  /** Event payload */
  payload: T;
}
type EventCallback<T> = (event: Event<T>) => void;
type EventName = (string & Record<never, never>);

function once<T>(event: EventName, handler: EventCallback<T>) {
  (window as any).__TAURI__.event.once(event, handler);
}

function uuid(): string {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  // This one is not really random and not RFC compliant but serves enough for fallback
  // purposes if the UI is opened in a browser that does not yet support randomUUID
  console.warn('Using browser with lacking support for crypto.randomUUID()');

  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

function asyncInvoke<T>(method: string, args: object): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const eventId = uuid();

    once<T & { error: string }>(eventId, (event) => {
      if (typeof event.payload === 'object' && 'error' in event.payload) {
        reject(event.payload);
        return
      };

      resolve(event.payload);
    })

    invoke<string>(method, {
      ...args,
      responseId: eventId,
    }).catch(err => reject(err));
  })
}

export type ServiceManagerStatus = 'Running' | 'Stopped' | 'NotFound' | 'unsupported service manager' | 'unsupported operating system';

export class TauriIntegrationService implements IntegrationService {
  writeToClipboard(text: string): Promise<void> {
    return writeText(text);
  }

  openExternal(pathOrUrl: string): Promise<void> {
    return open(pathOrUrl);
  }

  getInstallDir(): Promise<string> {
    return Promise.reject("not yet supported in tauri")
  }

  getAppInfo(info: ProcessInfo): Promise<AppInfo> {
    return asyncInvoke("get_app_info", {
      ...info,
    })
  }

  getAppIcon(info: ProcessInfo): Promise<string> {
    return this.getAppInfo(info)
      .then(info => info.icon_dataurl)
  }

  exitApp(): Promise<void> {
    return invoke('exit', {})
  }

  getServiceManagerStatus(): Promise<ServiceManagerStatus> {
    return asyncInvoke("get_service_manager_status", {})
  }

  startService(): Promise<any> {
    return asyncInvoke("start_service", {});
  }
}


