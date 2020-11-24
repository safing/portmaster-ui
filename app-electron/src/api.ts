import { remote, shell } from 'electron';
import { platform } from 'os';
import { resolve } from 'path';
// import { GetDataDir } from "./datadir";

/**
 * AppAPI is exposed via the Window object and used by the portmaster application
 * to interact with the local filesystem and OS.
 */
export class AppAPI {
    /** The current platform the app is running on. */
    readonly platform = platform();

    /** The installation directory of portmaster. */
    // TODO: GetDataDir(remote.app.commandLine) makes the Portmaster open
    // another instance of itself. For now, just use "..", as the working
    // directory is installDir/exec.
    // readonly installDir = GetDataDir(remote.app.commandLine);
    readonly installDir = "..";

    /** Provides direct access to all commandline switches. */
    readonly commandLine = remote.app.commandLine;

    /** Cache for dataURLs from already loaded path-icons. */
    private readonly iconCache = new Map<string, string>();

    /**
     * Open an URL or path using an external application.
     * 
     * @param pathOrUrl The path or URL to open.
     */
    async openExternal(pathOrUrl: string) {
        try {
            // URL constructor throws if pathOrUrl is not an URL
            new URL(pathOrUrl);
        } catch (e) {
            pathOrUrl = this.createFileURL(pathOrUrl);
        }

        await shell.openExternal(pathOrUrl);
    }

    /**
     * Creates a new URL with the file:// scheme. Works
     * on any platform.
     * 
     * @param path The path for the file URL.
     */
    createFileURL(path: string): string {
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
    async getFileIcon(path: string): Promise<string> {
        if (path === "") {
            return "";
        }

        if (this.platform !== "win32") {
            return "";
        }

        if (this.iconCache.has(path)) {
            return this.iconCache.get(path);
        }

        const icon = await remote.app.getFileIcon(path);
        const dataURL = icon.toDataURL();
        this.iconCache.set(path, dataURL);

        return dataURL;
    }
}