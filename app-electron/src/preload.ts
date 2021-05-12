import { contextBridge, ipcRenderer } from 'electron';
import { AppAPI } from './api';
import { buildClient } from './ipc';
import { WebUILoader } from './loader';

ipcRenderer.on('on-app-close', () => {
    window.postMessage('on-app-close', '*');
})

const client = buildClient(AppAPI, WebUILoader);
contextBridge.exposeInMainWorld('app', client)