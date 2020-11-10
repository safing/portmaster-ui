declare global {
  interface Window {
    app: AppAPI;
  }
}

export class AppAPI {
  /** The current platform the app is running on. */
  readonly platform: string;

  /** The installation directory of portmaster. */
  readonly installDir: string;

  /** Provides direct access to all commandline switches. */
  readonly commandLine: any;

  /**
   * Open an URL or path using an external application.
   *
   * @param pathOrUrl The path or URL to open.
   */
  openExternal(pathOrUrl: string): Promise<void>;

  /**
   * Creates a new URL with the file:// scheme. Works
   * on any platform.
   *
   * @param path The path for the file URL.
   */
  createFileURL(path: string): string;

  /**
   * Returns a dataURL for the icon that is used to represent
   * the path on this platform.
   * This method only works on windows for now. On all other
   * platforms an empty string is returned.
   *
   * @param path The path the the binary
   */
  getFileIcon(path: string): Promise<string>;
}
