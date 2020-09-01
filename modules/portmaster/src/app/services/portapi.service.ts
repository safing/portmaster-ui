import { Injectable, isDevMode, NgZone, TrackByFunction } from '@angular/core';
import { BehaviorSubject, Observable, defer } from 'rxjs';
import { filter, map, takeWhile, tap, count } from 'rxjs/operators';
import { WebSocketSubject } from 'rxjs/webSocket';
import { environment } from '../../environments/environment';
import { DataReply, deserializeMessage, InspectedActiveRequest, isCancellable, isDataReply, ReplyMessage, Requestable, RequestType, RetryableOpts, retryPipeline, serializeMessage, WatchOpts } from './portapi.types';
import { WebsocketService } from './websocket.service';
import { trackById, Identifyable } from './core.types';

export const RECONNECT_INTERVAL = 2000;

let uniqueRequestId = 0;

@Injectable({
  providedIn: 'root'
})
export class PortapiService {
  private ws$: WebSocketSubject<ReplyMessage> | null = null;
  
  readonly activeRequests = new BehaviorSubject<{[key: string]: InspectedActiveRequest}>({});

  constructor(private websocketFactory: WebsocketService,
              private ngZone: NgZone) {
    this.ws$ = this.createWebsocket();
  }

  /**
   * Allows to inspect currently active requests.
   */
  inspectActiveRequests(): {[key: string]: InspectedActiveRequest} {
    return this.activeRequests.getValue();
  }

  /**
   * Loads a database entry. The returned observable completes
   * after the entry has been loaded.
   * 
   * @param key The database key of the entry to load.
   */
  get<T>(key: string): Observable<T> {
    return this.request('get', {key})
        .pipe(
          map(res => res.data)
        );
  }

  /**
   * Searches for multiple database entries at once. Each entry
   * is streams via the returned observable. The observable is
   * closed after the last entry has been published.
   * 
   * @param query The query used to search the database.
   */
  query<T>(query: string): Observable<DataReply<T>> {
    return this.request('query', {query});
  }

  /**
   * Subscribes for updates on entries of the selected query.
   * 
   * @param query The query use to subscribe.
   */
  sub<T>(query: string, opts: RetryableOpts = {}): Observable<DataReply<T>> {
    return this.request('sub', {query})
      .pipe(retryPipeline(opts));
  }  

  /**
   * Subscribes for updates on entries of the selected query and
   * ensures entries are stream once upon subscription.
   * 
   * @param query The query use to subscribe.
   * @todo(ppacher): check what a ok/done message mean here.
   */
  qsub<T>(query: string, opts: RetryableOpts = {}): Observable<DataReply<T>> {
    return this.request('qsub', {query})
      .pipe(retryPipeline(opts))
  }

  /**
   * Creates a new database entry.
   * 
   * @warn create operations do not validate the type of data
   * to be overwritten (for keys that does already exist).
   * Use {@function insert} for more validation.
   * 
   * @param key The database key for the entry.
   * @param data The actual data for the entry.
   */
  create(key: string, data: any): Observable<void> { 
    return this.request('create', {key, data})
      .pipe(map(() => {}));
  }

  /**
   * Updates an existing entry.
   * 
   * @param key The database key for the entry
   * @param data The actual, updated entry data.
   */
  update(key: string, data: any): Observable<void> {
    return this.request('update', {key, data})
      .pipe(map(() => {}))
  }

  /**
   * Creates a new database entry.
   * 
   * @param key The database key for the entry.
   * @param data The actual data for the entry.
   * @todo(ppacher): check what's different to create().
   */
  insert(key: string, data: any): Observable<void> { 
    return this.request('insert', {key, data})
      .pipe(map(() => {}));
  }

  /**
   * Deletes an existing database entry.
   * 
   * @param key The key of the database entry to delete.
   */
  delete(key: string): Observable<void> {
    return this.request('delete', {key})
      .pipe(map(() => {}));
  }

