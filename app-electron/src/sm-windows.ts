import { execAsRoot, execAsUser, Output } from "./exec";
import { ServiceManager, Unit } from "./service-manager";

export class WindowsServiceControl implements ServiceManager {
    name = "sc.exe"

    static readonly unitTranslation = {
        [Unit.Portmaster]: "PortmasterCore",
    }

    async isInstalled(u: Unit): Promise<boolean> {
        // to check if the serivce is installed we just query all
        // of them and check if it appears in the output.
        const response: Output = await execAsUser(`sc.exe query`)
            .catch(err => err);
        return response.stdout.indexOf(
            WindowsServiceControl.unitTranslation[u]
        ) >= 0;
    }

    async isRunning(u: Unit): Promise<boolean> {
        const response: Output = await execAsUser(`sc.exe query ${WindowsServiceControl.unitTranslation[u]}`)
            .catch(err => err);
        return response.stdout.indexOf('RUNNING') >= 0;
    }

    async startService(u: Unit): Promise<void> {
        await execAsRoot(`sc.exe start ${WindowsServiceControl.unitTranslation[u]}`)
        // try 10 times in a row an check if started.
        for (let i = 0; i < 10; i++) {
            if (!await this.isRunning(u)) {
                throw new Error("failed to start " + u)
            }
            // wait for 100ms.
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    async stopService(u: Unit): Promise<void> {
        await execAsRoot(`sc.exe stop ${WindowsServiceControl.unitTranslation[u]}`)
    }
}