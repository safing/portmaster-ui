import { Injectable, TrackByFunction } from '@angular/core';
import { PortapiService } from '../services/portapi.service';
import { Observable, throwError } from 'rxjs';
import { WidgetConfig } from './widget.types';
import { map, tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class WidgetService {
  /** The widget database key prefix */
  readonly widgetPrefix = 'core:ui/widgets';

  /** A {@link TrackByFunction} for widgets. */
  readonly trackBy: TrackByFunction<WidgetConfig> = (_: number, widget: WidgetConfig) => {
    return widget.key;
  };

  constructor(private portapi: PortapiService) { }

  /**
   * Creates a new widget.
   *
   * @param widget The widget to create
   */
  createWidget(widget: WidgetConfig): Observable<void> {
    if (!widget.key) {
      widget.key = `${new Date().getTime()}`;
      const key = `${this.widgetPrefix}/${widget.key}`;
      return this.portapi.create(key, widget);
    }

    const key = `${this.widgetPrefix}/${widget.key}`;
    return this.portapi.update(key, widget);
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
    return this.portapi.watchAll<WidgetConfig>(this.widgetPrefix)
      .pipe(
        map(widgets => {
          enforceWidget(widgets, {
            config: null,
            key: 'pilot-widget',
            type: 'pilot-widget',
          })

          enforceWidget(widgets, {
            config: {
              markdown: true,
            },
            key: 'notification-widget',
            type: 'notification-widget',
          })

          return widgets
        })
      );
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
    order: existingIndex >= 0 ? list[existingIndex].order : -1,
  }

  if (existingIndex >= 0) {
    list[existingIndex] = newWidget;
  } else {
    list.splice(0, 0, newWidget);
  }
}