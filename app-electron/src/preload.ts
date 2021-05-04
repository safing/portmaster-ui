import { contextBridge } from 'electron';
import { AppAPI } from './api';
import { buildClient } from './ipc';
import { WebUILoader } from './loader';

const client = buildClient(AppAPI, WebUILoader);
contextBridge.exposeInMainWorld('app', client)