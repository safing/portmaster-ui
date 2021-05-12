/**
 * IPC Helper Module
 * 
 * This file provides a decorator based help system to quickly expose methods
 * via the new ipcMain and ipcRenderer interface.
 * 
 * The remote module is deprecated due to security and performance issues
 * see https://nornagon.medium.com/electrons-remote-module-considered-harmful-70d69500f31).
 * 
 * How it works:
 * 
 * Create a class that implements all the methods you want to expose to the renderer
 * process using the available node-integration in the main process.
 * Decorate all methods you want to expose with @Expose('methodName'). Those methods
 * MUST return Promises.
 * 
 * Finally, create a new instance of that class and pass it to serveIPC
 * in your main process. In the renderer process (preload) use pass the class TYPE
 * to buildClient and expose the result using the contextBridge.
 * 
 * Example:
 * 
 *      // foo.ts
 *      export class Foo {
 *           @Expose('readFile')
 *           async readFile(path: string): Promise<Blob> {
 *               return fs.promises.readFile(path);
 *           }
 *      }
 *       
 *      // main.ts
 *      serveIPC(new Foo())
 *       
 *      // preload.ts
 *      contextBridge.exposeInMainWorld('api', buildClient(Foo))
 *       
 *      // index.html
 *      window.api.readFile("/etc/passwd").then(result => console.log(result))
 * 
 */

import { ipcMain, ipcRenderer } from "electron";

export declare interface Type<T> extends Function {
    new(...args: any[]): T;
}

type ExposableMethod = (...args: any[]) => Promise<any>;
type PromiseFunctionPropertyNames<T> = { [K in keyof T]: T[K] extends ExposableMethod ? K : never }[keyof T];
type Remote<T> = Pick<T, PromiseFunctionPropertyNames<T>>;

// Used to collect all methods names that should be exposed via
// IPC. we need to collect them at evaluation time because the
// actual implementation class will likely fail to be created
// in the renderer process.
// 
// Note that this array exists once in the main process and once
// in the renderer process. You must make sure to at least include
// the actual implementation class in your renderer but never try
// to instantiate it (use buildClient() instead.)
let methods: string[] = [];

// Remote returns a method decorator that marks the method as
// exposed via RPC.
// Using @Expose(key) on a class method will add the method name
// to the __exposedMethods reflect metadata of each created
// instance and will add the key to the methods array.
export const Remote: (key: string) => MethodDecorator = key => {
    methods.push(key);
    return (
        target: Object,
        propertyKey: string | symbol,
        descriptor: PropertyDescriptor
    ): void => {
        let __exposed: (string | symbol)[] = Reflect.get(target, '__exposedMethods');
        if (__exposed === undefined) {
            __exposed = [];
            Reflect.set(target, '__exposedMethods', __exposed);
        }
        __exposed.push(propertyKey)
    }
}

// serveIPC will create a new IPC handler on ipcMain for each method 
// of target that has been decorated with @Expose().
// Use buildClient() below to get a client object for all methods
// or directly use ipcRenderer.invoke('api.<methodName>', arg1, arg2)
// to call them from the renderer process.
export const serveIPC = (...targets: object[]) => {
    targets.forEach(target => {
        const __exposed: (string | symbol)[] = Reflect.get(target, '__exposedMethods') || [];
        __exposed.forEach(key => {
            const methodName: string = typeof key === 'string' ? key : key.toString();
            ipcMain.handle(`api.${methodName}`, (event, ...args) => {
                const method = (target as any)[key];
                return method.apply(target, args)
            })
        })
    })
}

// returns a IPC client that mimics the (@Expose'd) method landscape
// of T but executes them via ipcRenderer.
// Note that type isn't actually required but it allows for better
// type-safety and ensure's the target implementation is actually
// included and evaluted (and those all @Expose() decorators are
// called.)
export function buildClient<T1>(t1?: Type<T1>): Remote<T1>;
export function buildClient<T1, T2>(t1?: Type<T1>, t2?: Type<T2>): Remote<T1 & T2>;
export function buildClient<T1, T2, T3>(t1?: Type<T1>, t2?: Type<T2>, t3?: Type<T3>): Remote<T1 & T2 & T3>;
export function buildClient<T1, T2, T3, T4>(t1?: Type<T1>, t2?: Type<T2>, t3?: Type<T3>, t4?: Type<T4>): Remote<T1 & T2 & T3 & T4>;
export function buildClient(...type: any[]): any {
    let api: {
        [key: string]: (...args: any[]) => Promise<any>;
    } = {};
    methods.forEach(method => {
        api[method] = async (...args: any[]) => {
            return await ipcRenderer.invoke.apply(ipcRenderer, [
                `api.${method}`,
                ...args,
            ])
        }
    })
    return api as any;
}