  /**
   * Watch a database key for modifications. If the
   * websocket connection is lost or an error is returned
   * watch will automatically retry after retryDelay
   * milliseconds. It stops retrying to watch key once
   * maxRetries is exceeded. The returned observable completes
   * when the watched key is deleted.
   * 
   * @param key The database key to watch
   * @param opts.retryDelay Number of milliseconds to wait
   *        between retrying the request. Defaults to 1000
   * @param opts.maxRetries Maximum number of tries before
   *        giving up. Defaults to Infinity
   * @param opts.ingoreNew Whether or not `new` notifications
   *        will be ignored. Defaults to false
   */
  watch<T>(key: string, opts: WatchOpts = {}): Observable<T> {
    return this.qsub<T>(key, opts)
      .pipe(
        filter(reply => reply.key === key),
        takeWhile(reply => reply.type !== 'del'),
        filter(reply => {
          return !opts.ingoreNew || reply.type !== 'new'
        }),
        map(reply => reply.data),
      );
  }

  watchAll<T>(query: string, opts?: RetryableOpts): Observable<T[]> {
    return new Observable<T[]>(observer => {
      let values: T[] = [];
      let keys: string[] = [];
      let doneReceived = false;
  
      const sub = this.request('qsub', {query}, {forwardDone: true})
        .subscribe({
          next: value => {
            if ((value as any).type === 'done') {
              doneReceived = true;
              observer.next(values);
              return
            }

            if (!doneReceived) {
              values.push(value.data);
              keys.push(value.key);
              return;
            }

            const idx = keys.findIndex(k => k === value.key);
            switch (value.type) {
              case 'new':
                if (idx < 0) {
                  values.push(value.data);
                  keys.push(value.key);
                } else {
                  const existingCount = countTruthyDataFields(values[idx]);
                  const newCount = countTruthyDataFields(value.data);

                  if (existingCount < newCount) {
                    console.log(`"new" value has ${newCount} instead of ${existingCount}, using that ...`, value.data, values[idx])
                    values[idx] = value.data;
                  } else {
                    return;
                  }
                }
                break;
              case 'del':
                if (idx >= 0) {
                  keys.splice(idx, 1);
                  values.splice(idx, 1);
                }
                break;
              case 'upd':
                if (idx >= 0) {
                  values[idx] = value.data;
                }
                break;
            }

            observer.next(values);
          },
          error: err => {
            observer.error(err);
          },
          complete: () => {
            observer.complete();
          }
        })

      return () => {
        sub.unsubscribe();
      }
    })
  }

  /**
   * Close the current websocket connection. A new subscription
   * will _NOT_ trigger a reconnect.
   */
  close() {
    if (!this.ws$) {
      return;
    }

    this.ws$.complete();
    this.ws$ = null;
  }
  
  request<M extends RequestType>(method: M, attrs: Partial<Requestable<M>>, {forwardDone}: {forwardDone?: boolean} = {}): Observable<DataReply<any>> {
    return new Observable(observer => {
      const id = `${++uniqueRequestId}`;

      if (!this.ws$) {
        observer.error("No websocket connection");
        return
      }

      let unsub: () => any = () => undefined;
      // some methods are cancellable and we MUST send
      // a `cancel` message or the backend will not stop
      // streaming data for that request id.
      if (isCancellable(method)) {
        unsub = () => ({
          id: id,
          type: 'cancel'
        })
      }

      const request: any = {
          ...attrs,
          id: id,
          type: method,
      }

      let inspected: InspectedActiveRequest = {
        type: method,
        messagesReceived: 0,
        observer: observer,
        payload: request,
        lastData: null,
        lastKey: '',
      }

      if (isDevMode() || !environment.production) {
        this.activeRequests.next({
          ...this.inspectActiveRequests(),
          [id]: inspected,
        })
      }

      let stream$: Observable<ReplyMessage<any>> = this.ws$.multiplex(
        () => request,
        unsub,
        reply => reply.id === id,
      );

      if (!environment.production || isDevMode()) {
        // in development mode we log all replys for the different
        // methods. This also includes updates to subscriptions.
        stream$ = stream$.pipe(
          tap(
            msg => console.log(`[portapi] reply for ${method} ${id}: `, msg),
            err => console.error(`[portapi] error in ${method} ${id}: `, err),
          )
        )
      }

      const subscription = stream$?.subscribe({
        next: data => {
          inspected.messagesReceived++;

          // in all cases, an `error` message type
          // terminates the data flow.
          if (data.type === 'error') {
            observer.error(data.message);
            return
          }

          if (method === 'create'
              || method === 'update'
              || method === 'insert'
              || method === 'delete' ) {
            // for data-manipulating methods success
            // ends the stream.
            if (data.type === 'success') {
              observer.next();
              observer.complete();
              return;
            }
          }

          if (method === 'query'
              || method === 'sub'
              || method === 'qsub') {
            if (data.type === 'warning') {
              console.warn(data.message);
              return;
            }
          
            // query based methods send `done` once all
            // results are sent at least once.
            if (data.type === 'done') {
              if (method === 'query') {
                // done ends the query but does not end sub or qsub
                observer.complete();
                return;
              }

              if (!!forwardDone) {
                // A done message in qsub does not actually represent
                // a DataReply but we still want to forward that.
                observer.next(data as any);
              }
              return;
            }
          }

          if (!isDataReply(data)) {
            console.error(`Received unexpected message type ${data.type} in a ${method} operation`);
            return
          }

          inspected.lastData = data.data;
          inspected.lastKey = data.key;

          observer.next(data);

          // for a `get` method the first `ok` message
          // also marks the end of the stream.
          if (method === 'get' && data.type === 'ok')  {
            observer.complete();
          }
        },
        error: err => {
          console.error(err);
          // TODO(ppacher): re-enable that once "cancel" support
          // landed in portbase.

          //observer.error(err);
          observer.complete();
        },
        complete: () => {
          observer.complete();
        }
      })

      if (isDevMode() || !environment.production) {
        // make sure we remove the "active" request when the subscription
        // goes down
        subscription.add(() => {
          const active = this.inspectActiveRequests();
          delete(active[request.id]) ;
          this.activeRequests.next(active);
        })
      }

      return () => {
        subscription.unsubscribe();
      }
    });
  }
  
