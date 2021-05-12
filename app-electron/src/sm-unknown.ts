import { ServiceManager, Unit } from "./service-manager";
import { stat } from 'fs';
import { join } from 'path';
import { dataDirectory } from './datadir';

export class UnknownServiceManager implements ServiceManager {
    name = 'unsupported';

    isInstalled(_: Unit): Promise<boolean> {
        // we cannot check that.
        return Promise.resolve(false);
    }

    isRunning(_: Unit): Promise<boolean> {
        // we don't support the service manager of the
        // system but we can still check if the pid file
        // exists.
        return new Promise<boolean>((resolve, reject) => {
            stat(join(dataDirectory, 'core-lock.pid'), err => {
                if (!!err) {
                    if (err.code === 'ENOENT') {
                        resolve(false);
                        return;
                    }
                    reject(err);
                    return;
                }
                resolve(true);
            })
        })
    }

    startService(_: Unit): Promise<void> {
        return Promise.reject('Unsupported service manager or operating system.')
    }

    stopService(_: Unit): Promise<void> {
        return Promise.reject('Unsupported service manager or operating system.')
    }
}