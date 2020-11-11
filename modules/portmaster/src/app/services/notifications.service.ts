import { Injectable, TrackByFunction } from '@angular/core';
import { BehaviorSubject, combineLatest, defer, Observable, throwError } from 'rxjs';
import { delay, filter, map, repeatWhen, multicast, refCount, share, toArray, tap, concatMap, take } from 'rxjs/operators';
import { Notification, NotificationState, NotificationType } from './notifications.types';
import { PortapiService } from './portapi.service';
import { RetryableOpts } from './portapi.types';
import { VirtualNotification } from './virtual-notification';

@Injectable({
  providedIn: 'root'
})
export class NotificationsService {
  /**
   * A {@link TrackByFunction} from tracking notifications.
   */
  static trackBy: TrackByFunction<Notification<any>> = function (_: number, n: Notification<any>) {
    return n.EventID;
  };

  // For testing purposes only
  VirtualNotification = VirtualNotification;

  /** A map of virtual notifications */
  private _virtualNotifications = new Map<string, VirtualNotification<any>>();

  /* Emits all virtual notifications whenever they change */
  private _virtualNotificationChange = new BehaviorSubject<VirtualNotification<any>[]>([]);

  /* A copy of the static trackBy function. */
  trackBy = NotificationsService.trackBy;

  /** The prefix that all notifications have */
  readonly notificationPrefix = "notifications:all/";

  /** new$ emits new (active) notifications as they arrive */
  readonly new$: Observable<Notification<any>[]>;

  constructor(private portapi: PortapiService) {
    this.new$ = this.watchAll().pipe(
      src => this.injectVirtual(src),
      map(msgs => {
        return msgs.filter(msg => msg.State === NotificationState.Active || !msg.State)
      }),
      multicast(() => {
        return new BehaviorSubject<Notification<any>[]>([]);
      }),
      refCount(),
    );
  }

  /**
   * Inject a new virtual notification. If not configured otherwise,
   * the notification is automatically removed when executed.
   */
  inject(notif: VirtualNotification<any>, { autoRemove } = { autoRemove: true }) {
    this._virtualNotifications.set(notif.EventID, notif);
    this._virtualNotificationChange.next(
      Array.from(this._virtualNotifications.values())
    )

    if (autoRemove) {
      notif.executed.subscribe({ complete: () => this.deject(notif) });
    }
  }

  /** Deject (remove) a virtual notification. */
  deject(notif: VirtualNotification<any>) {
    this._virtualNotifications.delete(notif.EventID);

    this._virtualNotificationChange.next(
      Array.from(this._virtualNotifications.values())
    )
  }

  /** A {@link MonoOperatorFunction} that injects all virtual observables into the source. */
  private injectVirtual(obs: Observable<Notification<any>[]>): Observable<Notification[]> {
    return combineLatest([
      obs,
      this._virtualNotificationChange,
    ]).pipe(
      map(([real, virtual]) => {
        return [
          ...real,
          ...virtual,
        ]
      })
    )
  }

  /**
   * Watch all notifications that match a query.
   *
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
  execute(notifOrId: Notification<any> | string, actionId: string): Observable<void> {
    const payload: Partial<Notification<any>> = {};
    if (typeof notifOrId === 'string') {
      payload.EventID = notifOrId;
    } else {
      payload.EventID = notifOrId.EventID;
    }

    if (!!this._virtualNotifications.get(payload.EventID)) {
      return defer(() => {
        const notif = this._virtualNotifications.get(payload.EventID!);
        if (!!notif) {
          notif.selectAction(actionId);
        }
      })
    }

    payload.SelectedActionID = actionId;

    const key = this.notificationPrefix + payload.EventID;
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
      payload.EventID = notifOrID;
    } else {
      payload.EventID = notifOrID.EventID;
      if (notifOrID.State === NotificationState.Executed) {
        return throwError(`Notification ${notifOrID.EventID} already executed`);
      }
    }

    payload.State = NotificationState.Responded;
    const key = this.notificationPrefix + payload.EventID
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
  delete(notifOrId: Notification<any> | string): Observable<void> {
    return this.portapi.delete(typeof notifOrId === 'string' ? notifOrId : notifOrId.EventID);
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
  create(notifOrId: Partial<Notification<any>> | string, message?: string, type?: NotificationType, args?: Partial<Notification<any>>): Observable<void> {
    if (typeof notifOrId === 'string') {
      notifOrId = {
        ...args,
        EventID: notifOrId,
        State: NotificationState.Active,
        Message: message,
        Type: type,
      } as Notification<any>; // it's actual Partial but that's fine.
    }

    if (!notifOrId.EventID) {
      return throwError(`Notification ID is required`);
    }

    if (!notifOrId.Message) {
      return throwError(`Notification message is required`);
    }

    if (typeof notifOrId.Type !== 'number') {
      return throwError(`Notification type is required`);
    }

    return this.portapi.create(this.notificationPrefix + notifOrId.EventID, notifOrId);
  }
}
