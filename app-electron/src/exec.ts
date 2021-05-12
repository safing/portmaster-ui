import { exec as sudoExec } from 'sudo-prompt';
import { ExecException, exec as userExec } from 'child_process';

export interface Output {
    error?: Error | ExecException;
    stdout: string;
    stderr: string;
}

export function execAsRoot(cmd: string): Promise<Output> {
    return new Promise<Output>((resolve, reject) => {
        sudoExec(cmd, { name: 'Portmaster' }, (error: Error, stdout: string, stderr: string) => {
            const output: Output = {
                error: error,
                stdout: stdout?.toString() || '',
                stderr: stderr?.toString() || '',
            }

            if (!!error) {
                reject(output);
                return;
            }
            resolve(output);
        })
    })
}

export function execAsUser(cmd: string): Promise<Output> {
    return new Promise<Output>((resolve, reject) => {
        const process = userExec(cmd, { shell: "/bin/sh" }, (error: Error, stdout: string, stderr: string) => {
            const output: Output = {
                error: error,
                stdout: stdout?.toString() || '',
                stderr: stderr?.toString() || '',
            }

            if (!!error) {
                reject(output);
                return;
            }
            resolve(output);
        })
    })
}