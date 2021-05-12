import { spawn } from 'child_process';
import { stat } from 'fs';
import { join } from 'path';
import { dataDirectory } from './datadir';

/**
 * Tries to start the notifier via portmaster-start.
 */
export function startNotifier(): Promise<void> {
    const execDir = join(dataDirectory, 'exec'); // actually the same as resolve('.')
    const portmasterStart = join(dataDirectory, 'portmaster-start');
    const args = [
        'notifier',
        `--data=${dataDirectory}`,
    ]

    return new Promise<void>((resolve, reject) => {
        try {
            const process = spawn(portmasterStart, args, {
                detached: true,
                stdio: 'ignore',
                cwd: execDir,
            })

            process.on('close', code => {
                console.log('notifier:close', code)
            })
            process.on('disconnect', () => {
                console.log('notifier:disconnect')
            })
            process.on('error', code => {
                console.log('notifier:close', code)
            })
            process.on('exit', code => {
                console.log('notifier:exit', code)
            })

            process.unref();
            resolve();
        } catch (err) {
            reject(err);
        }
    })
}
