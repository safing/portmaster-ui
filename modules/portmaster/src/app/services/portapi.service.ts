import { Inject, Injectable, InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { WebSocketSubject } from 'rxjs/webSocket';
import { DataReply, deserializeMessage, MessageType, ReplyMessage, Requestable, serializeMessage } from './portapi.types';
import { WebsocketService } from './websocket.service';

/**
 * PortapiURL is the injection token to receive the protmaster
 * API endpoint.
 */
export const PortapiURL = new InjectionToken<string>("Portapi")

export const RECONNECT_INTERVAL = 2000;

let uniqueRequestId = 0;

@Injectable({
  providedIn: 'root'
})
export class PortapiService {
  private ws$: WebSocketSubject<ReplyMessage> | null = null;

  constructor(private websocketFactory: WebsocketService, 
              @Inject(PortapiURL) private databaseEndpoint: string) {
    this.ws$ = this.createWebsocket();
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
  sub<T>(query: string): Observable<DataReply<T>> {
    return this.request('sub', {query});
  }  

  /**
   * Subscribes for updates on entries of the selected query and
   * ensures entries are stream once upon subscription.
   * 
   * @param query The query use to subscribe.
   * @todo(ppacher): check what a ok/done message mean here.
   */
  qsub<T>(query: string): Observable<DataReply<T>> {
    return this.request('qsub', {query});
  }

  /**
   * Creates a new database entry.
   * 
   * @param key The database key for the entry.
   * @param data The actual data for the entry.
   */
  create(key: string, data: any): Observable<void> { 
    return this.request('create', {key, data})
      .pipe(map(() => {}));
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
  
  private request<M extends MessageType>(method: M, attrs: Partial<Requestable<M>>): Observable<DataReply<any>> {
    return new Observable(observer => {
      const id = `${++uniqueRequestId}`;

      if (!this.ws$) {
        observer.error("No websocket connection");
        return
      }

      const stream$: Observable<ReplyMessage<any>> = this.ws$.multiplex(
        () => ({
          ...attrs,
          id: id,
          type: method,
        }),
        () => undefined,
        reply => reply.id === id,
      );

      const subscription = stream$?.subscribe({
        next: data => {
          if (data.type === 'error') {
            observer.error(data.message);
            return
          }

          if (data.type === 'done' || data.type === 'success') {
            observer.complete();
            return
          }

          if (data.type === 'warning') {
            console.warn(data.message);
            return;
          }

          observer.next(data);
        },
        error: err => {
          observer.error(err);
        },
        complete: () => {
          observer.complete();
        }
      })

      return () => {
        subscription.unsubscribe();
      }
    });
  }

  /**
   * Creates a new websocket subject and configures appropriate serializer
   * and deserializer functions for PortAPI.
   * 
   * @private
   */
  private createWebsocket(): WebSocketSubject<ReplyMessage> {
    return this.websocketFactory.createConnection<ReplyMessage>({
      url: this.databaseEndpoint,
      serializer: serializeMessage,
      // deserializeMessage also supports RequestMessage so cast as any
      deserializer: deserializeMessage as any, 
      binaryType: 'arraybuffer',
      openObserver: {
        next: () => {
          console.log('[portapi] connection to portmaster established');
        }
      },
      closeObserver: {
        next: () => {
          console.log('[portapi] connection to portmaster lost, reconnecting');
        }
      }
    })
  }
}

