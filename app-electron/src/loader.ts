import axios from 'axios';
import { BrowserWindow } from "electron";
import { platform } from 'os';
import { Remote } from './ipc';
import { ServiceManager, Unit } from "./service-manager";
import { SystemdServiceManager } from "./sm-systemd";
import { UnknownServiceManager } from "./sm-unknown";
import { WindowsServiceControl } from "./sm-windows";
import hasbin = require("hasbin");

interface Status {
    type: string;
    serviceManager: string;
    service: {
        installed: boolean;
        running: boolean;
    }
}

export class WebUILoader {
    private sm: ServiceManager;

    constructor(
        private win: BrowserWindow,
        private url: string = 'http://127.0.0.1:817/',
        private pollUrl: string = 'http://127.0.0.1:817/',
    ) {
        // Detect the system manager we need to interface
        // with when starting/stopping the portmaster
        // service.
        this.detectServiceManager()
            .then(sm => this.sm = sm);
    }

    private displayMessage(msg: string) {
        this.win.webContents.send('postMessage', {
            type: 'message',
            message: msg,
        })
    }

    @Remote('getStatus')
    async getStatus(): Promise<Status> {
        let serviceInstalled = false;
        let serviceRunning = false;
        try {
            serviceInstalled = await this.sm.isInstalled(Unit.Portmaster);
            serviceRunning = serviceInstalled ? await this.sm.isRunning(Unit.Portmaster) : false;
        } catch (err) {
            console.error(err);
        }

        const upd = {
            type: 'status',
            serviceManager: this.sm.name,
            service: {
                installed: serviceInstalled,
                running: serviceRunning,
            }
        }
        return upd;
    }

    @Remote('startService')
    startService() {
        return this.sm.startService(Unit.Portmaster);
    }

    @Remote('stopService')
    stopService() {
        return this.sm.stopService(Unit.Portmaster);
    }

    async loadUI() {
        await this.win.loadFile('loading.html').catch(err => console.error(err));

        let tries = 0;
        while (true) {
            try {
                // we try to load the index.html in the background
                // so we don't mess around with the current window
                // content.
                const response = await axios.get(this.pollUrl);
                await this.win.loadURL(this.url)
                return
            } catch (err) {
                console.error(err.toString());
                tries++;
            }

            if (tries == 10) {
                this.displayMessage("Timeout connecting to Portmaster.")
            }

            await this.sleep(1500);
        }

    }

    /**
     * A simple helper to sleep (setTimeout) using
     * async/await
     */
    private sleep(timeout: number): Promise<void> {
        return new Promise<void>(resolve => {
            setTimeout(resolve, timeout);
        })
    }

    private async detectServiceManager(): Promise<ServiceManager> {
        let pl = platform();
        try {
            switch (pl) {
                case 'linux':
                    if (await this.hasBin('systemctl')) {
                        return new SystemdServiceManager();
                    }
                    break;
                case 'win32':
                    return new WindowsServiceControl();
            }
        } catch (err) {
            console.error(err);
        }
        return new UnknownServiceManager();
    }

    /** A simple helper to convert hasbin() callback-style to promises. */
    private async hasBin(binary: string): Promise<boolean> {
        return new Promise<boolean>(resolve => {
            hasbin(binary, found => {
                resolve(found);
            })
        })
    }
}