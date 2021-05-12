import { resolve } from 'path';
import { statSync } from 'fs';
import { app, remote } from 'electron';

export function getDataDir(cmdLine: Electron.CommandLine): string {
    // If --data is not passed as an argument we expect
    // to be running in the exec directory. so just step
    // one up to find the data dir.
    if (!cmdLine.hasSwitch("data")) {
        return resolve('..');
    }

    // Get data dir from command line.
    let dataDir = cmdLine.getSwitchValue('data');
    // If dataDir is empty, the argument might have be supplied without `=`.
    if (dataDir === '') {
        dataDir = process.argv[process.argv.indexOf('--data') + 1];
    }

    if (!dataDir) {
        console.error(`Invalid use of --data switch.`)
        return '';
    }

    // check if the supplied path actually exists
    try {
        const stat = statSync(dataDir);
        if (!stat.isDirectory()) {
            console.error(`${dataDir} is not a directory`)
            return '';
        }
    } catch (err) {
        console.error(err);
        return '';
    }

    return dataDir;
}

(function () {
    if (!!app) {
        dataDirectory = getDataDir(app.commandLine);
    }
})()

export let dataDirectory: string;