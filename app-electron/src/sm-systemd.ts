import { ServiceManager, Unit } from './service-manager';
import { execAsRoot, execAsUser, Output } from './exec';

export class SystemdServiceManager implements ServiceManager {
    name = 'systemd';

    static readonly unitTranslations = {
        [Unit.Portmaster]: "portmaster.service",
    }

    async isRunning(u: Unit): Promise<boolean> {
        const response = await this.systemctl(
            'is-running',
            SystemdServiceManager.unitTranslations[u],
        ).catch((output: Output) => output);
        return !response?.error;
    }

    async isInstalled(u: Unit): Promise<boolean> {
        // TODO(ppacher): we simply check for the existence
        // of the portmaster.service unit here. In the future,
        // we might also want to make sure the unit is enabled.
        const response = await this.systemctl(
            'cat',
            SystemdServiceManager.unitTranslations[u],
        ).catch((output: Output) => output);
        return !response?.error;
    }

    async startService(u: Unit): Promise<void> {
        await this.systemctl(
            'start',
            SystemdServiceManager.unitTranslations[u],
            true
        )
    }

    async stopService(u: Unit): Promise<void> {
        await this.systemctl(
            'stop',
            SystemdServiceManager.unitTranslations[u],
            true
        )
    }

    async restartService(u: Unit): Promise<void> {
        const response = await this.systemctl(
            'restart',
            SystemdServiceManager.unitTranslations[u],
            true
        )
        if (!!response.error) {
            throw response.error;
        }
    }

    private systemctl(cmd: string, unit: string, asRoot = false): Promise<Output> {
        const command = `systemctl ${cmd} ${unit} --no-pager`;
        console.log(command);
        if (asRoot) {
            return execAsRoot(command);
        }
        return execAsUser(command);
    }
}