  /**
   * Inject a message into a PortAPI stream.
   * 
   * @param id The request ID to inject msg into.
   * @param msg The message to inject.
   */
  _injectMessage(id: string, msg: DataReply<any>) {
    // we are using runTask here so change-detection is
    // triggered as needed
    this.ngZone.runTask(() => {
      const req = this.activeRequests.getValue()[id];
      if (!req) {
        return
      }

      req.observer.next(msg as DataReply<any>)
    })
  }

  /**
   * Injects a 'ok' type message
   * 
   * @param id The ID of the request to inject into
   * @param data The data blob to inject
   * @param key [optional] The key of the entry to inject
   */
  _injectData(id: string, data: any, key: string = '') {
    this._injectMessage(id, {type: 'ok', data: data, key, id: id});
  }

  /**
   * Patches the last message received on id by deeply merging
   * data and re-injects that message.
   * 
   * @param id The ID of the request
   * @param data The patch to apply and reinject
   */
  _patchLast(id: string, data: any) {
    const req = this.activeRequests.getValue()[id];
    if (!req || !req.lastData) {
      return;
    }

    const newPayload = mergeDeep({}, req.lastData, data);
    this._injectData(id, newPayload, req.lastKey)
  }

  /**
   * Creates a new websocket subject and configures appropriate serializer
   * and deserializer functions for PortAPI.
   * 
   * @private
   */
  private createWebsocket(): WebSocketSubject<ReplyMessage> {
    return this.websocketFactory.createConnection<ReplyMessage>({
      url: environment.portAPI,
      serializer: msg => {
        try {
          return serializeMessage(msg);
        } catch (err) {
          console.error('serialize message', err);
          return {
            type: 'error'
          }
        }
      },
      // deserializeMessage also supports RequestMessage so cast as any
      deserializer: <any>((msg: any) => {
        try {
          return deserializeMessage(msg)
        } catch (err) {
          console.error('deserialize message', err);
          return {
            type: 'error'
          }
        }
      }),
      binaryType: 'arraybuffer',
      openObserver: {
        next: () => {
          console.log('[portapi] connection to portmaster established');
        }
      },
      closeObserver: {
        next: () => {
          console.log('[portapi] connection to portmaster closed');
        },
      },
      closingObserver: {
        next: () => {
          console.log('[portapi] connection to portmaster closing');
        },
      }
    })
  }
}

// Counts the number of "truthy" datafields in obj.
function countTruthyDataFields(obj: {[key: string]: any}): number {
  let count = 0;
  Object.keys(obj).forEach(key => {
    let value = obj[key];
    if (!!value) {
      count++;
    }
  })
  return count;
}

function isObject(item: any): item is Object {
  return (item && typeof item === 'object' && !Array.isArray(item));
}

function mergeDeep(target: any, ...sources: any): any {
  if (!sources.length) return target;
  const source = sources.shift();

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} });
        mergeDeep(target[key], source[key]);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }

  return mergeDeep(target, ...sources);
}