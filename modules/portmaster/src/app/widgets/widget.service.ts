import { Injectable, TrackByFunction } from '@angular/core';
import { PortapiService } from '../services/portapi.service';
import { combineLatest, Observable, of, throwError } from 'rxjs';
import { WidgetConfig } from './widget.types';
import { catchError, map, startWith, tap } from 'rxjs/operators';
import { Record } from '../services/portapi.types';

export interface WidgetOrder extends Record {
  order: string[];
}

@Injectable({
  providedIn: 'root'
})
export class WidgetService {
  /** The widget database key prefix */
  readonly widgetPrefix = 'core:ui/widgets';

  /** The database key used to store the widget order. */
  readonly widgetOrder = 'core:ui/widget-order';

  /** A {@link TrackByFunction} for widgets. */
  readonly trackBy: TrackByFunction<WidgetConfig> = (_: number, widget: WidgetConfig) => {
    return widget.key;
  };

  constructor(private portapi: PortapiService) {
    this.getOrder()
      .pipe(
        catchError(err => this.saveOrder([
          'pilot-widget',
          'prompt-widget',
          'notification-widget',
        ]))
      ).subscribe();
  }

  /** Save the widget order */
  saveOrder(order: string[]): Observable<void> {
    return this.portapi.update(this.widgetOrder, { order })
  }

  /** Watch the order of widgets. */
  watchOrder(): Observable<string[]> {
    return this.portapi.watch<WidgetOrder>(this.widgetOrder)
      .pipe(map(res => res.order));
  }

  getOrder(): Observable<string[]> {
    return this.portapi.get<WidgetOrder>(this.widgetOrder)
      .pipe(map(res => res.order));
  }

  /**
   * Creates a new widget.
   *
   * @param widget The widget to create
   */
  createWidget(widget: WidgetConfig): Observable<string> {
    if (!widget.key) {
      widget.key = `${new Date().getTime()}`;
      const key = `${this.widgetPrefix}/${widget.key}`;
      return this.portapi.create(key, widget)
        .pipe(map(() => widget.key!));
    }

    const key = `${this.widgetPrefix}/${widget.key}`;
    return this.portapi.update(key, widget)
      .pipe(map(() => widget.key!));
  }

  /**
   * Delete a widget.
   *
   * @param key The key of the widget to delete
   */
  deleteWidget(key: string): Observable<void>;

  /**
   * Delete a widget.
   *
   * @param widget The widget configuratino to delete
   */
  deleteWidget(widget: WidgetConfig): Observable<void>;

  /** overloaded implementation */
  deleteWidget(widgetOrKey: string | WidgetConfig): Observable<void> {
    const key = typeof widgetOrKey === "string"
      ? widgetOrKey
      : widgetOrKey.key;

    if (!key) {
      return throwError(`Unknown widget key "${key}"`);
    }

    const dbkey = `${this.widgetPrefix}/${key}`;
    return this.portapi.delete(dbkey);
  }

  /**
   * Watches all widgets and their configuration.
   */
  watchWidgets(): Observable<WidgetConfig[]> {
    return combineLatest([
      this.portapi.watchAll<WidgetConfig>(this.widgetPrefix),
      this.watchOrder(),
    ])
      .pipe(
        map(([widgets, order]) => {
          enforceWidget(widgets, {
            config: null,
            key: 'pilot-widget',
            type: 'pilot-widget',
          })

          enforceWidget(widgets, {
            config: null,
            key: 'prompt-widget',
            type: 'prompt-widget',
          })

          enforceWidget(widgets, {
            config: {
              markdown: true,
            },
            key: 'notification-widget',
            type: 'notification-widget',
          })

          enforceWidget(widgets, {
            config: null,
            key: 'network-scout',
            type: 'network-scout'
          })

          let byKey = new Map<string, WidgetConfig>();
          widgets.forEach(widget => byKey.set(widget.key!, widget));

          if (!order) {
            order = [
              'pilot-widget',
              'prompt-widget',
              'notification-widget',
              'network-scout'
            ];
          } else {
            // get a list of all widgets that are not part of the order array.
            // This may happen if we force a widget to exist after an update and
            // the user has changed the order of his widgets.
            const mergeToBottom = widgets
              .filter(widget => !order.includes(widget.key!))
              .map(widget => widget.key!)

            order = [
              ...order,
              ...mergeToBottom,
            ]
          }

          return order.map(key => byKey.get(key))
            .filter(value => !!value)
        }),
      ) as Observable<WidgetConfig[]>;
  }

  loadWidget(id: string): Observable<WidgetConfig> {
    const key = `${this.widgetPrefix}/${id}`;
    return this.portapi.get(key);
  }
}

function enforceWidget(list: WidgetConfig[], widget: WidgetConfig) {
  let existingIndex = list.findIndex(w => w.type === widget.type);

  const newWidget: WidgetConfig<null> = {
    ...widget,
  }

  if (existingIndex >= 0) {
    list[existingIndex] = newWidget;
  } else {
    list.splice(0, 0, newWidget);
  }
}
