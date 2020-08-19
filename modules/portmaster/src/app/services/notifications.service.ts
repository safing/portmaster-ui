import { Injectable, TrackByFunction } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { delay, filter, map, repeatWhen, retryWhen, share, toArray } from 'rxjs/operators';
import { Notification, notificationState, NotificationState, NotificationType } from './notifications.types';
import { PortapiService } from './portapi.service';
import { trackById } from './core.types';
import { RetryableOpts } from './portapi.types';

@Injectable({
  providedIn: 'root'
})
export class NotificationsService {
  /**
   * A {@link TrackByFunction} from tracking notifications.
   */
  static trackBy: TrackByFunction<Notification<any>> = trackById;
  trackBy = NotificationsService.trackBy;

  readonly notificationPrefix = "notifications:all/";

  /**
   * updates$ watches for updates on all notifications (including new ones).
   * It's multicasted (using share()) to ensure we don't send new sub messages
   * foreach new subscriber. 
   */
  readonly updates$ = this.portapi.sub<Notification<any>>(this.notificationPrefix)
    .pipe(
      repeatWhen(obs => obs.pipe(delay(2000))),
      share()
    ); 

  /** new$ emits new (New and ActionRequired) notifications as they arrive */
  readonly new$ = this.updates$.pipe(
    filter(msg => {
      return msg.type !== 'del';
    }),
    filter(msg => {
      const state = notificationState(msg.data);
      return state === NotificationState.New || state === NotificationState.ActionRequired;
    }),
    map(msg => msg.data),
  );

  /**
   * pending$ emits notifications that the user responded to but where the action execution
   * is still pending.
   */
  readonly pending$ = this.updates$.pipe(
    filter(msg => {
      return msg.type !== 'del';
    }),
    filter(msg => {
      const state = notificationState(msg.data);
      return state === NotificationState.ActionPending;
    }),
    map(msg => msg.data)
  );

  constructor(private portapi: PortapiService) {}

  /**
   * Watch all notifications that match a query.
   * 
   * @param query The query to watch. Defaulta to all notifcations
   * @param opts Optional retry configuration options.
   */
  watchAll<T = any>(query: string = '', opts?: RetryableOpts): Observable<Notification<T>[]> {
    return this.portapi.watchAll<Notification<T>>(this.notificationPrefix + query, opts);
  }

  /**
   * Query the backend for a list of notifications. In contrast
   * to {@class PortAPI} query collects all results into an array
   * first which makes it convenient to be used in *ngFor and
   * friends. See {@function trackNotification} for a suitable track-by
   * function.
   * 
   * @param query The search query.
   */
  query(query: string): Observable<Notification<any>[]> {
    return this.portapi.query<Notification<any>>(this.notificationPrefix + query)
      .pipe(
        map(value => value.data),
        toArray()
      )
  }

  /**
   * Returns the notification by ID.
   * 
   * @param id The ID of the notification
   */
  get<T>(id: string): Observable<Notification<T>> {
    return this.portapi.get(this.notificationPrefix + id)
  }

  /**
   * Execute an action attached to a notification.
   * 
   * @param n The notification object.
   * @param actionId The ID of the action to execute.
   */
  execute(n: Notification<any>, actionId: string): Observable<void>;

  /**
   * Execute an action attached to a notification.
   * 
   * @param notificationId The ID of the notification.
   * @param actionId The ID of the action to execute.
   */
  execute(notificationId: string, actionId: string): Observable<void>;

  // overloaded implementation of execute
  execute(notifOrId: Notification<any>|string, actionId: string): Observable<void> {
    const payload: Partial<Notification<any>> = {};
    if (typeof notifOrId === 'string') {
      payload.ID = notifOrId;
    } else {
      const actionExists = (notifOrId.AvailableActions || []).some(a => a.ID === actionId);
      if (!actionExists) {
        return throwError(`Action ${actionId} does not exist`);
      }

      payload.ID = notifOrId.ID;
    }

    payload.SelectedActionID = actionId;

    const key = this.notificationPrefix + payload.ID;
    return this.portapi.update(key, payload);
  }

  /**
   * Resolve a pending notification execution.
   * 
   * @param n The notification object to resolve the pending execution.
   * @param time optional The time at which the pending execution took place
   */
  resolvePending(n: Notification<any>, time?: number): Observable<void>;

  /**
   * Resolve a pending notification execution.
   * 
   * @param n The notification ID to resolve the pending execution.
   * @param time optional The time at which the pending execution took place
   */
  resolvePending(n: string, time?: number): Observable<void>;

  // overloaded implementation of resolvePending.
  resolvePending(notifOrID: Notification<any> | string, time: number = (Math.round(Date.now() / 1000))): Observable<void> {
    const payload: Partial<Notification<any>> = {};
    if (typeof notifOrID === 'string') {
      payload.ID = notifOrID;
    } else {
      payload.ID = notifOrID.ID;
      if (!!notifOrID.Executed) {
        return throwError(`Notification ${notifOrID.ID} already executed at ${new Date(notifOrID.Executed)}`);
      }
    }

    payload.Executed = time;
    const key = this.notificationPrefix + payload.ID
    return this.portapi.update(key, payload);
  }

  /**
   * Delete a notification.
   * 
   * @param n The notification to delete.
   */
  delete(n: Notification<any>): Observable<void>;

  /**
   * Delete a notification.
   * 
   * @param n The notification to delete.
   */
  delete(id: string): Observable<void>;

  // overloaded implementation of delete.
  delete(notifOrId: Notification<any>|string): Observable<void> {
    return this.portapi.delete(typeof notifOrId === 'string' ? notifOrId : notifOrId.ID);
  }

  /**
   * Create a new notification.
   * 
   * @param n The notification to create.
   */
  create(n: Partial<Notification<any>>): Observable<void>;

  /**
   * Create a new notification.
   * 
   * @param id The ID of the notificaiton.
   * @param message The default message of the notificaiton.
   * @param type The notification type
   * @param args Additional arguments for the notification.
   */
  create(id: string, message: string, type: NotificationType, args?: Partial<Notification<any>>): Observable<void>;
  
  // overloaded implementation of create.
  create(notifOrId: Partial<Notification<any>>|string, message?: string, type?: NotificationType, args?: Partial<Notification<any>>): Observable<void> {
    if (typeof notifOrId === 'string') {
      notifOrId = {
        ...args,
        ID: notifOrId,
        Message: message,
        Type: type,
      } as Notification<any>; // it's actual Partial but that's fine.
    }

    if (!notifOrId.ID) {
      return throwError(`Notification ID is required`);
    }

    if (!notifOrId.Message) {
      return throwError(`Notification message is required`);
    }

    if (typeof notifOrId.Type !== 'number') {
      return throwError(`Notification type is required`);
    }

    if (!notifOrId.Created) {
      notifOrId.Created = Math.round(Date.now() / 1000);
    }

    return this.portapi.create(this.notificationPrefix + notifOrId.ID, notifOrId);
  }
}
