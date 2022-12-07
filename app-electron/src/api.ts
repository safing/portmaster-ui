import { Remote } from './ipc';
import { shell, app, CommandLine, BrowserWindow, Rectangle } from 'electron';
import { platform } from 'os';
import { resolve } from 'path';
import { WebUILoader } from './loader';


/**
 * AppAPI is exposed via the Window object and used by the portmaster application
 * to interact with the local filesystem and OS.
 */
export class AppAPI {
    /** Cache for dataURLs from already loaded path-icons. */
    private readonly iconCache = new Map<string, string>();

    /**
     * Whether we are currently exiting the application.
     * Required to avoid an endless loop win on('close')
     * below.
     */
    private exiting = false;

    constructor(
        private win: BrowserWindow,
        private loader: WebUILoader,
    ) {
        win.on('close', event => {
            if (this.exiting) {
                return;
            }

            // prevent the application from being closed.
            // but only if we actually loaded the User Interface
            // from the portmaster.
            if (this.loader.loaded) {
                event.preventDefault();
                // emit a 'on-app-close' event inside the
                // web-ui so it can bring up the exit screen
                win.webContents.send('on-app-close');
            }
        })
    }

    @Remote('getPlatform')
    getPlatform(): Promise<string> {
        return Promise.resolve(platform())
    }

    /** The installation directory of portmaster. */
    @Remote('getInstallDir')
    getInstallDir(): Promise<string> {
        return Promise.resolve(resolve('..'));
    }

    @Remote('focus')
    async focus() {
        this.win.focus();
    }

    @Remote('setBounds')
    async setBounds(rect: Rectangle, animate: boolean = false) {
        this.win.setBounds(rect, animate)
    }

    @Remote('exitApp')
    async exitApp() {
        this.exiting = true;
        this.win.close();
    }

    /**
     * Open an URL or path using an external application.
     * 
     * @param pathOrUrl The path or URL to open.
     */
    @Remote('openExternal')
    async openExternal(pathOrUrl: string) {
        try {
            // URL constructor throws if pathOrUrl is not an URL
            new URL(pathOrUrl);
        } catch (e) {
            console.error(e);
            pathOrUrl = await this.createFileURL(pathOrUrl);
        }
        console.log("opening external: ", pathOrUrl)

        await shell.openExternal(pathOrUrl);
    }

    /**
     * Creates a new URL with the file:// scheme. Works
     * on any platform.
     * 
     * @param path The path for the file URL.
     */
    @Remote('createFileURL')
    async createFileURL(path: string): Promise<string> {
        if (typeof path !== 'string') {
            throw new Error('Expected a string');
        }

        var pathName = resolve(path).replace(/\\/g, '/');

        // Windows drive letter must be prefixed with a slash
        if (pathName[0] !== '/') {
            pathName = '/' + pathName;
        }

        return encodeURI('file://' + pathName);
    }

    /**
     * Returns a dataURL for the icon that is used to represent
     * the path on this platform.
     * This method only works on windows for now. On all other
     * platforms an empty string is returned.
     *  
     * @param path The path the the binary
     */
    @Remote('getFileIcon')
    async getFileIcon(path: string): Promise<string> {
        if (path === "") {
            return "";
        }

        if (platform() !== "win32") {
            return "";
        }

        if (this.iconCache.has(path)) {
            return this.iconCache.get(path);
        }

        const icon = await app.getFileIcon(path);
        const dataURL = icon.toDataURL();
        this.iconCache.set(path, dataURL);

        return dataURL;
    }
}