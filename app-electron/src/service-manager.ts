
export enum Unit {
    Portmaster = "portmaster"
}

export interface ServiceManager {
    name: string;

    /**
     * Checks if the service unit is installed and
     * available on the system.
     * @param unit The service unit to check
     */
    isInstalled(unit: Unit): Promise<boolean>;

    /**
     * Resolves to true if the service unit is currently running
     * or to false if not. Any error will reject the returned promise.
     * @param unit The service unit to check. 
     */
    isRunning(unit: Unit): Promise<boolean>

    /**
     * Starts the service unit.
     * @param unit The service unit to start
     */
    startService(unit: Unit): Promise<void>;

    /**
     * Stops the service unit.
     * @param unit The service unit to start
     */
    stopService(unit: Unit): Promise<void>;

    /**
     * Restarts the service unit. This may not be supported
     * by all service managers.
     * @param unit The service unit to start
     */
    restartService?(unit: Unit): Promise<void>;
}